export default function handler(req, res) {
  const { type = 'fb', text = 'Sup Kelelawar' } = req.query;

  const configs = {
    fb: {
      color: '#1877F2',
      icon: `
        <circle cx='12' cy='12' r='10' fill='white'/>
        <path d='M13.5 7H12C10.3 7 9 8.3 9 10v2H7v2.5h2V21h3v-6.5h2l.5-2.5H12V10c0-.3.2-.5.5-.5H14V7z' fill='#1877F2'/>`
    },
    tg: {
      color: '#2CA5E0',
      icon: `<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.94c-.12.54-.46.67-.93.42l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.53.26l.19-2.72 4.96-4.48c.22-.19-.05-.3-.33-.11L7.9 13.7l-2.54-.8c-.55-.17-.56-.55.12-.82l9.91-3.82c.46-.17.86.11.71.82-.01-.01-.01-.01.54-.28z' fill='white'/>`
    }
  };

  const cfg = configs[type] || configs.fb;
  const h = 32;
  const fontSize = 13;
  const iconSize = 20;
  const padding = 8;
  const gap = 6;
  const textLen = text.length * 7.5;
  const width = padding + iconSize + gap + textLen + padding;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${h}'>
  <rect width='${width}' height='${h}' rx='5' fill='${cfg.color}'/>
  <svg x='${padding}' y='${(h-iconSize)/2}' width='${iconSize}' height='${iconSize}' viewBox='0 0 24 24'>
    ${cfg.icon}
  </svg>
  <text x='${padding+iconSize+gap}' y='${h*0.65}' font-family='Arial' font-size='${fontSize}' font-weight='bold' fill='white'>${text}</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
}
