const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 200 }, deviceScaleFactor: 4 });
  await p.goto('file://' + path.resolve(__dirname, 'ar.html'));
  await p.screenshot({ path: path.resolve(__dirname, 'ar-crumbs-v2.png'), clip: { x: 560, y: 20, width: 230, height: 40 } });
  await b.close();
})();
