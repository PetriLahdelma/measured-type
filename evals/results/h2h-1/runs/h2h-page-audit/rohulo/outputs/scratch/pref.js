const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 for (const f of ['page.html','page.fixed.html']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto('file://' + path.resolve(f));
  // simulate a reader whose browser default text size is 24px (150%)
  await p.addStyleTag({ content: ':root{font-size:24px}' });
  const r = await p.evaluate(() => ['h1','h2','.lead','main > p:nth-of-type(3)','.meta'].map(s => s + '=' + getComputedStyle(document.querySelector(s)).fontSize));
  console.log(f, r.join(' ')); await p.close(); }
 // page zoom 200%: viewport halves in CSS px
 for (const f of ['page.html','page.fixed.html']) for (const w of [1280, 640]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } }); await p.goto('file://' + path.resolve(f));
  console.log(f, 'css viewport', w, 'h1', await p.evaluate(() => getComputedStyle(document.querySelector('h1')).fontSize)); await p.close(); }
 await b.close(); })();
