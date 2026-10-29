const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2 });
await p.goto('file://' + path.resolve(__dirname, 'ar.html'));
console.log(await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, h2: document.querySelector('.title h2').getBoundingClientRect().left, tagR: document.querySelector('.tag').getBoundingClientRect().right })));
await p.screenshot({ path: path.resolve(__dirname, 'ar-320.png'), fullPage: true }); await b.close(); })();
