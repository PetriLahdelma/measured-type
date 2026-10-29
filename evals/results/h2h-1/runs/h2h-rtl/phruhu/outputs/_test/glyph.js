const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:500,height:260}});
await p.goto('file://' + __dirname + '/glyph2.html'); await p.screenshot({path: __dirname + '/glyph2-v1.png'}); await b.close(); })();
