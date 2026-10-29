const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [f, w] of [['page.html',1280],['page.fixed.html',1280],['page.fixed.html',320]]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + process.cwd() + '/' + f);
    await p.screenshot({ path: `shot-${f.replace('.html','')}-${w}.png`, fullPage: true });
    const info = await p.evaluate(() => {
      const t = document.querySelector('table'); const s = document.querySelector('.table-scroll');
      const r = el => el ? Math.round(el.getBoundingClientRect().width) : null;
      const gaps = [...document.querySelectorAll('h2')].map(h => { const n = h.nextElementSibling; return Math.round(n.getBoundingClientRect().top - h.getBoundingClientRect().bottom); });
      const above = [...document.querySelectorAll('h2')].map(h => { const pr = h.previousElementSibling; return Math.round(h.getBoundingClientRect().top - pr.getBoundingClientRect().bottom); });
      return { doc: document.documentElement.scrollWidth, table: r(t), wrap: r(s), scroll: s ? s.scrollWidth : null, gapsBelowH2: gaps, gapsAboveH2: above, h1: getComputedStyle(document.querySelector('h1')).fontSize };
    });
    console.log(f, w, JSON.stringify(info));
  }
  await b.close();
})();
