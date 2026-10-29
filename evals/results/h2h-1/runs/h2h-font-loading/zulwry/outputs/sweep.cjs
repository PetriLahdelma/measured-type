// Renders the article twice side by side, once in Source Serif 4 and once in
// the fallback face only, at every container width from 268 to 576px, and
// counts widths where any word lands on a different line. Sweeps size-adjust.
const { chromium } = require('playwright');
const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await p.goto(pathToFileURL(path.join(process.cwd(), 'article.html')).href);
  await p.evaluate(() => Promise.all([document.fonts.load('400 18px "Source Serif 4"'), document.fonts.load('italic 400 18px "Source Serif 4"'), document.fonts.load('700 36px "Source Serif 4"')]));
  const run = (cfg) => p.evaluate((cfg) => {
    document.getElementById('sw')?.remove();
    const st = document.createElement('style'); st.id = 'sw';
    const face = (src, w, s, sa) => `@font-face{font-family:FB;src:local("${src}");font-weight:${w};font-style:${s};size-adjust:${sa}%;ascent-override:${103.6/sa*100}%;descent-override:${33.5/sa*100}%;line-gap-override:0%}`;
    st.textContent = face('Georgia', 400, 'normal', cfg.r) + face('Georgia Italic', 400, 'italic', cfg.i) + face('Georgia Bold', 700, 'normal', cfg.b) +
      `.cmp{position:absolute;top:0;font-size:1.125rem;line-height:1.55;font-synthesis:none} #A{left:0;font-family:"Source Serif 4"} #B{left:700px;font-family:FB}`;
    document.head.appendChild(st);
    if (!document.getElementById('A')) {
      const src = document.getElementById('body');
      for (const id of ['A', 'B']) { const c = src.cloneNode(true); c.id = id; c.className = 'cmp'; document.body.appendChild(c); }
      src.style.display = 'none';
    }
    return document.fonts.ready.then(() => {
      const tops = el => { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); out.push(Math.round(r.getClientRects()[0].top)); } } return out; };
      const bad = [];
      for (let w = 268; w <= 576; w++) {
        A.style.width = B.style.width = w + 'px';
        const a = tops(A), bb = tops(B);
        if (a.some((t, i) => t !== bb[i])) bad.push(w);
      }
      return bad;
    });
  }, cfg);
  const base = { r: 102.85, i: 93.12, b: 86.03 };
  const b0 = await run(base); console.log('current', b0.length, 'bad widths of 309:', b0.join(','));
  let best = { ...base, n: b0.length };
  for (const k of ['r', 'i', 'b']) {
    for (let d = -1.0; d <= 1.0001; d += 0.05) {
      const cfg = { ...best, [k]: +(base[k] + d).toFixed(2) };
      const n = (await run(cfg)).length;
      if (n < best.n) { best = { ...cfg, n }; console.log('better', JSON.stringify(best)); }
    }
  }
  console.log('best', JSON.stringify(best), 'bad:', (await run(best)).join(','));
  await b.close();
})();
