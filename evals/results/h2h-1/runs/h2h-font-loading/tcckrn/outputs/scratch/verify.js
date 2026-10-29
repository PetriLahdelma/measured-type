// Serves the page, delays the font files, and compares fallback vs loaded layout.
// Mode "plain" swaps in a variant of fonts.css whose fallback is unadjusted Georgia, as a baseline.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'fonts.css'), 'utf8');
const plainCss = css.replace(/"Source Serif 4 Fallback", /, '');
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/plain/fonts.css') { res.setHeader('content-type','text/css'); return res.end(plainCss); }
  let f = path.join(root, u.replace(/^\/plain/, ''));
  if (u.endsWith('/')) f = path.join(f, 'article.html');
  fs.readFile(f, (e, d) => {
    if (e) { res.statusCode = 404; return res.end(); }
    const type = f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : 'font/ttf';
    const send = () => { res.setHeader('content-type', type); res.end(d); };
    if (f.endsWith('.ttf')) setTimeout(send, 1500); else send();
  });
}).listen(0);
const port = srv.address().port;
const snap = () => {
  const lines = [];
  for (const el of document.querySelectorAll('article > *')) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, rows = [], cur = null, lastTop = null;
    while ((n = w.nextNode())) {
      const re = /\S+/g; let m;
      while ((m = re.exec(n.data))) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const top = Math.round(r.getClientRects()[0].top);
        if (lastTop === null || Math.abs(top - lastTop) > 4) { cur = []; rows.push(cur); lastTop = top; }
        cur.push(m[0]);
      }
    }
    lines.push({ tag: el.tagName, h: el.getBoundingClientRect().height, firstWords: rows.map(r => r[0]) });
  }
  return { lines, articleH: document.querySelector('article').getBoundingClientRect().height };
};
(async () => {
  const b = await chromium.launch();
  for (const mode of ['adjusted', 'plain']) {
    for (const width of [320, 375, 414, 600, 768, 1280]) {
      const ctx = await b.newContext({ viewport: { width, height: 900 } });
      const p = await ctx.newPage();
      await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await p.goto(`http://localhost:${port}/${mode === 'plain' ? 'plain/' : ''}article.html`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(300);
      const before = await p.evaluate(snap);
      const usedBefore = await p.evaluate(() => document.fonts.check('18px "Source Serif 4"'));
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(300);
      const after = await p.evaluate(snap);
      const status = await p.evaluate(() => [...document.fonts].filter(f => f.family.includes('Source')).map(f => `${f.family}/${f.style}/${f.weight}:${f.status}`));
      const cls = await p.evaluate(() => window.__cls);
      const diffs = before.lines.map((l, i) => {
        const a = after.lines[i];
        const same = JSON.stringify(l.firstWords) === JSON.stringify(a.firstWords);
        return `${l.tag}:${l.firstWords.length}->${a.firstWords.length}${same ? '' : ' BREAKS DIFFER'} h ${l.h.toFixed(1)}->${a.h.toFixed(1)}`;
      });
      console.log(`[${mode} ${width}px] CLS=${cls.toFixed(4)} articleH ${before.articleH.toFixed(1)}->${after.articleH.toFixed(1)} webfontReadyBefore=${usedBefore}`);
      console.log('   ' + diffs.join(' | '));
      if (mode === 'adjusted' && width === 375) console.log('   faces:', status.join(', '));
      await ctx.close();
    }
  }
  await b.close(); srv.close();
})();
