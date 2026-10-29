// Sweeps the regular body fallback size-adjust and counts content widths
// (288..576px, 0.5px steps) where the article's line breaks differ from the web font.
const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file://' + root + '/article.html');
  await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(async () => {
    const src = document.querySelector('.prose');
    const web = src.cloneNode(true); web.id = ''; const fb = src.cloneNode(true); fb.id = '';
    for (const c of [web, fb]) { c.style.position = 'absolute'; c.style.left = '0'; c.style.top = '0'; c.style.marginInline = '0'; document.body.append(c); }
    fb.style.fontFamily = 'TestFB'; fb.querySelector('h1').style.fontFamily = 'TestFBD';
    const breaks = (root) => [...root.children].map(el => { const t = []; let wi = 0, last = null; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const top = rg.getClientRects()[0].top; if (last === null || top - last > 5) { t.push(wi); last = top; } wi++; } } return t.join(','); }).join('|');
    const it = new FontFace('TestFB', 'local("Georgia Italic")', { style: 'italic', sizeAdjust: '93.2%', ascentOverride: (103.6/0.932).toFixed(2)+'%', descentOverride: (33.5/0.932).toFixed(2)+'%', lineGapOverride: '0%' });
    document.fonts.add(it); await it.load();
    const fbody = new FontFace("TestFB", "local(\"Georgia\")", { sizeAdjust: "103%", lineGapOverride: "0%" }); document.fonts.add(fbody); await fbody.load();
    const out = [];
    let face = null;
    for (let sa = 85.0; sa <= 87.01; sa += 0.2) {
      if (face) document.fonts.delete(face);
      face = new FontFace("TestFBD", "local(\"Georgia Bold\")", { weight: "700",  sizeAdjust: sa.toFixed(2) + '%', ascentOverride: (103.6 / sa * 100).toFixed(2) + '%', descentOverride: (33.5 / sa * 100).toFixed(2) + '%', lineGapOverride: '0%' });
      document.fonts.add(face); await face.load();
      let bad = 0, total = 0, perEl = [0,0,0,0];
      for (let w = 288; w <= 576; w += 0.5) {
        web.style.inlineSize = fb.style.inlineSize = w + 'px'; web.style.maxInlineSize = fb.style.maxInlineSize = 'none';
        const a = breaks(web).split('|'), c = breaks(fb).split('|');
        total++; if (a.join('|') !== c.join('|')) bad++;
        a.forEach((x, i) => { if (x !== c[i]) perEl[i]++; });
      }
      out.push(`${sa.toFixed(2)}%: ${bad}/${total} widths differ (h1,p1,p2,p3: ${perEl.join(',')})`);
    }
    return out;
  });
  console.log(res.join('\n'));
  await b.close();
})();
