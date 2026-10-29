const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:900,height:140}});
for (const f of ['ar','en-new']) {
await p.goto('file://' + __dirname + '/' + f + '.html'); await p.addStyleTag({content:'.crumbs{font-size:48px} main{display:none}'});
await p.screenshot({path: __dirname + '/big-' + f + '-v1.png'}); }
await b.close(); })();
