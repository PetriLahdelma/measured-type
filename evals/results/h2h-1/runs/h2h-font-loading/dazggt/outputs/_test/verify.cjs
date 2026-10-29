const { chromium, webkit } = require('playwright'); const path = require('path');
const page_url = 'file://' + path.resolve(process.argv[2], 'article.html');
const widths = [320, 360, 375, 390, 393, 412, 414, 430, 768, 1024, 1280, 1440];
const snap = () => {
  const out = {};
  for (const el of document.querySelectorAll('#body > *')) {
    const r = el.getBoundingClientRect();
    // line starts: word index where top changes
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const words = []; let n;
    while ((n = walker.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + 1); words.push([m[0], Math.round(rg.getBoundingClientRect().top)]); } }
    const breaks = []; let last = null; words.forEach(([w, t], i) => { if (t !== last) { breaks.push(i); last = t; } });
    out[el.tagName + ':' + el.textContent.slice(0, 12)] = { top: +r.top.toFixed(2), h: +r.height.toFixed(2), lines: breaks.length, breaks: breaks.join(','), baseline1: words.length ? words[0][1] : null };
  }
  out.docH = document.documentElement.scrollHeight;
  return out;
};
async function state(b, w, mode) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
  if (mode !== 'loaded') await p.route(/\.ttf$/, r => r.abort());
  if (mode === 'plain') await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '.prose{font-family:"Source Serif 4",Georgia,serif !important}'; document.head.append(s); }));
  await p.goto(page_url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  const fonts = await p.evaluate(() => [...document.fonts].map(f => `${f.family}/${f.style}/${f.weight}:${f.status}`));
  const s = await p.evaluate(snap); await ctx.close(); return { s, fonts };
}
(async () => {
  for (const bt of [chromium, webkit]) {
    const b = await bt.launch(); let mismatches = 0, plainMis = 0, maxDy = 0;
    for (const w of widths) {
      const L = await state(b, w, 'loaded'), F = await state(b, w, 'fallback'), P = await state(b, w, 'plain');
      if (w === widths[0]) { console.log(bt.name(), 'loaded fonts:', L.fonts.join(' | ')); console.log(bt.name(), 'fallback fonts:', F.fonts.join(' | ')); }
      for (const k of Object.keys(L.s)) {
        if (k === 'docH') { const d = Math.abs(L.s.docH - F.s.docH); if (d) { mismatches++; console.log(`  w=${w} docH loaded=${L.s.docH} fallback=${F.s.docH}`); } if (L.s.docH !== P.s.docH) plainMis++; continue; }
        const a = L.s[k], f = F.s[k], pl = P.s[k];
        maxDy = Math.max(maxDy, Math.abs(a.top - f.top), Math.abs(a.h - f.h), Math.abs(a.baseline1 - f.baseline1));
        if (a.breaks !== f.breaks || Math.abs(a.h - f.h) > 0.5 || Math.abs(a.top - f.top) > 0.5) { mismatches++; console.log(`  w=${w} ${k} loaded lines=${a.lines} [${a.breaks}] h=${a.h} | fallback lines=${f.lines} [${f.breaks}] h=${f.h}`); }
        if (a.breaks !== pl.breaks || Math.abs(a.h - pl.h) > 0.5) plainMis++;
      }
    }
    console.log(`${bt.name()}: matched-fallback mismatches=${mismatches}, max dy=${maxDy.toFixed(2)}px; unadjusted-Georgia mismatches=${plainMis}`);
    await b.close();
  }
})();
