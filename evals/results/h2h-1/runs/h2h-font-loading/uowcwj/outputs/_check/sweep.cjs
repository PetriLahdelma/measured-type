// Sweeps the column width 1px at a time and counts widths where the fallback
// wraps any paragraph/heading to a different number of lines than the web font.
// Compares the tuned fallback with plain, unadjusted Georgia.
const { chromium } = require('playwright'); const path = require('path');
const dir = path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(dir, 'article.html'));
  await p.evaluate(async () => { await document.fonts.ready; await document.fonts.load('italic 400 18px "Source Serif 4"'); await document.fonts.load('700 36px "Source Serif 4"'); });
  const res = await p.evaluate(() => {
    const art = document.querySelector('article'); const kids = [...art.children];
    const heights = () => kids.map(k => Math.round(k.getBoundingClientRect().height));
    const families = { web: '"Source Serif 4"', tuned: '"Source Serif 4 Fallback"', georgia: 'Georgia' };
    const out = {}; for (const k of Object.keys(families)) out[k] = [];
    for (let w = 260; w <= 576; w++) {
      art.style.maxInlineSize = w + 'px'; art.style.marginInline = '0';
      for (const [k, fam] of Object.entries(families)) { art.style.fontFamily = fam; out[k].push(heights().join(',')); }
    }
    const diff = k => out[k].filter((h, i) => h !== out.web[i]).length;
    const totalDelta = k => out[k].reduce((s, h, i) => s + Math.abs(h.split(',').reduce((a, x) => a + +x, 0) - out.web[i].split(',').reduce((a, x) => a + +x, 0)), 0) / out.web.length;
    return { widths: out.web.length, tunedDiffer: diff('tuned'), georgiaDiffer: diff('georgia'), tunedMeanShiftPx: totalDelta('tuned').toFixed(2), georgiaMeanShiftPx: totalDelta('georgia').toFixed(2) };
  });
  console.log(res); await b.close();
})();
