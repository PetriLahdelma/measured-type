const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2];
const widths = (process.argv[3]||'320,375,768,1280,1920').split(',').map(Number);
(async () => {
  const b = await chromium.launch();
  for (const w of widths) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + path.resolve(file));
    const r = await p.evaluate(() => {
      const out = {};
      out.docScrollW = document.documentElement.scrollWidth;
      out.viewport = innerWidth;
      const lines = (el) => {
        const range = document.createRange(); const tn = []; const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n; while ((n = walk.nextNode())) tn.push(n);
        const rows = new Map();
        for (const t of tn) for (let i = 0; i < t.length; i++) { range.setStart(t, i); range.setEnd(t, i+1); const rc = range.getClientRects()[0]; if (!rc) continue; const k = Math.round(rc.top); rows.set(k, (rows.get(k)||'') + t.data[i]); }
        return [...rows.values()].map(s => s.trim().length);
      };
      const q = (s) => document.querySelector(s);
      const cs = (el) => getComputedStyle(el);
      const body = document.querySelectorAll('main > p:not(.lead):not(.meta)')[0];
      const L = lines(body);
      out.bodyLines = L; out.bodyFont = cs(body).fontFamily + ' ' + cs(body).fontSize + '/' + cs(body).lineHeight;
      const lead = q('.lead'); out.leadWidth = lead.getBoundingClientRect().width; out.leadRight = lead.getBoundingClientRect().right; out.leadLines = lines(lead);
      out.leadLH = cs(lead).fontSize + '/' + cs(lead).lineHeight;
      const h1 = q('h1'); out.h1 = cs(h1).fontSize + ' / lh ' + cs(h1).lineHeight + ' w' + h1.getBoundingClientRect().width;
      const co = q('.callout'); out.callout = { client: co.clientHeight, scroll: co.scrollHeight, clipped: co.scrollHeight > co.clientHeight };
      const t = q('table'); out.table = { w: t.getBoundingClientRect().width, right: t.getBoundingClientRect().right, parentRight: t.parentElement.getBoundingClientRect().right };
      const wrap = q('.table-wrap'); if (wrap) out.wrap = { client: wrap.clientWidth, scroll: wrap.scrollWidth };
      out.mainW = q('main').getBoundingClientRect().width;
      return out;
    });
    console.log(w, JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
