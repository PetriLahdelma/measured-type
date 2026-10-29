const pw = require('playwright'); const path = require('path');
(async () => { for (const n of ['chromium','webkit','firefox']) { try { const b = await pw[n].launch(); const p = await b.newPage({viewport:{width:300,height:340}});
 await p.goto('file://' + path.join(__dirname, 'mirror.html')); await p.screenshot({ path: path.join(__dirname, 'mirror-' + n + '.png') }); await b.close(); console.log(n,'ok'); } catch (e) { console.log(n, 'unavailable'); } } })();
