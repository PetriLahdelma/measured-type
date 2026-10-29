const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 for (const f of ['page.html', 'page.fixed.html']) { const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + path.resolve(f));
  const r = await p.evaluate(() => { const g = s => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
   const before = ['h1','h2','.lead','main > p:nth-of-type(3)','.meta'].map(g);
   document.documentElement.style.fontSize = '200%';
   const after = ['h1','h2','.lead','main > p:nth-of-type(3)','.meta'].map(g);
   const c = document.querySelector('.callout'); const de = document.documentElement;
   return { before, after, calloutClipped: c.scrollHeight > c.clientHeight, hScroll: de.scrollWidth > de.clientWidth }; });
  console.log(f, JSON.stringify(r));
  if (f === 'page.fixed.html') await p.screenshot({ path: '_scratch/after-textzoom200.png', fullPage: true });
  await p.close(); }
 const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto('file://' + path.resolve('page.fixed.html'));
 const t = await p.evaluate(() => [...document.querySelectorAll('td:first-child')].map(td => td.getClientRects().length + ':' + Math.round(td.getBoundingClientRect().height)));
 console.log('first-col rows', t); await p.screenshot({ path: '_scratch/after-1280b.png' }); await b.close(); })();
