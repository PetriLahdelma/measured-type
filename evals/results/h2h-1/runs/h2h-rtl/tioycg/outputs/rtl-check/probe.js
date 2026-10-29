const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://'+path.join(__dirname,'ar-new.html'));
  console.log(await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.crumbs li + li'), '::before'); return [cs.content, cs.direction, cs.unicodeBidi, [...cs.content].map(c=>c.codePointAt(0).toString(16))]; }));
  await b.close(); })();
