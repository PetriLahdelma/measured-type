const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve('article.html');
const snap = () => {
  const out = {};
  const els = [...document.querySelectorAll('h1, p, em')];
  els.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const lines = new Set([...el.getClientRects()].map(x => Math.round(x.top)));
    const range = document.createRange(); range.selectNodeContents(el);
    const lineTops = new Set([...range.getClientRects()].map(x => Math.round(x.top)));
    out[el.tagName + i] = { top: +r.top.toFixed(2), h: +r.height.toFixed(2), w: +r.width.toFixed(2), left: +r.left.toFixed(2), lines: lineTops.size };
  });
  out.docH = document.documentElement.scrollHeight;
  return out;
};
(async () => {
  const browser = await chromium.launch();
  for (const width of [360, 768, 1280]) {
    // Fallback only: block the web font files.
    const a = await browser.newPage({ viewport: { width, height: 900 } });
    await a.route('**/*.ttf', r => r.abort());
    await a.goto(url); await a.evaluate(() => document.fonts.ready);
    const fb = await a.evaluate(snap);
    const fbFaces = await a.evaluate(() => [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.style + ' ' + f.status));
    // Web font loaded.
    const b = await browser.newPage({ viewport: { width, height: 900 } });
    await b.goto(url); await b.evaluate(() => document.fonts.ready);
    const wf = await b.evaluate(snap);
    const loaded = await b.evaluate(() => document.fonts.check('18px "Source Serif 4"') && document.fonts.check('italic 18px "Source Serif 4"'));
    // Delayed font: measure CLS across the swap.
    const c = await browser.newPage({ viewport: { width, height: 900 } });
    await c.route('**/*.ttf', async r => { await new Promise(s => setTimeout(s, 1200)); r.continue(); });
    await c.addInitScript(() => { window.__cls = 0; window.__shifts = []; new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push(e.value); } } }).observe({ type: 'layout-shift', buffered: true }); });
    await c.goto(url); await c.waitForTimeout(2500); await c.evaluate(() => document.fonts.ready);
    const cls = await c.evaluate(() => ({ cls: window.__cls, n: window.__shifts.length, status: [...document.fonts].filter(f=>f.family==='"Source Serif 4"' || f.family==='Source Serif 4').map(f=>f.status) }));
    console.log(`\n=== width ${width}  webfont loaded=${loaded}  CLS=${cls.cls.toFixed(5)} shifts=${cls.n} ${JSON.stringify(cls.status)}`);
    if (width === 360) console.log('fallback faces:', fbFaces.join(' | '));
    for (const k of Object.keys(wf)) {
      if (k === 'docH') { console.log(`docH fallback ${fb.docH} web ${wf.docH}`); continue; }
      const f = fb[k], w = wf[k];
      console.log(`${k.padEnd(4)} lines ${f.lines}/${w.lines}  top ${f.top}/${w.top} (d ${(w.top-f.top).toFixed(2)})  h ${f.h}/${w.h}  w ${f.w}/${w.w}`);
    }
    await a.close(); await b.close(); await c.close();
  }
  await browser.close();
})();
