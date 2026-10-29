// Tries nearby size-adjust values for the regular fallback face and counts
// column widths (260-576px) where any block wraps differently from the web font.
const { chromium } = require('playwright'); const path = require('path');
const dir = path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(dir, 'article.html'));
  await p.evaluate(async () => { await document.fonts.ready; await document.fonts.load('italic 400 18px "Source Serif 4"'); await document.fonts.load('700 36px "Source Serif 4"'); });
  const res = await p.evaluate(async () => {
    const art = document.querySelector('article'); const kids = [...art.children];
    const hs = () => kids.map(k => Math.round(k.getBoundingClientRect().height)).join(',');
    art.style.marginInline = '0';
    const web = []; art.style.fontFamily = '"Source Serif 4"';
    for (let w = 260; w <= 576; w++) { art.style.maxInlineSize = w + 'px'; web.push(hs()); }
    const out = [];
    for (let r = 1.018; r <= 1.0381; r += 0.002) {
      const fam = 'T' + Math.round(r * 1e4);
      const mk = (src, style, weight, sa) => new FontFace(fam, src, { style, weight, sizeAdjust: (sa * 100).toFixed(2) + '%', ascentOverride: (103.6 / sa).toFixed(2) + '%', descentOverride: (33.5 / sa).toFixed(2) + '%', lineGapOverride: '0%' });
      const faces = [mk('local("Georgia")', 'normal', '400', r), mk('local("Georgia Italic")', 'italic', '400', 0.9326), mk('local("Georgia Bold")', 'normal', '700', 0.8607)];
      for (const f of faces) { await f.load(); document.fonts.add(f); }
      art.style.fontFamily = `"${fam}"`; let d = 0;
      for (let w = 260, i = 0; w <= 576; w++, i++) { art.style.maxInlineSize = w + 'px'; if (hs() !== web[i]) d++; }
      out.push(`${r.toFixed(3)}: ${d}`);
    }
    return out;
  });
  console.log(res.join('\n')); await b.close();
})();
