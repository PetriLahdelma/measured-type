// Compares the article laid out with the web font against the same page with
// the font files blocked (fallback only), and measures layout shift during a
// delayed swap.
const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const url = 'file://' + root + '/article.html';

const snapshot = () => {
  const out = [];
  for (const el of document.querySelectorAll('.prose > *')) {
    const r = el.getBoundingClientRect();
    const lines = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n, wi = 0, lastTop = null;
    while ((n = walker.nextNode())) {
      const re = /\S+/g; let m;
      while ((m = re.exec(n.data))) {
        const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const rr = rg.getClientRects()[0];
        if (lastTop === null || rr.top - lastTop > 5) { lines.push({ word: wi, text: m[0], top: +rr.top.toFixed(2) }); lastTop = rr.top; }
        wi++;
      }
    }
    out.push({ tag: el.tagName, top: +r.top.toFixed(2), height: +r.height.toFixed(2), lines });
  }
  const fams = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style + ' ' + f.weight);
  return { out, fams };
};

(async () => {
  const b = await chromium.launch();
  let fail = 0;
  for (const width of [320, 375, 414, 600, 768, 1280]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    const p1 = await ctx.newPage();
    await p1.goto(url); await p1.evaluate(() => document.fonts.ready);
    const web = await p1.evaluate(snapshot);
    const p2 = await ctx.newPage();
    await p2.route(/\.ttf$/, r => r.abort());
    await p2.goto(url); await p2.evaluate(() => document.fonts.ready);
    const fb = await p2.evaluate(snapshot);
    const diffs = [];
    web.out.forEach((e, i) => {
      const f = fb.out[i];
      if (Math.abs(e.top - f.top) > 0.5 || Math.abs(e.height - f.height) > 0.5) diffs.push(`${e.tag} box web ${e.top}/${e.height} fb ${f.top}/${f.height}`);
      const wl = e.lines.map(l => l.word).join(','), fl = f.lines.map(l => l.word).join(',');
      if (wl !== fl) diffs.push(`${e.tag} breaks web [${wl}] fb [${fl}]`);
      e.lines.forEach((l, j) => { const d = f.lines[j] ? Math.abs(l.top - f.lines[j].top) : 99; if (d > 1) diffs.push(`${e.tag} line ${j} top differs by ${d.toFixed(2)}px`); });
    });
    if (width === 320) { console.log('web loaded:', web.fams.join('; ')); console.log('fallback loaded:', fb.fams.join('; ')); }
    console.log(`${width}px: lines ${web.out.map(e => e.lines.length).join('/')} | ${diffs.length ? 'DIFF\n  ' + diffs.join('\n  ') : 'identical breaks, boxes and line tops'}`);
    if (diffs.length) fail++;
    // Delayed swap: CLS observed across the font arrival.
    const p3 = await ctx.newPage();
    await p3.route(/\.ttf$/, async r => { await new Promise(s => setTimeout(s, 1500)); await r.continue(); });
    await p3.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await p3.goto(url);
    await p3.waitForFunction(() => [...document.fonts].some(f => f.family.includes('Source Serif 4') && !f.family.includes('Fallback') && f.status === 'loaded'), null, { timeout: 10000 });
    await p3.evaluate(() => document.fonts.ready); await p3.waitForTimeout(300);
    console.log(`  CLS across delayed swap: ${await p3.evaluate(() => window.__cls)}`);
    await ctx.close();
  }
  await b.close();
  process.exit(fail ? 1 : 0);
})();
