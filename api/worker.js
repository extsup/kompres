import sharp from "sharp";
import { IncomingForm } from "formidable";
import fs from "fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_DIMENSION = 5000;

function clamp(val, min, max) {
  return Math.min(Math.max(parseInt(val) || 0, min), max);
}

function parseBoolean(val) {
  return val === "1" || val === "true";
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Parse form data
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // 2. Ambil file gambar
    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const sourceBuffer = await fs.readFile(imageFile.filepath);

    // 3. Ambil parameter dari form (LENGKAP)
    const getField = (name) => fields[name]?.[0];

    const w = getField('w');
    const h = getField('h');
    const width = getField('width');
    const height = getField('height');
    const q = getField('q');
    const quality = getField('quality');
    const fit = getField('fit') || "inside";
    const output = getField('output') || getField('f');
    const we = getField('we');
    const dpr = getField('dpr');
    const blur = getField('blur');
    const sharpParam = getField('sharp');
    const cbg = getField('cbg');
    const bg = getField('bg');
    const a = getField('a');
    const page = getField('page');
    const n = getField('n');

    // Parse parameter (sama persis dengan GET)
    const targetWidth  = clamp(w || width  || 0, 0, MAX_DIMENSION) || null;
    const targetHeight = clamp(h || height || 0, 0, MAX_DIMENSION) || null;
    const qualityVal   = clamp(q || quality || 85, 1, 100);
    const outputFmt    = output || null;
    const withoutEnlarge = !parseBoolean(we);
    const dprVal       = Math.min(parseFloat(dpr) || 1, 8);
    const blurVal      = parseFloat(blur) || 0;
    const sharpenVal   = parseInt(sharpParam) || 0;
    const bgColor      = cbg || bg || null;
    const align        = a || "center";
    const pageNum      = parseInt(page) || 0;
    const numPages     = parseInt(n) || 1;

    const finalWidth  = targetWidth  ? Math.round(targetWidth  * dprVal) : null;
    const finalHeight = targetHeight ? Math.round(targetHeight * dprVal) : null;

    const fitMap = {
      cover: "cover", contain: "contain", fill: "fill",
      inside: "inside", outside: "outside",
      crop: "cover", letterbox: "contain", fit: "inside",
    };
    const sharpFit = fitMap[fit] || "inside";

    const posMap = {
      "top-left": "left top", "top": "top", "top-right": "right top",
      "left": "left", "center": "center", "right": "right",
      "bottom-left": "left bottom", "bottom": "bottom", "bottom-right": "right bottom",
      "entropy": "entropy", "attention": "attention", "focal": "attention",
      "tl": "left top", "t": "top", "tr": "right top",
      "l": "left", "c": "center", "r": "right",
      "bl": "left bottom", "b": "bottom", "br": "right bottom",
    };
    const position = posMap[align] || "center";

    // 4. Proses dengan sharp (LOGIKA SAMA PERSIS)
    let pipeline = sharp(sourceBuffer, {
      pages: numPages === -1 ? -1 : numPages,
      page: pageNum,
      failOn: "none",
    });

    pipeline = pipeline.rotate();

    if (finalWidth || finalHeight) {
      const resizeOpts = {
        width: finalWidth || undefined,
        height: finalHeight || undefined,
        fit: sharpFit,
        withoutEnlargement: withoutEnlarge,
        position,
      };

      if (sharpFit === "contain" && bgColor) {
        resizeOpts.background = bgColor.startsWith("#") ? bgColor : `#${bgColor}`;
      } else if (sharpFit === "contain") {
        resizeOpts.background = { r: 0, g: 0, b: 0, alpha: 0 };
      }

      pipeline = pipeline.resize(resizeOpts);
    }

    if (bgColor && (outputFmt === "jpg" || outputFmt === "jpeg")) {
      pipeline = pipeline.flatten({
        background: bgColor.startsWith("#") ? bgColor : `#${bgColor}`,
      });
    }

    if (blurVal > 0) {
      const sigma = Math.max(0.3, Math.min(blurVal, 100));
      pipeline = pipeline.blur(sigma);
    }

    if (sharpenVal > 0) {
      const sigma = Math.max(0.5, sharpenVal / 10);
      pipeline = pipeline.sharpen({ sigma });
    }

    const metadata = await sharp(sourceBuffer).metadata();
    const sourceFormat = metadata.format;

    let outputFormat = outputFmt;
    if (!outputFormat) {
      outputFormat = sourceFormat === "png" ? "png"
                   : sourceFormat === "gif"  ? "gif"
                   : sourceFormat === "webp" ? "webp"
                   : sourceFormat === "avif" ? "avif"
                   : "jpeg";
    }

    const mimeMap = {
      jpeg: "image/jpeg", jpg: "image/jpeg",
      png: "image/png", webp: "image/webp",
      avif: "image/avif", gif: "image/gif",
    };

    switch (outputFormat) {
      case "jpg": case "jpeg":
        pipeline = pipeline.jpeg({ quality: qualityVal, mozjpeg: true, chromaSubsampling: "4:2:0" });
        break;
      case "png":
        pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false });
        break;
      case "webp":
        pipeline = pipeline.webp({ quality: qualityVal, effort: 4, smartSubsample: true });
        break;
      case "avif":
        pipeline = pipeline.avif({ quality: qualityVal, effort: 4 });
        break;
      case "gif":
        pipeline = pipeline.gif();
        break;
      default:
        pipeline = pipeline.jpeg({ quality: qualityVal, mozjpeg: true });
        outputFormat = "jpeg";
    }

    const outputBuffer = await pipeline.toBuffer();

    // 5. Bersihkan file temporary
    await fs.unlink(imageFile.filepath).catch(() => {});

    // 6. Kirim response
    res.setHeader("Content-Type", mimeMap[outputFormat] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Image-Width", finalWidth || "original");
    res.setHeader("X-Image-Height", finalHeight || "original");
    res.status(200).send(outputBuffer);

  } catch (err) {
    console.error("Error:", err);
    res.status(422).json({ error: err.message });
  }
}