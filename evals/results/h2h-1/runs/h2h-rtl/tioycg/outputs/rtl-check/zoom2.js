const pw = require('playwright'); const path = require('path');
(async () => { for (const n of ['chromium','webkit']) { const b = await pw[n].launch(); const p = await b.newPage({deviceScaleFactor:6});
  for (const f of ['ar-original','ar-new','en-new']) { await p.goto('file://'+path.join(__dirname,f+'.html'));
    await p.locator('.crumbs li:nth-child(2)').screenshot({path:path.join(__dirname,`li2-${f}-${n}.png`)}); }
  await b.close(); } })();
