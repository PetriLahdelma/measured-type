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
  const res = await p.evaluate(async ([face, lo, hi, step]) => {
    const art = document.querySelector('#body'); art.style.margin = '0';
    const fb = art.cloneNode(true); fb.id = 'fb'; document.body.appendChild(fb);
    const sig = el => [...el.children].map(c => { const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, s = [], last = null;
      while ((n = w.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const t = Math.round(rg.getClientRects()[0].top); if (t !== last) { s.push(m[0]); last = t; } } } return s.join('|'); });
    const fixed = { regular: '102.86%', bold: '85.20%', italic: '93.28%' };
    const out = [];
    for (let sa = lo; sa <= hi + 0.001; sa += step) {
      const v = { ...fixed, [face]: sa.toFixed(2) + '%' }; const ov = k => ({ sizeAdjust: v[k], ascentOverride: (103.6 / parseFloat(v[k]) * 100).toFixed(2) + '%', descentOverride: (33.5 / parseFloat(v[k]) * 100).toFixed(2) + '%', lineGapOverride: '0%' });
      const fam = 'T' + Math.round(sa * 1000);
      const faces = [
        new FontFace(fam, 'local("Georgia")', { weight: '400', style: 'normal', ...ov('regular') }),
        new FontFace(fam, 'local("Georgia Bold")', { weight: '700', style: 'normal', ...ov('bold') }),
        new FontFace(fam, 'local("Georgia Italic")', { weight: '400', style: 'italic', ...ov('italic') })];
      for (const f of faces) { await f.load(); document.fonts.add(f); }
      fb.style.fontFamily = fam;
      let bad = 0, total = 0, hb = 0, hw = 0, bw = [];
      for (const vw of [320, 360, 375, 390, 393, 402, 412, 414, 428, 430, 440, 600, 768]) { const w = Math.min(vw - 32, 576);
        art.style.width = fb.style.width = w + 'px'; art.style.maxInlineSize = fb.style.maxInlineSize = 'none';
        const a = sig(art), c = sig(fb); a.forEach((x, i) => { total++; if (x !== c[i]) bad++; }); hw++; if (art.offsetHeight !== fb.offsetHeight) { hb++; bw.push(vw); }
      }
      out.push(`${sa.toFixed(2)}%  mismatched blocks ${bad}/${total}, article height differs at ${hb}/${hw} widths [${bw}]`);
    }
    return out;
  }, [face, +process.argv[3], +process.argv[4], +process.argv[5]]);
  console.log(face); console.log(res.join('\n')); await b.close(); srv.close();
})();
