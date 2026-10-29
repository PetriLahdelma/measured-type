const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 520 } });
  const out = {};
  for (const f of ['en-orig','en-new','ar','en-rtl']) {
    await p.goto('file://' + __dirname + '/' + f + '.html');
    await p.screenshot({ path: __dirname + '/' + f + '.png' });
    out[f] = await p.evaluate(() => {
      const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; };
      return { tag: r('.tag'), h2: r('.title h2'), note: getComputedStyle(document.querySelector('.note')).borderRightWidth + '/' + getComputedStyle(document.querySelector('.note')).borderLeftWidth,
        next: getComputedStyle(document.querySelector('.next'), '::after').content, crumb2: r('.crumbs li:nth-child(2)'), crumb1: r('.crumbs li:nth-child(1)') };
    });
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
