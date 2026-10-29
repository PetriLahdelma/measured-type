const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2] || 'page.html';
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 768, 1280, 1920]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + path.resolve(file));
    const r = await p.evaluate(() => {
      const out = { docW: document.documentElement.scrollWidth, vw: innerWidth };
      const lines = (el) => {
        // count chars per rendered line using Range rects
        const tn = []; const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
        while ((n = walk.nextNode())) tn.push(n);
        const rows = {};
        for (const t of tn) for (let i = 0; i < t.length; i++) {
          const rg = document.createRange(); rg.setStart(t, i); rg.setEnd(t, i + 1);
          const rc = rg.getClientRects()[0]; if (!rc) continue;
          const k = Math.round(rc.top); rows[k] = (rows[k] || 0) + 1;
        }
        const v = Object.values(rows); return { n: v.length, max: Math.max(...v), avg: Math.round(v.reduce((a, c) => a + c, 0) / v.length) };
      };
      const cs = (el) => getComputedStyle(el);
      const h1 = document.querySelector('h1');
      out.h1 = { fs: cs(h1).fontSize, lh: cs(h1).lineHeight, h: h1.getBoundingClientRect().height, lines: lines(h1).n };
      const h2 = document.querySelector('h2'); out.h2 = { fs: cs(h2).fontSize, lh: cs(h2).lineHeight };
      out.lead = { w: document.querySelector('.lead').getBoundingClientRect().width, fs: cs(document.querySelector('.lead')).fontSize, lh: cs(document.querySelector('.lead')).lineHeight, ...lines(document.querySelector('.lead')) };
      out.body = lines(document.querySelectorAll('main > p')[2]);
      out.bodyW = document.querySelectorAll('main > p')[2].getBoundingClientRect().width;
      const c = document.querySelector('.callout'); out.callout = { client: c.clientHeight, scroll: c.scrollHeight, clipped: c.scrollHeight > c.clientHeight };
      const t = document.querySelector('table'); out.table = { w: t.getBoundingClientRect().width, right: t.getBoundingClientRect().right };
      out.meta = { fs: cs(document.querySelector('.meta')).fontSize, color: cs(document.querySelector('.meta')).color };
      return out;
    });
    console.log(w, JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
