// Font-swap stability harness.
// Renders article.html (1) with font files blocked, so only the fallback shows,
// and (2) with the web font loaded, then compares line breaks and block geometry.
// Also records Chrome's layout-shift entries while the font arrives late.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let state = { css: null, fontMode: 'normal', delay: 0 };
const types = { '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf' };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/fonts.css' && state.css !== null) { res.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'no-store' }); return res.end(state.css); }
  const file = path.join(ROOT, p);
  if (p.endsWith('.ttf')) {
    if (state.fontMode === 'block') { res.writeHead(404); return res.end(); }
    if (state.delay) await new Promise(r => setTimeout(r, state.delay));
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  });
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/article.html`;

const measure = () => {
  const art = document.querySelector('article');
  const words = [];
  const walker = document.createTreeWalker(art, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const re = /\S+/g; let m;
    while ((m = re.exec(n.data))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const b = r.getClientRects()[0];
      const block = n.parentElement.closest('h1,p');
      words.push({ w: m[0], top: Math.round(b.top * 10) / 10, right: b.right, block: [...art.children].indexOf(block) });
    }
  }
  const blocks = [...art.children].map(e => { const b = e.getBoundingClientRect(); return { tag: e.tagName, top: b.top, h: b.height }; });
  const fams = [...art.querySelectorAll('h1,p,em')].map(e => getComputedStyle(e).fontFamily);
  return { words, blocks, artH: art.getBoundingClientRect().height, fams };
};
// group words into lines per block
const lines = m => { const out = []; let key = null; for (const w of m.words) { const k = w.block + ':' + w.top; if (k !== key) { out.push([]); key = k; } out.at(-1).push(w.w); } return out.map(l => l.join(' ')); };

export async function compare(css, widths = [320, 390, 768, 1280], { verbose = false } = {}) {
  state.css = css;
  const browser = await chromium.launch();
  const results = [];
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    state.fontMode = 'block'; state.delay = 0;
    await page.goto(base, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
    const fb = await page.evaluate(measure);
    state.fontMode = 'normal';
    await page.goto(base + '?web', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const loadedFaces = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.style} ${f.weight}`));
    const web = await page.evaluate(measure);
    const lf = lines(fb), lw = lines(web);
    let lineDiffs = 0; for (let i = 0; i < Math.max(lf.length, lw.length); i++) if (lf[i] !== lw[i]) lineDiffs++;
    const blockShift = Math.max(...web.blocks.map((b, i) => Math.max(Math.abs(b.top - fb.blocks[i].top), Math.abs(b.h - fb.blocks[i].h))));
    // horizontal: line-end drift per line (how full the last word reaches), in px
    const ends = m => { const o = {}; for (const w of m.words) o[w.block + ':' + w.top] = w.right; return Object.values(o); };
    const ef = ends(fb), ew = ends(web);
    const drift = ef.length === ew.length ? ef.map((v, i) => ew[i] - v) : null;
    results.push({ width, linesFallback: lf.length, linesWeb: lw.length, lineDiffs, blockShift: +blockShift.toFixed(2), artH: [fb.artH, web.artH], meanEndDrift: drift && +(drift.reduce((a, b) => a + b, 0) / drift.length).toFixed(2), maxEndDrift: drift && +Math.max(...drift.map(Math.abs)).toFixed(2), loadedFaces, fams: web.fams.slice(0, 1) });
    if (verbose && lineDiffs) { console.log('fallback lines', lf); console.log('web lines', lw); }
    await ctx.close();
  }
  await browser.close();
  return results;
}

export async function cls(css, width = 390, delay = 1500) {
  state.css = css; state.fontMode = 'normal'; state.delay = delay;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__shifts = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__shifts.push({ value: e.value, sources: (e.sources || []).map(s => s.node && s.node.nodeName) }); }).observe({ type: 'layout-shift', buffered: true }); });
  const t0 = Date.now();
  await page.goto(base + '?cls', { waitUntil: 'domcontentloaded' });
  const firstPaintFams = await page.evaluate(() => [...document.fonts].map(f => `${f.family}:${f.status}`));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const shifts = await page.evaluate(() => window.__shifts);
  const r = { width, delay, elapsed: Date.now() - t0, firstPaintFams, cls: +shifts.reduce((a, s) => a + s.value, 0).toFixed(5), shifts };
  await browser.close(); state.delay = 0;
  return r;
}
export function close() { server.close(); }
