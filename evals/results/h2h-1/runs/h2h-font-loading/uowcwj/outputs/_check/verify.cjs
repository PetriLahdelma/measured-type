// Loads article.html over HTTP and compares the layout painted with the
// fallback against the layout after Source Serif 4 arrives.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dir = path.resolve(process.argv[2]);
const cssOverride = process.argv[3]; // optional alternate css file for comparison
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/fonts.css' && cssOverride) u = '/' + cssOverride;
  const f = path.join(dir, u === '/' ? 'article.html' : u);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const type = f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'font/ttf';
  res.writeHead(200, { 'content-type': type }); fs.createReadStream(f).pipe(res);
});
const snap = () => {
  const out = [];
  for (const el of document.querySelectorAll('article, article > *')) {
    const r = el.getBoundingClientRect();
    const lines = [];
    const range = document.createRange(); range.selectNodeContents(el);
    // one entry per line: group text rects by top
    const rects = [...range.getClientRects()].filter(x => x.width > 0);
    for (const x of rects) { const k = Math.round(x.top * 10) / 10; if (!lines.find(l => Math.abs(l.top - k) < 2)) lines.push({ top: k }); }
    // first word of each line, to detect changed line breaks
    const words = []; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n, lastTop = null;
    while ((n = tw.nextNode())) {
      const re = /\S+/g; let m;
      while ((m = re.exec(n.data))) {
        const rr = document.createRange(); rr.setStart(n, m.index); rr.setEnd(n, m.index + m[0].length);
        const t = Math.round(rr.getClientRects()[0].top);
        if (lastTop === null || Math.abs(t - lastTop) > 4) words.push(m[0]);
        lastTop = t;
      }
    }
    out.push({ tag: el.tagName, top: +r.top.toFixed(2), height: +r.height.toFixed(2), lines: lines.length, lineStarts: words.join(' | ') });
  }
  const used = [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family}/${f.style}/${f.weight}`);
  return { out, used };
};
(async () => {
  await new Promise(r => server.listen(0, r)); const port = server.address().port;
  const b = await chromium.launch();
  let worst = 0, breaksDiffer = 0;
  for (const width of [320, 375, 414, 600, 768, 1024, 1440]) {
    const ctxA = await b.newContext({ viewport: { width, height: 900 } });
    const pa = await ctxA.newPage(); await pa.route('**/*.ttf', r => r.abort());
    await pa.goto(`http://localhost:${port}/`); await pa.evaluate(() => document.fonts.ready);
    const A = await pa.evaluate(snap);
    const ctxB = await b.newContext({ viewport: { width, height: 900 } });
    const pb = await ctxB.newPage(); await pb.goto(`http://localhost:${port}/`);
    await pb.evaluate(async () => { await document.fonts.ready; await document.fonts.load('italic 400 18px "Source Serif 4"'); });
    const B = await pb.evaluate(snap);
    // delayed font in one page load: record layout shift
    const ctxC = await b.newContext({ viewport: { width, height: 900 } });
    const pc = await ctxC.newPage();
    await pc.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await pc.route('**/*.ttf', async r => { await new Promise(s => setTimeout(s, 800)); await r.continue(); });
    await pc.goto(`http://localhost:${port}/`); await pc.waitForTimeout(2500);
    const cls = await pc.evaluate(() => window.__cls);
    const rows = A.out.map((a, i) => { const bb = B.out[i]; const d = Math.max(Math.abs(a.top - bb.top), Math.abs(a.height - bb.height)); worst = Math.max(worst, d); if (a.lineStarts !== bb.lineStarts) breaksDiffer++; return `${a.tag.padEnd(7)} lines ${a.lines}->${bb.lines} top ${a.top}->${bb.top} h ${a.height}->${bb.height} breaks ${a.lineStarts === bb.lineStarts ? 'same' : 'DIFFER'}`; });
    console.log(`\n=== ${width}px  CLS(font swap after 800ms) = ${cls.toFixed(5)}`);
    console.log(' fallback faces:', A.used.join(', ')); console.log(' final faces:   ', B.used.join(', '));
    rows.forEach(r => console.log(' ' + r));
    await ctxA.close(); await ctxB.close(); await ctxC.close();
  }
  console.log(`\nworst element shift: ${worst.toFixed(2)}px; elements with changed line breaks: ${breaksDiffer}`);
  await b.close(); server.close();
})();
