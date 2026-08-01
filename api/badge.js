export default function handler(req, res) {
  const { type = 'fb', text = 'Sup Kelelawar', w = '200', h = '44' } = req.query;
  
  const width = parseInt(w);
  const height = parseInt(h);
  const configs = {
    fb: {
      color: '#1877F2',
      icon: `<path d='M${height*0.5} ${height*0.2}h-${height*0.15}c-${height*0.08} 0-${height*0.17} ${height*0.07}-${height*0.17} ${height*0.17}v${height*0.15}h-${height*0.12}v${height*0.17}h${height*0.12}v${height*0.33}h${height*0.17}v-${height*0.33}h${height*0.12}l${height*0.04}-${height*0.17}h-${height*0.17}v-${height*0.12}c0-${height*0.02} ${height*0.02}-${height*0.04} ${height*0.04}-${height*0.04}h${height*0.12}V${height*0.2}z' fill='white'/>`,
    },
    tg: {
      color: '#2CA5E0',
      icon: `<path d='M${height*0.5} ${height*0.15}a${height*0.35} ${height*0.35} 0 1 0 0 ${height*0.7}a${height*0.35} ${height*0.35} 0 0 0 0-${height*0.7}zm${height*0.17} ${height*0.18}l-${height*0.08} ${height*0.39}c-${height*0.01} ${height*0.02}-${height*0.02} ${height*0.03}-${height*0.04} ${height*0.02}l-${height*0.11}-${height*0.08}-${height*0.06} ${height*0.05}c-${height*0.01} ${height*0.01}-${height*0.03} ${height*0.01}-${height*0.03}-${height*0.01}l${height*0.01}-${height*0.12} ${height*0.21}-${height*0.19}c${height*0.01}-${height*0.01} 0-${height*0.02}-${height*0.01}-${height*0.01}l-${height*0.27} ${height*0.17}-${height*0.11}-${height*0.04}c-${height*0.02}-${height*0.01}-${height*0.02}-${height*0.04} ${height*0.01}-${height*0.05}l${height*0.44}-${height*0.17}c${height*0.02}-${height*0.01} ${height*0.05} 0 ${height*0.04} ${height*0.04}z' fill='white'/>`,
    }
  };

  const cfg = configs[type] || configs.fb;
  const iconSize = height * 0.55;
  const iconX = height * 0.22;
  const iconY = (height - iconSize) / 2;
  const fontSize = Math.round(height * 0.36);
  const textX = height * 0.95;
  const textY = height * 0.64;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
  <rect width='${width}' height='${height}' rx='6' fill='${cfg.color}'/>
  <svg x='${iconX}' y='${iconY}' width='${iconSize}' height='${iconSize}' viewBox='0 0 ${height} ${height}'>
    ${cfg.icon}
  </svg>
  <text x='${textX}' y='${textY}' font-family='Arial' font-size='${fontSize}' font-weight='bold' fill='white'>${text}</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
}
