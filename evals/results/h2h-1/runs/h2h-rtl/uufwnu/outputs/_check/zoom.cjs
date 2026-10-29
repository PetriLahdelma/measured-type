const { chromium } = require('playwright'); (async () => {
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 200 }, deviceScaleFactor: 4 });
await p.goto('file://' + process.argv[2] + '/ar-text.html');
await p.screenshot({ path: process.argv[2] + '/crumbs-zoom.png', clip: { x: 440, y: 20, width: 250, height: 110 } });
await b.close(); })();
