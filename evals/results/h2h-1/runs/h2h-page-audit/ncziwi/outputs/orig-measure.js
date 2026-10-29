const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
for (const w of [320, 375, 1280]) { const p = await b.newPage({ viewport: { width: w, height: 900 } });
await p.goto('file://' + __dirname + '/page.html');
const r = await p.evaluate(() => { const g = s => { const e = document.querySelector(s); const cs = getComputedStyle(e); return { fs: cs.fontSize, lh: cs.lineHeight, h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }; };
 const c = document.querySelector('.callout'); return { docW: document.documentElement.scrollWidth, h1: g('h1'), h2: g('h2'), lead: g('.lead'), callout: { client: c.clientHeight, scroll: c.scrollHeight }, table: Math.round(document.querySelector('table').getBoundingClientRect().width) }; });
console.log(w, JSON.stringify(r)); if (w === 1280) await p.screenshot({ path: __dirname + '/shot-orig.png', clip: { x: 0, y: 0, width: 1280, height: 300 } }); }
await b.close(); })();
