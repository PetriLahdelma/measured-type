// Sweeps body size-adjust; counts container widths (280-800px, step 2) where line counts or breaks differ
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '..') + '/article.html');
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(async () => {
    const art = document.querySelector('article');
    const sig = () => [...art.querySelectorAll("p")].map(el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, s = [], last = null, i = 0;
      while ((n = w.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const t = Math.round(rg.getClientRects()[0].top); if (last === null || Math.abs(t - last) > 4) { s.push(i); last = t; } i++; } } return s.join(','); }).join('|');
    const widths = []; for (let w = 280; w <= 800; w += 2) widths.push(w);
    art.style.fontFamily = '"Source Serif 4"';
    const ref = widths.map(w => { art.style.maxInlineSize = w + 'px'; return sig(); });
    const out = [];
    for (let sa = 102.5; sa <= 103.31; sa += 0.1) {
      const fam = 'T' + Math.round(sa * 100);
      const f = new FontFace(fam, 'local("Georgia")', { weight: '400', sizeAdjust: sa + '%', ascentOverride: (103.6 / sa * 100).toFixed(2) + '%', descentOverride: (33.5 / sa * 100).toFixed(2) + '%', lineGapOverride: '0%' });
      document.fonts.add(await f.load());
      // keep italic/bold fallbacks from the stylesheet
      art.style.fontFamily = `${fam}, "Source Serif 4 Fallback"`;
      let breakDiff = 0, countDiff = 0, bad = [];
      widths.forEach((w, i) => { art.style.maxInlineSize = w + 'px'; const s = sig(); if (s !== ref[i]) { breakDiff++; const a = s.split('|').map(x => x.split(',').length), c = ref[i].split('|').map(x => x.split(',').length); if (a.join() !== c.join()) { countDiff++; bad.push(w); } } });
      out.push(`sa ${sa.toFixed(2)}%: break-diff ${breakDiff}/${widths.length}, line-count-diff ${countDiff} ${bad.slice(0,12).join(' ')}`);
    }
    return out;
  });
  console.log(r.join('\n')); await b.close();
})();
