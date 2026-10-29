const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + __dirname + '/ar.html');
  console.log(await p.evaluate(() => { const s=getComputedStyle(document.querySelector('.crumbs li+li'),'::before'); return [s.content, s.direction, s.unicodeBidi, [...s.content].map(c=>c.codePointAt(0).toString(16))]; }));
  console.log(await b.version());
  await b.close();
})();
