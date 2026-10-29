// Compares the layout in the fallback (font files blocked) with the layout
// after Source Serif 4 loads, and records layout-shift during a delayed swap.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, '..');
const MODE = process.argv[2] || 'matched'; // 'matched' or 'plain' (plain Georgia baseline)
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(dir, u === '/' ? 'article.html' : u);
  let body;
  try { body = fs.readFileSync(f); } catch { res.writeHead(404); return res.end(); }
  if (u === '/fonts.css' && MODE === 'plain') body = Buffer.from(body.toString().replace('"Source Serif 4 Fallback", ', ''));
  const type = f.endsWith('.css') ? 'text/css' : f.endsWith('.ttf') ? 'font/ttf' : 'text/html';
  const delay = f.endsWith('.ttf') ? (+process.env.DELAY || 0) : 0;
  setTimeout(() => { res.writeHead(200, { 'content-type': type }); res.end(body); }, delay);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/article.html`;

const snap = () => {
  const r = el => { const b = el.getBoundingClientRect(); return [Math.round(b.top*100)/100, Math.round(b.height*100)/100]; };
  const lines = el => { const rg = document.createRange(); rg.selectNodeContents(el); const tops = new Set([...rg.getClientRects()].map(x => Math.round(x.bottom))); return tops.size; };
  const els = [...document.querySelectorAll('article > *')];
  return { article: r(document.querySelector('article')), blocks: els.map(e => ({ tag: e.tagName, box: r(e), lines: lines(e) })),
           fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style + ' ' + f.weight) };
};

(async () => {
  const b = await chromium.launch();
  for (const width of [320, 360, 375, 390, 393, 402, 412, 414, 428, 430, 768, 1280]) {
    // fallback-only
    const c1 = await b.newContext({ viewport: { width, height: 900 } });
    const p1 = await c1.newPage();
    await p1.route('**/*.ttf', r => r.abort());
    await p1.goto(url); await p1.evaluate(() => document.fonts.ready);
    const fb = await p1.evaluate(snap);
    const fbFace = await p1.evaluate(() => getComputedStyle(document.querySelector('p')).fontFamily);
    await c1.close();
    // web font
    const c2 = await b.newContext({ viewport: { width, height: 900 } });
    const p2 = await c2.newPage();
    await p2.goto(url); await p2.evaluate(() => document.fonts.ready);
    const wf = await p2.evaluate(snap);
    await c2.close();
    const diffs = fb.blocks.map((x, i) => `${x.tag} lines ${x.lines}->${wf.blocks[i].lines} top ${x.box[0]}->${wf.blocks[i].box[0]} h ${x.box[1]}->${wf.blocks[i].box[1]}`);
    const same = JSON.stringify(fb.blocks) === JSON.stringify(wf.blocks) && JSON.stringify(fb.article) === JSON.stringify(wf.article);
    console.log(`\n[${MODE}] width ${width}: ${same ? 'IDENTICAL' : 'DIFFERS'}  article h ${fb.article[1]} -> ${wf.article[1]}`);
    if (!same) diffs.forEach(d => console.log('  ' + d));
    if (width === 375) console.log('  loaded web fonts:', wf.fonts.join(', '));
  }
  // Real swap with delayed fonts: count layout-shift entries
  for (const width of [320, 375, 390, 1280]) {
    const c = await b.newContext({ viewport: { width, height: 900 } });
    const p = await c.newPage();
    await p.addInitScript(() => { window.__cls = 0; window.__n = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__cls += e.value; window.__n++; } }).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(url + '?d=1');
    await p.waitForTimeout(300);
    const before = await p.evaluate(() => [...document.fonts].map(f => f.family + ':' + f.status).join(','));
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const cls = await p.evaluate(() => [window.__cls, window.__n]);
    console.log(`\n[${MODE}] delayed swap width ${width}: CLS ${cls[0].toFixed(4)} over ${cls[1]} shift entries (fonts at 300ms: ${before})`);
    await c.close();
  }
  await b.close(); server.close();
})();
