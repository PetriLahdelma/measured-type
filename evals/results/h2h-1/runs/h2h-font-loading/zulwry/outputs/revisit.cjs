// First visit vs. repeat visit over HTTP with caching: which font renders, and does anything move.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const types = { '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf' };
const srv = http.createServer((q, s) => { const f = path.join(process.cwd(), decodeURIComponent(q.url)); s.writeHead(200, { 'content-type': types[path.extname(f)], 'cache-control': 'max-age=3600' }); s.end(fs.readFileSync(f)); });
(async () => {
  await new Promise(r => srv.listen(0, r));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 900 } }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const fontsFor = async sel => { await cdp.send('DOM.enable'); await cdp.send('CSS.enable'); const { root } = await cdp.send('DOM.getDocument'); const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel }); return (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.map(f => f.familyName).join('+'); };
  for (const visit of ['first', 'repeat']) {
    await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(`http://localhost:${srv.address().port}/article.html`); await p.waitForTimeout(1500);
    console.log(visit, 'visit: p =', await fontsFor('p'), '| em =', await fontsFor('em'), '| h1 =', await fontsFor('h1'), '| CLS', (await p.evaluate(() => window.__cls)).toFixed(4));
  }
  await b.close(); srv.close();
})();
