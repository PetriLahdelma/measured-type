const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 200 }, deviceScaleFactor: 4 });
  await p.goto('file://' + __dirname + '/ar.html');
  await p.screenshot({ path: __dirname + '/ar-crumbs.png', clip: { x: 440, y: 20, width: 250, height: 32 } });
  await b.close();
})();
