// Compare line breaks of the article set in Source Serif 4 vs the metric-matched
// fallback at every content width from 288px (320px viewport) to 576px (36rem cap).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const W = process.argv[2]; const regs = (process.argv[3] || '').split(' ').filter(Boolean);
(async () => {
  const b = await chromium.launch();
  const base = fs.readFileSync(path.join(W, 'fonts.css'), 'utf8');
  const html = fs.readFileSync(path.join(W, 'article.html'), 'utf8');
  for (const reg of regs.length ? regs : [null]) {
    let css = base;
    if (reg) {
      const [r, i, bo] = reg.split('/').map(Number);
      const set = (css, anchor, s) => css.replace(new RegExp('(' + anchor + '[\\s\\S]*?size-adjust: )[\\d.]+%;\\s*ascent-override: [\\d.]+%;[^\\n]*\\n\\s*descent-override: [\\d.]+%;'),
        `$1${s}%;\n  ascent-override: ${(103.6 / s * 100).toFixed(2)}%;\n  descent-override: ${(33.5 / s * 100).toFixed(2)}%;`);
      css = set(css, 'local\\("Georgia"\\)', r);
      if (i) css = set(css, 'local\\("Georgia Italic"\\)', i);
      if (bo) css = set(css, 'local\\("Georgia Bold"\\)', bo);
    }
    const p = await b.newPage();
    await p.route('http://t.test/**', r => {
      const rel = decodeURIComponent(new URL(r.request().url()).pathname.slice(1));
      if (rel === 'fonts.css') return r.fulfill({ body: css, contentType: 'text/css' });
      if (rel === 'article.html') return r.fulfill({ body: html, contentType: 'text/html' });
      r.fulfill({ body: fs.readFileSync(path.join(W, rel)), contentType: 'font/ttf' });
    });
    await p.goto('http://t.test/article.html');
    const res = await p.evaluate(async () => {
      const a = document.getElementById('body');
      const web = a.cloneNode(true), fb = a.cloneNode(true);
      web.id = ''; fb.id = ''; fb.style.fontFamily = '"Source Serif 4 Fallback"';
      web.style.fontFamily = '"Source Serif 4"';
      document.body.replaceChildren(web, fb);
      for (const f of ['400 18px', 'italic 400 18px', '700 36px']) { await document.fonts.load(f + ' "Source Serif 4"'); await document.fonts.load(f + ' "Source Serif 4 Fallback"'); }
      const lines = el => [...el.children].map(c => Math.round(c.getBoundingClientRect().height));
      let mism = [], total = 0;
      for (let w = 288; w <= 576; w++) {
        web.style.inlineSize = fb.style.inlineSize = w + 'px';
        const x = lines(web), y = lines(fb); total++;
        if (x.join() !== y.join()) mism.push(w + ':' + x.map((v, i) => v === y[i] ? '' : `${i}(${y[i]}->${v})`).filter(Boolean).join(','));
      }
      return { total, mism };
    });
    console.log(`regular size-adjust ${reg || '(file)'}: ${res.mism.length}/${res.total} widths change height${res.mism.length ? '  e.g. ' + res.mism.map(m=>m.split(':')[0]).join(',') : ''}`);
    await p.close();
  }
  await b.close();
})();
