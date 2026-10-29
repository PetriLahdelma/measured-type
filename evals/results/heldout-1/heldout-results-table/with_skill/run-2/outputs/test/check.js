const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = 'file://' + path.resolve(__dirname, '../report.html');
  const browser = await chromium.launch();
  for (const [w, scheme] of [[1280,'light'],[375,'light'],[320,'light'],[1280,'dark']]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    const errors = [];
    page.on('console', m => m.type()==='error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(file);
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const loaded = [...document.fonts].map(f => `${f.family} ${f.status}`);
      const wrap = document.querySelector('.table-wrap');
      const rows = [...document.querySelectorAll('#results tbody tr')];
      // x of the decimal point (or of the invisible pad) per column
      const cols = [1,2,3,4].map(ci => rows.map(tr => {
        const num = tr.children[ci].querySelector('.num');
        const range = document.createRange();
        // find the "." in text nodes or pad
        const walker = document.createTreeWalker(num, NodeFilter.SHOW_TEXT);
        let n; while ((n = walker.nextNode())) { const i = n.data.indexOf('.'); if (i >= 0) { range.setStart(n, i); range.setEnd(n, i+1); return Math.round(range.getBoundingClientRect().left*100)/100; } }
        return null;
      }));
      const text = rows.map(tr => [...tr.children].map(c => c.textContent.trim()).join(' | '));
      return { loaded, fits: wrap.scrollWidth <= wrap.clientWidth, sw: wrap.scrollWidth, cw: wrap.clientWidth,
               docOverflow: document.documentElement.scrollWidth > innerWidth, cols, text,
               family: getComputedStyle(document.querySelector('td')).fontFamily,
               num: getComputedStyle(document.querySelector('table')).fontVariantNumeric,
               bg: getComputedStyle(document.body).backgroundColor };
    });
    console.log(w, scheme, JSON.stringify(r, null, 1), errors);
    await page.screenshot({ path: path.join(__dirname, `shot-${w}-${scheme}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
})();
