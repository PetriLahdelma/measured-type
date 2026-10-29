const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 360, height: 560 } });
  for (const f of ['en-orig','en','ar']) { await p.goto('file://' + path.join(__dirname, f + '.html'));
    console.log(f, 'scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
    await p.screenshot({ path: path.join(__dirname, `narrow-${f}.png`) }); } await b.close(); })();
