// Real load: font responses delayed 1.5s, text painted in fallback first, then swap.
// Records layout-shift entries and element geometry before/after the swap.
const { chromium, webkit } = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.resolve(process.argv[2]);
const http = require('http');
const srv = http.createServer((req, res) => {
  const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
  const send = () => { try { const d = fs.readFileSync(f); res.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : f.endsWith('.ttf') ? 'font/ttf' : 'text/html' }); res.end(d); } catch { res.writeHead(404); res.end(); } };
  if (f.endsWith('.ttf')) setTimeout(send, 1500); else send();
}).listen(0);
const port = srv.address().port;
(async () => {
  for (const bt of [chromium, webkit]) {
    const b = await bt.launch();
    for (const w of [320, 375, 390, 414, 430, 768, 1280]) {
      const p = await b.newPage({ viewport: { width: w, height: 900 } });
      await p.addInitScript(() => { window.__ls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {} });
      await p.goto(`http://localhost:${port}/article.html`);
      await p.waitForTimeout(300);
      const geo = () => p.evaluate(() => [...document.querySelectorAll('#body > *')].map(e => { const r = e.getBoundingClientRect(); return `${r.top.toFixed(1)}/${r.height.toFixed(1)}`; }).join(' '));
      const before = await geo(); const ffBefore = await p.evaluate(() => document.fonts.check('18px "Source Serif 4"'));
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
      const after = await geo(); const ffAfter = await p.evaluate(() => document.fonts.check('18px "Source Serif 4"'));
      const ls = await p.evaluate(() => window.__ls);
      console.log(`${bt.name()} w=${w} webfontBefore=${ffBefore} after=${ffAfter} geometry ${before === after ? 'IDENTICAL' : 'CHANGED'} CLS=${typeof ls === 'number' ? ls.toFixed(4) : 'n/a'}${before === after ? '' : `\n   before ${before}\n   after  ${after}`}`);
      await p.close();
    }
    await b.close();
  }
  srv.close();
})();
