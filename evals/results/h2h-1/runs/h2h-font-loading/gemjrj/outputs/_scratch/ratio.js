// Measures how wide the article text sets in Source Serif 4 vs plain Georgia,
// per style, at the sizes the page actually uses. Ratio = size-adjust for the fallback.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + dir + '/article.html');
  const out = await p.evaluate(async () => {
    const base = location.href.replace(/[^/]*$/, '');
    const up = new FontFace('SS4M', `url(${base}fonts/SourceSerif4[opsz,wght].ttf)`, { weight: '200 900' });
    const it = new FontFace('SS4M', `url(${base}fonts/SourceSerif4-Italic[opsz,wght].ttf)`, { weight: '200 900', style: 'italic' });
    await Promise.all([up.load(), it.load()]); document.fonts.add(up); document.fonts.add(it);
    const text = document.getElementById('body').textContent.replace(/\s+/g, ' ').trim();
    const c = document.createElement('canvas').getContext('2d');
    // canvas does not apply auto optical sizing, so measure with DOM spans instead
    const span = (fam, style, weight, size) => {
      const s = document.createElement('span');
      s.textContent = text; s.style.cssText = `font-family:${fam};font-style:${style};font-weight:${weight};font-size:${size}px;white-space:nowrap;position:absolute;font-kerning:normal`;
      document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w;
    };
    const res = {};
    for (const [k, st, wt, sz] of [['regular','normal',400,18],['italic','italic',400,18],['bold','normal',700,36],['boldItalic','italic',700,36],['regular36','normal',400,36],['bold18','normal',700,18]]) {
      const a = span('SS4M', st, wt, sz), g = span('Georgia', st, wt, sz);
      res[k] = { ss4: a, georgia: g, ratio: a / g };
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
