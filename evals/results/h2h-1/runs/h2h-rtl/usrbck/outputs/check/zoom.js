const { chromium, webkit } = require('playwright'); const path = require('path');
(async () => { for (const [n, b] of [['chromium', chromium], ['webkit', webkit]]) { const br = await b.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 400 }, deviceScaleFactor: 3 });
 for (const k of ['ar-new', 'en-new']) { await p.goto('file://' + path.join(__dirname, k + '.html'));
  await p.locator('.crumbs').screenshot({ path: path.join(__dirname, `zoom-${n}-${k}-crumbs.png`) });
  await p.locator('.next').screenshot({ path: path.join(__dirname, `zoom-${n}-${k}-next.png`) }); }
 await br.close(); } })();
