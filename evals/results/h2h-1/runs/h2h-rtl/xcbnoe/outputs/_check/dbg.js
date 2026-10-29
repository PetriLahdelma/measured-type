const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, 'ar.html'));
  console.log(await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.crumbs li + li'), '::before'); return [s.content, s.direction, s.unicodeBidi, [...s.content].map(c=>c.codePointAt(0).toString(16))]; }));
  await b.close();
})();
