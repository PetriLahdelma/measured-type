const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 768, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + path.resolve(file));
    const r = await p.evaluate(() => {
      const out = { scrollW: document.documentElement.scrollWidth, vw: innerWidth, fontFamilyUsed: null };
      const q = (s) => document.querySelector(s);
      const info = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        // chars per line: measure first line
        let cpl = null;
        if (el.tagName === 'P') {
          const range = document.createRange(); const t = el.firstChild; const txt = el.textContent;
          if (t && t.nodeType === 3) { let top = null, n = 0;
            for (let i = 0; i < txt.length; i++) { range.setStart(t, i); range.setEnd(t, i + 1); const rr = range.getBoundingClientRect(); if (top === null) top = rr.top; if (rr.top > top + 2) break; n++; }
            cpl = n; }
        }
        return { fs: cs.fontSize, lh: cs.lineHeight, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), cpl, scrollH: el.scrollHeight, clientH: el.clientHeight, align: cs.textAlign, color: cs.color };
      };
      out.h1 = info(q('h1')); out.h2 = info(q('h2')); out.lead = info(q('.lead')); out.meta = info(q('.meta'));
      out.body = info(document.querySelectorAll('main > p')[2]); out.callout = info(q('.callout')); out.wrap = q('.table-wrap') ? info(q('.table-wrap')) : null; if (q('.table-wrap')) { out.wrap.sw = q('.table-wrap').scrollWidth; }; out.calloutP = info(q('.callout p'));
      out.table = info(q('table'));
      const h1 = q('h1'); out.h1lines = Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight));
      return out;
    });
    console.log(w, JSON.stringify(r));
    await p.screenshot({ path: `scratch/${path.basename(file)}-${w}.png`, fullPage: true });
    await p.close();
  }
  await b.close();
})();
