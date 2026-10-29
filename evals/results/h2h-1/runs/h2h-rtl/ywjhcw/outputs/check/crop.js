const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 4 });
for (const f of ['ltr-new','rtl-ar']) { await p.goto('file://' + path.join(__dirname, f + '.html'));
  await p.locator('.crumbs').screenshot({ path: path.join(__dirname, f + '-crumbs.png') });
  await p.locator('.next').screenshot({ path: path.join(__dirname, f + '-next.png') }); }
await b.close(); })();
