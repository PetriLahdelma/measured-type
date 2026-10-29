// Measures advance widths of the article's real text in Source Serif 4 vs Georgia,
// per style, at the sizes the article uses, to derive size-adjust.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const dir = path.resolve(__dirname, '..');
  await p.goto('file://' + dir + '/article.html');
  const out = await p.evaluate(async () => {
    const ff = (n, file, style) => new FontFace(n, `url("fonts/${file}")`, { style, weight: '200 900' });
    const r = ff('SSM', 'SourceSerif4%5Bopsz,wght%5D.ttf', 'normal');
    const i = ff('SSM', 'SourceSerif4-Italic%5Bopsz,wght%5D.ttf', 'italic');
    document.fonts.add(r); document.fonts.add(i); await r.load(); await i.load();
    const art = document.querySelector('article');
    const paras = [...art.querySelectorAll('p')].map(x => x.textContent).join(' ');
    const h1 = art.querySelector('h1').textContent;
    const em = art.querySelector('em').textContent;
    const cases = {
      regular: { text: paras, size: 18, weight: 400, style: 'normal' },
      italic: { text: paras, size: 18, weight: 400, style: 'italic' },
      bold: { text: h1 + ' ' + paras, size: 36, weight: 700, style: 'normal' },
      boldItalic: { text: paras, size: 18, weight: 700, style: 'italic' },
    };
    const res = {};
    for (const [k, c] of Object.entries(cases)) {
      const w = fam => {
        const s = document.createElement('span');
        s.style.cssText = `font-family:${fam};font-size:${c.size}px;font-weight:${c.weight};font-style:${c.style};white-space:nowrap;position:absolute;font-optical-sizing:auto;font-synthesis:none`;
        s.textContent = c.text; document.body.appendChild(s);
        const v = s.getBoundingClientRect().width; s.remove(); return v;
      };
      const ss = w('SSM'), g = w('Georgia');
      res[k] = { ss, g, sizeAdjust: ss / g };
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
