const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 for (const [f, w] of [['page.html',1280],['page.fixed.html',1280],['page.fixed.html',320]]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  await p.goto('file://' + path.resolve(f));
  await p.screenshot({ path: `scratch/${f.replace('.html','')}-${w}.png`, fullPage: true }); await p.close(); }
 await b.close(); })();
