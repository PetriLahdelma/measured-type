const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 340 } });
  await p.goto('file://' + path.resolve(__dirname, 'm2.html'));
  await p.screenshot({ path: path.resolve(__dirname, 'm2.png') });
  await b.close();
})();
