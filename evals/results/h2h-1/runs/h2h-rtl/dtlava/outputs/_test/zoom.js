const { chromium, webkit } = require('playwright');
const path = require('path');
(async () => {
  for (const bt of [chromium, webkit]) {
    const b = await bt.launch(); const p = await b.newPage({ deviceScaleFactor: 4, viewport: { width: 700, height: 400 } });
    for (const f of ['ar.html', 'en-new.html']) {
      await p.goto('file://' + path.join(__dirname, f));
      await p.locator('.crumbs').screenshot({ path: path.join(__dirname, `zoom-${bt.name()}-${f}.png`) });
    }
    await b.close();
  }
})();
