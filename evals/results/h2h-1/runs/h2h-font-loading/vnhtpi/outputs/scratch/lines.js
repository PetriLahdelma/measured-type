// Print line contents and line widths for each paragraph, fallback vs web font, at given widths.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const srv = http.createServer((q, s) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : f.endsWith('.html') ? 'text/html' : 'font/ttf' }); s.end(d); }); }).listen(0);
const url = `http://localhost:${srv.address().port}/article.html`;
const widths = process.argv.slice(2).map(Number);
(async () => {
  const b = await chromium.launch();
  for (const width of widths) for (const mode of ['fallback', 'webfont']) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    if (mode === 'fallback') await p.route('**/*.ttf', r => r.abort());
    await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    const r = await p.evaluate(() => [...document.querySelectorAll('#body > *')].map(el => {
      const lines = {}; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const bb = rg.getClientRects()[0]; const k = Math.round(bb.top); (lines[k] ||= { t: [], r: 0 }).t.push(m[0]); lines[k].r = Math.max(lines[k].r, bb.right - el.getBoundingClientRect().left); } }
      return Object.values(lines).map(l => l.r.toFixed(1) + '  ' + l.t.join(' ')); }));
    console.log(`\n--- ${width} ${mode}`); r.forEach(x => console.log(x.join('\n'), '\n'));
    await p.close();
  }
  await b.close(); srv.close();
})();
