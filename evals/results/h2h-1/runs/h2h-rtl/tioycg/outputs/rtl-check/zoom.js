const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 4, viewport: { width: 1024, height: 500 } });
  for (const f of ['en-new', 'ar-new']) {
    await p.goto('file://' + path.join(__dirname, f + '.html'));
    await p.locator('.crumbs').screenshot({ path: path.join(__dirname, f + '-crumbs.png') });
    await p.locator('.next').screenshot({ path: path.join(__dirname, f + '-next.png') });
  }
  await b.close();
})();
