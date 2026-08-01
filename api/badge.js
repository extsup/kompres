export default function handler(req, res) {
  const { type = 'fb', text = 'Sup Kelelawar' } = req.query;

  const configs = {
    fb: {
      color: '#1877F2',
      icon: `
        <circle cx='12' cy='12' r='10' fill='white'/>
        <path d='M14 7h-1.5C11.1 7 10 8.1 10 9.5V11H8.5v2.5H10V19h3v-5.5h2l.5-2.5H13V9.5c0-.3.2-.5.5-.5H15V7z' fill='#1877F2'/>`
    },
    tg: {
      color: '#2CA5E0',
      icon: `<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.94c-.12.54-.46.67-.93.42l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.53.26l.19-2.72 4.96-4.48c.22-.19-.05-.3-.33-.11L7.9 13.7l-2.54-.8c-.55-.17-.56-.55.12-.82l9.91-3.82c.46-.17.86.11.71.82z' fill='white'/>`
    }
  };

  const cfg = configs[type] || configs.fb;
  const h = 36;
  const fontSize = 14;
  const iconSize = 24;
  const padding = 8;
  const gap = 8;
  const textLen = text.length * 8;
  const width = padding + iconSize + gap + textLen + padding;
  const iconY = Math.round((h - iconSize) / 2);
  const textY = Math.round(h / 2 + fontSize * 0.35);

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${h}'>
  <rect width='${width}' height='${h}' rx='6' fill='${cfg.color}'/>
  <svg x='${padding}' y='${iconY}' width='${iconSize}' height='${iconSize}' viewBox='0 0 24 24'>
    ${cfg.icon}
  </svg>
  <text x='${padding+iconSize+gap}' y='${textY}' font-family='Arial' font-size='${fontSize}' font-weight='bold' fill='white'>${text}</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
}
