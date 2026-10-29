const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2] || 'page.html';
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 375, 768, 1280, 1920]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + path.resolve(file));
    const r = await p.evaluate(() => {
      const cs = (el) => getComputedStyle(el);
      const q = (s) => document.querySelector(s);
      const lines = (el) => { const range = document.createRange(); range.selectNodeContents(el); const rects=[...range.getClientRects()]; const tops=new Set(rects.map(r=>Math.round(r.top))); return tops.size; };
      const cpl = (el) => { const n = lines(el); return Math.round(el.textContent.length / Math.max(n,1)); };
      const body = document.querySelector('main p:not(.lead):not(.meta)');
      const callout = q('.callout');
      const table = q('table');
      const wrap = q('.table-wrap');
      return {
        docScrollW: document.documentElement.scrollWidth,
        font: cs(document.body).fontFamily,
        h1: cs(q('h1')).fontSize + ' / lh ' + cs(q('h1')).lineHeight + ' lines ' + lines(q('h1')),
        h2: cs(q('h2')).fontSize + ' / lh ' + cs(q('h2')).lineHeight,
        lead: cs(q('.lead')).fontSize + ' / lh ' + cs(q('.lead')).lineHeight + ' width ' + q('.lead').getBoundingClientRect().width.toFixed(0) + ' right ' + q('.lead').getBoundingClientRect().right.toFixed(0) + ' cpl ' + cpl(q('.lead')),
        meta: cs(q('.meta')).fontSize + ' color ' + cs(q('.meta')).color,
        body: cs(body).fontSize + ' / lh ' + cs(body).lineHeight + ' cpl ' + cpl(body) + ' align ' + cs(body).textAlign,
        callout: 'client ' + callout.clientHeight + ' scroll ' + callout.scrollHeight + ' clipped ' + (callout.scrollHeight > callout.clientHeight + 1),
        table: 'width ' + table.getBoundingClientRect().width.toFixed(0) + ' right ' + table.getBoundingClientRect().right.toFixed(0) + (wrap ? ' wrapW ' + wrap.clientWidth + ' wrapScroll ' + wrap.scrollWidth : ''),
      };
    });
    console.log(w, JSON.stringify(r, null, 1));
    await p.close();
  }
  await b.close();
})();
