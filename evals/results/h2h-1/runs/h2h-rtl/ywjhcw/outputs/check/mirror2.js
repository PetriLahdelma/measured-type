const pw = require('playwright'); const path = require('path');
(async () => { for (const n of ['chromium','webkit']) { const b = await pw[n].launch(); const p = await b.newPage({viewport:{width:300,height:340}});
 await p.goto('file://' + path.join(__dirname, 'mirror.html'));
 const res = await p.evaluate(() => [...document.querySelectorAll('ol')].map(ol => ({cls: ol.className, items: [...ol.children].map(li => { const r = li.getBoundingClientRect(); return li.textContent + '@' + Math.round(r.left) + '-' + Math.round(r.right); }).join('  ')})));
 console.log(n, JSON.stringify(res));
 // pixel test of separator in first and last rows: clip the 2nd li and find chevron apex
 for (const idx of [0,4,5]) { const box = await p.evaluate(i => { const li = document.querySelectorAll('ol')[i].children[1]; const r = li.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(li.firstChild); const t = rg.getBoundingClientRect(); return {li:[r.left,r.top,r.width,r.height], text:[t.left,t.right]}; }, idx);
   console.log(' row', idx, JSON.stringify(box)); }
 await b.close(); } })();
