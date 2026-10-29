// Measures unwrapped text width per role in Source Serif 4 vs raw Georgia (no size-adjust)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const root = path.resolve(__dirname, '..');
  await p.goto('file://' + root + '/article.html');
  const res = await p.evaluate(async () => {
    const add = (fam, url, style) => { const f = new FontFace(fam, `url("${url}")`, { style, weight: '200 900' }); document.fonts.add(f); return f.load(); };
    await add('SS4cal', 'fonts/SourceSerif4%5Bopsz,wght%5D.ttf', 'normal');
    await add('SS4cal', 'fonts/SourceSerif4-Italic%5Bopsz,wght%5D.ttf', 'italic');
    const roles = [
      ['body', 'p', 18, 400, 'normal'],
      ['italic', 'em', 18, 400, 'italic'],
      ['bold h1', 'h1', 36, 700, 'normal'],
    ];
    const out = {};
    for (const [name, sel, size, w, st] of roles) {
      const txt = [...document.querySelectorAll(sel)].map(e => e.textContent).join(' ').replace(/\s+/g,' ');
      const m = fam => { const s = document.createElement('span'); s.style.cssText = `position:absolute;white-space:nowrap;font:${st} ${w} ${size}px ${fam};line-height:1`; s.textContent = txt; document.body.append(s); const r = s.getBoundingClientRect().width; s.remove(); return r; };
      const a = m('SS4cal'), g = m('Georgia');
      out[name] = { ss4: a, georgia: g, sizeAdjust: (a / g * 100).toFixed(2) + '%' };
    }
    return out;
  });
  console.log(res);
  await b.close();
})();
