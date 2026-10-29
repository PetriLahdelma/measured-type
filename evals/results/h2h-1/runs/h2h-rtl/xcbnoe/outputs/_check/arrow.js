const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 3 });
for (const f of ['ar', 'en-new']) { await p.goto('file://' + path.resolve(__dirname, f + '.html'));
const bx = await p.evaluate(() => { const r = document.querySelector('.next').getBoundingClientRect(); return { x: r.left - 4, y: r.top - 2, width: r.width + 8, height: r.height + 4 }; });
await p.screenshot({ path: path.resolve(__dirname, 'next-' + f + '-v3.png'), clip: bx }); }
await b.close(); })();
