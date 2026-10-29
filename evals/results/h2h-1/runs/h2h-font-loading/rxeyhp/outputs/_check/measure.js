const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const sample = "Most of what we read on screens is read in passing. Long reading is different in kind, not only in length: it asks the reader to hold a thread across pages and to trust that the page will not shift under the eye. The quick brown fox jumps over the lazy dog; Sphinx of black quartz, judge my vow! 1234567890 (WHO) \"quoted\" it's";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + root + '/article.html');
  const r = await p.evaluate(async (sample) => {
    const base = location.href.replace(/[^/]*$/, '');
    const add = (fam, file, style) => { const f = new FontFace(fam, `url(${base}fonts/${file})`, { style, weight: '200 900' }); document.fonts.add(f); return f.load(); };
    await add('SS4', 'SourceSerif4[opsz,wght].ttf', 'normal');
    await add('SS4', 'SourceSerif4-Italic[opsz,wght].ttf', 'italic');
    const w = (fam, style, weight, size) => { const s = document.createElement('span'); s.style.cssText = `font-family:${fam};font-style:${style};font-weight:${weight};font-size:${size}px;white-space:nowrap;position:absolute`; s.textContent = sample; document.body.append(s); const x = s.getBoundingClientRect().width; s.remove(); return x; };
    const out = {};
    for (const [k, st, wt, sz] of [['regular18','normal',400,18],['italic18','italic',400,18],['bold18','normal',700,18],['bolditalic18','italic',700,18],['regular36','normal',400,36],['italic36','italic',400,36],['bold36','normal',700,36],['bolditalic36','italic',700,36],['regular16','normal',400,16],['regular20','normal',400,20]]) {
      const a = w('SS4', st, wt, sz), g = w('Georgia', st, wt, sz);
      out[k] = { ss4: a, georgia: g, ratio: a / g };
    }
    return out;
  }, sample);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
