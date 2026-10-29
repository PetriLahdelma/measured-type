const pw = require('playwright'); const path = require('path');
(async () => { for (const n of ['chromium','webkit']) { const b = await pw[n].launch(); const p = await b.newPage({viewport:{width:500,height:560}});
  await p.goto('file://'+path.join(__dirname,'variants.html')); await p.screenshot({path:path.join(__dirname,`variants-${n}.png`)}); await b.close(); } })();
