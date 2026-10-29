// Measures the advance width of the article copy in Source Serif 4 and in
// plain Georgia (each style, at the size the page uses it) to derive size-adjust.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const dir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(dir, 'article.html'), 'utf8');
const text = [...html.matchAll(/<(?:p|h1)>([\s\S]*?)<\/(?:p|h1)>/g)].map((m) => m[1].replace(/<[^>]+>/g, '')).join(' ');
const cases = [
  { name: 'regular', weight: 400, style: 'normal', size: 18, local: 'Georgia' },
  { name: 'italic', weight: 400, style: 'italic', size: 18, local: 'Georgia Italic' },
  { name: 'bold', weight: 700, style: 'normal', size: 36, local: 'Georgia Bold' },
  { name: 'bolditalic', weight: 700, style: 'italic', size: 36, local: 'Georgia Bold Italic' },
  { name: 'regular36', weight: 400, style: 'normal', size: 36, local: 'Georgia' },
  { name: 'italic36', weight: 400, style: 'italic', size: 36, local: 'Georgia Italic' },
  { name: 'bold18', weight: 700, style: 'normal', size: 18, local: 'Georgia Bold' },
  { name: 'bolditalic18', weight: 700, style: 'italic', size: 18, local: 'Georgia Bold Italic' },
];
(async () => {
  const page = await (await chromium.launch()).newPage();
  const faces = cases.map((c) => `@font-face{font-family:"G-${c.name}";src:local("${c.local}");}`).join('\n');
  const spans = cases.map((c) => `<span id="w-${c.name}" style="font:${c.style} ${c.weight} ${c.size}px 'SS4'">${text}</span><br><span id="g-${c.name}" style="font:${c.size}px 'G-${c.name}'">${text}</span><br>`).join('');
  fs.writeFileSync(path.join(__dirname, 'calibrate.html'), `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:SS4;src:url("../fonts/SourceSerif4%5Bopsz,wght%5D.ttf");font-weight:200 900;font-style:normal}
@font-face{font-family:SS4;src:url("../fonts/SourceSerif4-Italic%5Bopsz,wght%5D.ttf");font-weight:200 900;font-style:italic}
${faces} body{white-space:nowrap}</style>${spans}`);
  await page.goto('file://' + path.join(__dirname, 'calibrate.html'));
  await page.evaluate(() => document.fonts.ready);
  const out = await page.evaluate((names) => names.map((n) => {
    const w = document.getElementById('w-' + n).getBoundingClientRect().width;
    const g = document.getElementById('g-' + n).getBoundingClientRect().width;
    return { n, w, g, sizeAdjust: (w / g * 100).toFixed(2) + '%' };
  }), cases.map((c) => c.name));
  console.table(out);
  process.exit(0);
})();
