const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await p.goto('file://' + __dirname + '/page.fixed.html'); await p.locator('.table-scroll').screenshot({ path: __dirname + '/shot-table.png' });
await p.locator('header, h1').first().screenshot({ path: __dirname + '/shot-h1.png' }); await b.close(); })();
