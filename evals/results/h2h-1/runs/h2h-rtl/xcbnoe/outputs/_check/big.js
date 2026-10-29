const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 120 }, deviceScaleFactor: 8 });
for (const f of process.argv.slice(2)) { await p.goto('file://' + path.resolve(__dirname, f)); await p.screenshot({ path: path.resolve(__dirname, 'big-' + f.replace('.html','') + '.png'), clip: { x: 690, y: 24, width: 50, height: 28 } }); }
await b.close(); })();
