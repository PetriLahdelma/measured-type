const pw = require('playwright'); const path = require('path');
(async () => { for (const n of ['firefox','webkit']) { try { const b = await pw[n].launch(); const p = await b.newPage({deviceScaleFactor:4});
  for (const f of ['ar-new']) { await p.goto('file://'+path.join(__dirname,f+'.html')); await p.locator('.crumbs').screenshot({path:path.join(__dirname,`${f}-crumbs-${n}.png`)}); }
  await b.close(); console.log(n,'ok'); } catch(e){ console.log(n,'unavailable'); } } })();
