import sharp from "sharp";

// Raise Vercel body size limit for proxied images
export const config = {
  api: {
    responseLimit: "20mb",
    bodyParser: false,
  },
};

const MAX_DIMENSION = 5000;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB input limit

function clamp(val, min, max) {
  return Math.min(Math.max(parseInt(val) || 0, min), max);
}

function parseBoolean(val) {
  return val === "1" || val === "true";
}

export default async function handler(req, res) {
  const { url, w, h, width, height, q, quality, fit, output, we, dpr, blur, sharp: sharpParam, cbg, bg, a, t, n, page } = req.query;

  // --- Validate URL ---
  if (!url) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  let imageUrl;
  try {
    imageUrl = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  // Block private/local IPs
  const hostname = imageUrl.hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) {
    return res.status(403).json({ error: "Private URLs not allowed" });
  }

  // --- Fetch source image ---
  let sourceBuffer;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const fetchRes = await fetch(imageUrl.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)" },
    });
    clearTimeout(timeout);

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `Upstream error: ${fetchRes.status}` });
    }

    const contentLength = fetchRes.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE_BYTES) {
      return res.status(413).json({ error: "Source image too large (max 10MB)" });
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    sourceBuffer = Buffer.from(arrayBuffer);

    if (sourceBuffer.byteLength > MAX_SIZE_BYTES) {
      return res.status(413).json({ error: "Source image too large (max 10MB)" });
    }
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }
    return res.status(502).json({ error: "Failed to fetch source image" });
  }

  // --- Parse params (wsrv-compatible) ---
  const targetWidth  = clamp(w || width  || 0, 0, MAX_DIMENSION) || null;
  const targetHeight = clamp(h || height || 0, 0, MAX_DIMENSION) || null;
  const qualityVal   = clamp(q || quality || 85, 1, 100);
  const fitMode      = fit || "inside";          // wsrv default: inside
  const outputFmt    = output || null;
  const withoutEnlarge = !parseBoolean(we);      // wsrv: without-enlargement by default
  const dprVal       = Math.min(parseFloat(dpr) || 1, 8);
  const blurVal      = parseFloat(blur) || 0;
  const sharpenVal   = parseInt(sharpParam) || 0;
  const bgColor      = cbg || bg || null;
  const align        = a || "center";
  const pageNum      = parseInt(page) || 0;
  const numPages     = parseInt(n) || 1;

  // Scale by DPR
  const finalWidth  = targetWidth  ? Math.round(targetWidth  * dprVal) : null;
  const finalHeight = targetHeight ? Math.round(targetHeight * dprVal) : null;

  // Map wsrv fit values to sharp
  const fitMap = {
    cover:    "cover",
    contain:  "contain",
    fill:     "fill",
    inside:   "inside",
    outside:  "outside",
    // wsrv aliases
    crop:     "cover",
    letterbox:"contain",
    fit:      "inside",
  };
  const sharpFit = fitMap[fitMode] || "inside";

  // Map wsrv alignment to sharp position
  const posMap = {
    "top-left":    "left top",
    "top":         "top",
    "top-right":   "right top",
    "left":        "left",
    "center":      "center",
    "right":       "right",
    "bottom-left": "left bottom",
    "bottom":      "bottom",
    "bottom-right":"right bottom",
    "entropy":     "entropy",
    "attention":   "attention",
    "focal":       "attention",
    // Single-letter wsrv aliases
    "tl": "left top", "t": "top", "tr": "right top",
    "l":  "left",     "c": "center", "r": "right",
    "bl": "left bottom", "b": "bottom", "br": "right bottom",
  };
  const position = posMap[align] || "center";

  // --- Process with sharp ---
  try {
    let pipeline = sharp(sourceBuffer, {
      pages: numPages === -1 ? -1 : numPages,
      page: pageNum,
      failOn: "none",
    });

    // Rotate based on EXIF
    pipeline = pipeline.rotate();

    // Resize
    if (finalWidth || finalHeight) {
      const resizeOpts = {
        width:  finalWidth  || undefined,
        height: finalHeight || undefined,
        fit:    sharpFit,
        withoutEnlargement: withoutEnlarge,
        position,
      };

      // Background for contain/letterbox
      if (sharpFit === "contain" && bgColor) {
        resizeOpts.background = bgColor.startsWith("#") ? bgColor : `#${bgColor}`;
      } else if (sharpFit === "contain") {
        resizeOpts.background = { r: 0, g: 0, b: 0, alpha: 0 };
      }

      pipeline = pipeline.resize(resizeOpts);
    }

    // Flatten background (for formats that don't support alpha)
    if (bgColor && (outputFmt === "jpg" || outputFmt === "jpeg")) {
      pipeline = pipeline.flatten({
        background: bgColor.startsWith("#") ? bgColor : `#${bgColor}`,
      });
    }

    // Blur
    if (blurVal > 0) {
      // wsrv blur: 0-100 maps to sigma roughly 0.3–100
      const sigma = Math.max(0.3, Math.min(blurVal, 100));
      pipeline = pipeline.blur(sigma);
    }

    // Sharpen (wsrv uses 0-100)
    if (sharpenVal > 0) {
      const sigma = Math.max(0.5, sharpenVal / 10);
      pipeline = pipeline.sharpen({ sigma });
    }

    // Output format + quality
    const metadata = await sharp(sourceBuffer).metadata();
    const sourceFormat = metadata.format;

    let outputFormat = outputFmt;
    if (!outputFormat) {
      // Keep original format; default to webp for broad support
      outputFormat = sourceFormat === "png" ? "png"
                   : sourceFormat === "gif"  ? "gif"
                   : sourceFormat === "webp" ? "webp"
                   : sourceFormat === "avif" ? "avif"
                   : "jpeg";
    }

    const mimeMap = {
      jpeg: "image/jpeg",
      jpg:  "image/jpeg",
      png:  "image/png",
      webp: "image/webp",
      avif: "image/avif",
      gif:  "image/gif",
      tiff: "image/tiff",
    };

    switch (outputFormat) {
      case "jpg":
      case "jpeg":
        pipeline = pipeline.jpeg({
          quality: qualityVal,
          mozjpeg: true,           // better compression than libjpeg default
          chromaSubsampling: "4:2:0",
        });
        break;
      case "png":
        pipeline = pipeline.png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: false,
        });
        break;
      case "webp":
        pipeline = pipeline.webp({
          quality: qualityVal,
          effort: 4,
          smartSubsample: true,
        });
        break;
      case "avif":
        pipeline = pipeline.avif({
          quality: qualityVal,
          effort: 4,
        });
        break;
      case "gif":
        pipeline = pipeline.gif();
        break;
      default:
        pipeline = pipeline.jpeg({ quality: qualityVal, mozjpeg: true });
        outputFormat = "jpeg";
    }

    const outputBuffer = await pipeline.toBuffer();

    res.setHeader("Content-Type",  mimeMap[outputFormat] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Image-Width",  finalWidth  || "original");
    res.setHeader("X-Image-Height", finalHeight || "original");
    res.status(200).send(outputBuffer);

  } catch (err) {
    console.error("Sharp processing error:", err);
    return res.status(422).json({ error: "Failed to process image", detail: err.message });
  }
}
