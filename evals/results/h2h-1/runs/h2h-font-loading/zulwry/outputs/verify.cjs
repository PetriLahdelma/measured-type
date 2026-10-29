// Serves the folder over HTTP, delays the web font, snapshots every word's
// position in the fallback and after the swap, and records CLS, across a
// sweep of viewport widths. "raw" swaps in plain Georgia for comparison.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const raw = process.argv[2] === 'raw'; const DELAY = +(process.env.DELAY ?? 1200);
const types = { '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf' };
const srv = http.createServer((q, s) => {
  const f = path.join(process.cwd(), decodeURIComponent(q.url.split('?')[0]));
  let body = fs.readFileSync(f);
  if (raw && f.endsWith('fonts.css')) body = body.toString().replace('"Source Serif 4 Fallback", ', '');
  const send = () => { s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); s.end(body); };
  f.endsWith('.ttf') ? setTimeout(send, DELAY) : send();
});
(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const b = await chromium.launch();
  let bad = 0, worstCls = 0, n = 0, maxDh = 0;
  for (let width = 300; width <= 1000; width += 10) {
    const ctx = await b.newContext({ viewport: { width, height: 1200 } }); const p = await ctx.newPage();
    await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(`http://localhost:${port}/article.html`);
    const snap = () => p.evaluate(() => {
      const out = []; const w = document.createTreeWalker(document.getElementById('body'), NodeFilter.SHOW_TEXT); let nd;
      while ((nd = w.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(nd.data))) { const r = document.createRange(); r.setStart(nd, m.index); r.setEnd(nd, m.index + m[0].length); out.push(Math.round(r.getClientRects()[0].top)); } }
      return { tops: out, h: document.getElementById('body').getBoundingClientRect().height, ss: [...document.fonts].some(f => f.family === 'Source Serif 4' && f.status === 'loaded') };
    });
    await p.waitForTimeout(200); const before = await snap();
    await p.waitForFunction(() => [...document.fonts].filter(f => f.family === 'Source Serif 4').every(f => f.status === 'loaded'), null, { timeout: 10000 });
    await p.waitForTimeout(300); const after = await snap();
    const cdp = await ctx.newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument'); const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'p' });
    const used = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.map(f => f.familyName).join('+');
    if (width === 300) console.log('  rendered <p> font after load: ' + used);
    if (before.ss && DELAY > 0) throw new Error('web font already loaded in first snapshot');
    const moved = before.tops.filter((t, i) => t !== after.tops[i]).length;
    const cls = await p.evaluate(() => window.__cls);
    if (moved) { bad++; console.log(`  w=${width}: ${moved} words changed line, height ${before.h.toFixed(1)} -> ${after.h.toFixed(1)}`); }
    worstCls = Math.max(worstCls, cls); maxDh = Math.max(maxDh, Math.abs(after.h - before.h)); n++;
    await ctx.close();
  }
  console.log(`${raw ? 'plain Georgia' : 'metric-matched fallback'}: ${bad}/${n} widths reflowed on swap, max height change ${maxDh.toFixed(1)}px, worst CLS ${worstCls.toFixed(4)}`);
  await b.close(); srv.close();
})();
