const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, name] of [[1280, 'desktop'], [320, 'narrow']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + __dirname + '/page.fixed.html');
    await p.screenshot({ path: __dirname + `/shot-${name}.png`, fullPage: true });
    const info = await p.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      const sc = document.querySelector('.table-scroll');
      const h2 = [...document.querySelectorAll('h2')].map(h => { const n = h.nextElementSibling.getBoundingClientRect(); const hr = h.getBoundingClientRect(); const prev = h.previousElementSibling.getBoundingClientRect(); return { above: prev.bottom === undefined ? 0 : Math.round(hr.top - prev.bottom), below: Math.round(n.top - hr.bottom), h: hr.height }; });
      return { docW: document.documentElement.scrollWidth, tableW: r('table').width, scrollW: sc.scrollWidth, clientW: sc.clientWidth, h1: getComputedStyle(document.querySelector('h1')).fontSize, h2 };
    });
    console.log(name, JSON.stringify(info));
  }
  await b.close();
})();
