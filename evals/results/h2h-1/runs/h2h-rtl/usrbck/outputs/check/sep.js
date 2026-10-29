const { chromium, webkit } = require('playwright'); const path = require('path');
(async () => { for (const [n, b] of [['chromium', chromium], ['webkit', webkit]]) { const br = await b.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 400 }, deviceScaleFactor: 6 });
 await p.goto('file://' + path.join(__dirname, 'ar-new.html'));
 const li = await p.locator('.crumbs li').nth(1).boundingBox();
 await p.screenshot({ path: path.join(__dirname, `sep-${n}.png`), clip: { x: li.x + li.width - 22, y: li.y, width: 22, height: li.height } });
 await br.close(); } })();
