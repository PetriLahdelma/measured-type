// Compare layout with the fallback only vs with Source Serif 4 loaded, and
// measure layout shift when the web font arrives late.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const srv = http.createServer((q, s) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : f.endsWith('.html') ? 'text/html' : 'font/ttf' }); s.end(d); });
}).listen(0);
const url = `http://localhost:${srv.address().port}/article.html`;
const snap = () => {
  const out = [];
  for (const el of document.querySelectorAll('#body > *')) {
    const r = el.getBoundingClientRect();
    // word positions -> line breaks and baselines
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const words = []; let n;
    while ((n = walker.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) {
      const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
      const b = rg.getClientRects()[0]; words.push({ w: m[0], top: Math.round(b.top * 10) / 10, left: b.left, right: b.right }); } }
    // baseline of first line: zero-size inline-block sits on the baseline
    const mk = document.createElement('span'); mk.style.cssText = 'display:inline-block;width:0;height:0';
    el.insertBefore(mk, el.firstChild); const base = mk.getBoundingClientRect().bottom; mk.remove();
    out.push({ tag: el.tagName, top: r.top, height: r.height, base, words });
  }
  return { out, fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style + ' ' + f.weight) };
};
(async () => {
  const b = await chromium.launch();
  for (const width of [320, 360, 375, 390, 414, 430, 768, 1024]) {
    const res = {};
    for (const mode of ['fallback', 'webfont']) {
      const p = await b.newPage({ viewport: { width, height: 900 } });
      if (mode === 'fallback') await p.route('**/*.ttf', r => r.abort());
      await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
      res[mode] = await p.evaluate(snap); await p.close();
    }
    console.log(`\n== viewport ${width} ==`); console.log('loaded faces (webfont run):', res.webfont.fonts.join(', '));
    res.fallback.out.forEach((f, i) => {
      const w = res.webfont.out[i];
      const lines = a => new Set(a.words.map(x => x.top)).size;
      const breaksSame = f.words.every((x, j) => (x.top - f.words[0].top) === (w.words[j].top - w.words[0].top));
      const maxRightDiff = Math.max(...f.words.map((x, j) => Math.abs(x.right - w.words[j].right)));
      console.log(`${f.tag}: height ${f.height.toFixed(2)} -> ${w.height.toFixed(2)}, top ${f.top.toFixed(2)} -> ${w.top.toFixed(2)}, lines ${lines(f)} -> ${lines(w)}, same breaks ${breaksSame}, baseline ${f.base.toFixed(2)} -> ${w.base.toFixed(2)}, max word x drift ${maxRightDiff.toFixed(1)}px`);
    });
  }
  // Late font: delay the font responses and record layout-shift entries.
  for (const width of [320, 360, 375, 390, 414, 430, 768, 1024]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.addInitScript(() => { window.__cls = 0; window.__shifts = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__cls += e.value; window.__shifts.push(e.value); } }).observe({ type: 'layout-shift', buffered: true }); });
    await p.route('**/*.ttf', async r => { await new Promise(s => setTimeout(s, 1500)); await r.continue(); });
    await p.goto(url); await p.waitForTimeout(400);
    const early = await p.evaluate(() => getComputedStyle(document.querySelector('p')).fontFamily + ' | text visible: ' + (document.querySelector('p').getBoundingClientRect().height > 0));
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts, loaded: [...document.fonts].filter(f => f.status === 'loaded').length }));
    await p.screenshot({ path: path.join(__dirname, `late-${width}.png`), fullPage: true });
    console.log(`\nlate font @${width}: before swap: ${early}; after: faces loaded ${r.loaded}, CLS ${r.cls.toFixed(5)}, shifts ${JSON.stringify(r.shifts)}`);
    await p.close();
  }
  // Same check without the fallback face (plain Georgia) for comparison.
  for (const width of [320, 360, 375, 390, 414, 430, 768, 1024]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '.prose{font-family:"Source Serif 4",Georgia,serif}'; document.head.appendChild(s); }); });
    await p.route('**/*.ttf', async r => { await new Promise(s => setTimeout(s, 1500)); await r.continue(); });
    await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    console.log(`baseline (plain Georgia fallback) @${width}: CLS ${(await p.evaluate(() => window.__cls)).toFixed(5)}`);
    await p.close();
  }
  await b.close(); srv.close();
})();
