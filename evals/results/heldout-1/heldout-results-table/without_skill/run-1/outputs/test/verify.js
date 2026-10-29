const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const url = 'file://' + path.resolve(__dirname, '../report.html');
  for (const [w, h, scheme] of [[1280, 800, 'light'], [320, 700, 'light'], [1280, 800, 'dark']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(url);
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const fontOk = document.fonts.check('16px "Source Serif 4"') && [...document.fonts].some(f => f.family.includes('Source Serif 4') && f.status === 'loaded');
      // x of the decimal anchor = left edge of .v-frac (or right edge of .v-int if no frac slot)
      const cols = {};
      document.querySelectorAll('tbody tr').forEach(tr => {
        [...tr.querySelectorAll('td')].forEach((td, i) => {
          const a = td.querySelector('.v-frac') || td.querySelector('.v-int');
          const rect = a.getBoundingClientRect();
          (cols[i] = cols[i] || []).push(Math.round((td.querySelector('.v-frac') ? rect.left : rect.right) * 10) / 10);
        });
      });
      const text = [...document.querySelectorAll('tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim());
      const head = document.querySelector('thead tr').innerText.replace(/\s+/g, ' | ');
      const fv = getComputedStyle(document.querySelector('table')).fontVariantNumeric;
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const sc = document.querySelector('.table-scroll');
      return { fontOk, cols, text, head, fv, overflow, scroller: [sc.scrollWidth, sc.clientWidth], bg: getComputedStyle(document.body).backgroundColor };
    });
    console.log(w, scheme, JSON.stringify(r, null, 1), 'errors:', errs);
    await p.screenshot({ path: path.resolve(__dirname, `shot-${w}-${scheme}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
})();
