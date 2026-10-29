const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 for (const w of [375, 768, 1280]) { const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('file://' + path.resolve('page.fixed.html'));
  for (const mode of ['pretty', 'wrap']) {
   const r = await p.evaluate((mode) => { const out = {};
    for (const sel of ['.lead', 'main > p:nth-of-type(3)', '.callout p', 'main > p:nth-of-type(4)', '.meta']) {
     const el = document.querySelector(sel); el.style.textWrap = mode;
     const range = document.createRange(); const L = new Map();
     const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
     while ((n = tw.nextNode())) for (let i = 0; i < n.length; i++) { range.setStart(n, i); range.setEnd(n, i + 1); const rr = range.getClientRects()[0]; if (!rr) continue; const k = Math.round(rr.top); L.set(k, (L.get(k) || 0) + rr.width); }
     out[sel] = [...L.values()].map(x => Math.round(x)).join(' ');
    } return out; }, mode);
   console.log(w, mode, JSON.stringify(r)); }
  await p.close(); }
 await b.close(); })();
