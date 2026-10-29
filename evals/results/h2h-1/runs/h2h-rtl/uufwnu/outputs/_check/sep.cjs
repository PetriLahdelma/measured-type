const { chromium } = require('playwright'); (async () => {
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 200 }, deviceScaleFactor: 8 });
for (const f of ['ar-noover','ar-naive']) {
await p.goto('file://' + process.argv[2] + '/' + f + '.html');
// locate separator: gap between first li right/left and second li text
const box = await p.evaluate(() => { const li = document.querySelectorAll('.crumbs li')[1]; const r = li.getBoundingClientRect(); const a = li.querySelector('a').getBoundingClientRect(); return document.dir==='rtl' ? {x:a.right, y:r.top, width:r.right-a.right, height:r.height} : {x:r.left, y:r.top, width:a.left-r.left, height:r.height}; });
await p.screenshot({ path: process.argv[2] + '/sep-' + f + '.png', clip: box });
// sample: darkest column position in upper vs lower third tells direction of chevron tip
}
await b.close(); })();
