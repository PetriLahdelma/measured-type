// Measure advance widths of the article's own text in Source Serif 4 vs Georgia, per style.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + dir + '/article.html');
  const r = await p.evaluate(async () => {
    const ss = new FontFace('SS4', 'url("fonts/SourceSerif4[opsz,wght].ttf")', { weight: '200 900' });
    const ssi = new FontFace('SS4', 'url("fonts/SourceSerif4-Italic[opsz,wght].ttf")', { weight: '200 900', style: 'italic' });
    await ss.load(); await ssi.load(); document.fonts.add(ss); document.fonts.add(ssi);
    const body = [...document.querySelectorAll('p')].map(e => e.textContent).join(' ');
    const h1 = document.querySelector('h1').textContent;
    const it = 'nothing else';
    function w(text, fam, size, weight, style) {
      const s = document.createElement('span');
      s.style.cssText = `font-family:${fam};font-size:${size}px;font-weight:${weight};font-style:${style};white-space:nowrap;position:absolute;font-optical-sizing:auto`;
      s.textContent = text; document.body.appendChild(s);
      const x = s.getBoundingClientRect().width; s.remove(); return x;
    }
    const out = {};
    for (const [k, t, size, wt, st] of [['regular', body, 18, 400, 'normal'], ['bold-h1', h1, 36, 700, 'normal'], ['italic', it + ' ' + body, 18, 400, 'italic']]) {
      const a = w(t, 'SS4', size, wt, st), g = w(t, 'Georgia', size, wt, st);
      out[k] = { ss4: a, georgia: g, ratio: a / g };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 2)); await b.close();
})();
