// Sweep size-adjust for the regular fallback face over many column widths and
// count paragraphs whose line breaks differ from the web font's.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const srv = http.createServer((q, s) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : f.endsWith('.html') ? 'text/html' : 'font/ttf' }); s.end(d); }); }).listen(0);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto(`http://localhost:${srv.address().port}/article.html`); await p.evaluate(() => document.fonts.ready);
  const face = process.argv[2] || 'regular';
  const res = await p.evaluate(async (face) => {
    const art = document.querySelector('#body'); art.style.margin = '0';
    const fb = art.cloneNode(true); fb.id = 'fb'; document.body.appendChild(fb);
    const sig = el => [...el.children].map(c => { const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, s = [], last = null;
      while ((n = w.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const t = Math.round(rg.getClientRects()[0].top); if (t !== last) { s.push(m[0]); last = t; } } } return s.join('|'); });
    const fixed = { regular: '102.86%', bold: '85.20%', italic: '93.28%' };
    const out = [];
    for (let sa = 101.6; sa <= 104.21; sa += 0.2) {
      const v = { ...fixed, [face]: sa.toFixed(2) + '%' };
      const fam = 'T' + Math.round(sa * 100);
      const faces = [
        new FontFace(fam, 'local("Georgia")', { weight: '400', style: 'normal', sizeAdjust: v.regular }),
        new FontFace(fam, 'local("Georgia Bold")', { weight: '700', style: 'normal', sizeAdjust: v.bold }),
        new FontFace(fam, 'local("Georgia Italic")', { weight: '400', style: 'italic', sizeAdjust: v.italic })];
      for (const f of faces) { await f.load(); document.fonts.add(f); }
      fb.style.fontFamily = fam;
      let bad = 0, total = 0;
      for (let w = 280; w <= 760; w += 3) {
        art.style.width = fb.style.width = w + 'px'; art.style.maxInlineSize = fb.style.maxInlineSize = 'none';
        const a = sig(art), c = sig(fb); a.forEach((x, i) => { total++; if (x !== c[i]) bad++; });
      }
      out.push(`${sa.toFixed(2)}%  mismatched blocks ${bad}/${total}`);
    }
    return out;
  }, face);
  console.log(face); console.log(res.join('\n')); await b.close(); srv.close();
})();
