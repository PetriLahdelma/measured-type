const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
  for (const w of [375, 1280]) { const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + path.resolve('page.fixed.html'));
    await p.locator('.table-scroll').screenshot({ path: `table-${w}.png` }); await p.close(); }
  await b.close(); })();
