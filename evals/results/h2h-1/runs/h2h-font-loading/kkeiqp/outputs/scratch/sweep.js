// For candidate regular/italic size-adjust values, count article widths
// (288-576px, every px) where any block's line count differs between the
// fallback and the web font.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file://' + path.resolve(__dirname, '..', 'article.html'));
  await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(async () => {
    const src = document.querySelector('article');
    const mk = fam => { const a = src.cloneNode(true); a.removeAttribute('id'); a.style.fontFamily = fam; a.style.marginInline = '0'; document.body.appendChild(a); return a; };
    const web = mk('"Source Serif 4"');
    const lines = el => [...el.children].map(c => { const r = document.createRange(); r.selectNodeContents(c); return new Set([...r.getClientRects()].map(x => Math.round(x.top))).size; }).join('/');
    const results = [];
    let n = 0;
    for (const reg of [1.027, 1.0286, 1.030]) for (const ital of [0.92, 0.9327, 0.945]) for (const bold of [0.85, 0.8607, 0.87]) {
      const fam = 'Cand' + (n++);
      const faces = [
        new FontFace(fam, 'local("Georgia")', { weight: '400', style: 'normal', sizeAdjust: (reg*100)+'%', ascentOverride: (103.6/reg)+'%', descentOverride: (33.5/reg)+'%', lineGapOverride: '0%' }),
        new FontFace(fam, 'local("Georgia Italic")', { weight: '400', style: 'italic', sizeAdjust: (ital*100)+'%', ascentOverride: (103.6/ital)+'%', descentOverride: (33.5/ital)+'%', lineGapOverride: '0%' }),
        new FontFace(fam, 'local("Georgia Bold")', { weight: '700', style: 'normal', sizeAdjust: (bold*100)+'%', ascentOverride: (103.6/bold)+'%', descentOverride: (33.5/bold)+'%', lineGapOverride: '0%' }),
      ];
      for (const f of faces) { document.fonts.add(f); await f.load(); }
      const fb = mk(fam);
      const bad = [];
      for (let w = 288; w <= 576; w++) {
        web.style.width = fb.style.width = w + 'px';
        web.style.maxInlineSize = fb.style.maxInlineSize = 'none';
        if (lines(web) !== lines(fb) || Math.abs(web.offsetHeight - fb.offsetHeight) > 0.5) bad.push(w);
      }
      fb.remove();
      results.push({ reg, ital, bold, mismatches: bad.length, at: bad.slice(0, 40).join(',') });
    }
    return results;
  });
  for (const r of res) console.log(JSON.stringify(r));
  await b.close();
})();
