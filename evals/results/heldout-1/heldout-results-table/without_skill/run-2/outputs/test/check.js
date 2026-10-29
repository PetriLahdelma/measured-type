const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const url = 'file://' + path.resolve(__dirname, '../report.html');
  for (const [name, w] of [['desktop', 1100], ['mobile', 375]]) {
    const p = await b.newPage({ viewport: { width: w, height: 800 } });
    const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
    const failed = []; p.on('requestfailed', r => failed.push(r.url()));
    await p.goto(url); await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const loaded = [...document.fonts].map(f => f.family + ':' + f.status);
      const rows = [...document.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent));
      const fvn = getComputedStyle(document.querySelector('td')).fontVariantNumeric;
      // right edges of change-value number spans (alignment of digits)
      const edges = [...document.querySelectorAll('.change-value > span:first-child')].map(s => Math.round(s.getBoundingClientRect().right));
      const qEdges = [...document.querySelectorAll('tbody td.num:not(.change)')].map(td => Math.round(td.getBoundingClientRect().right));
      return { loaded, rows, fvn, edges, qEdges, hscroll: document.documentElement.scrollWidth > innerWidth, check: document.fonts.check('16px "Source Serif 4"') };
    });
    console.log(name, JSON.stringify(r), 'errors', errs, 'failed', failed);
    await p.screenshot({ path: path.join(__dirname, name + '.png'), fullPage: true });
  }
  await b.close();
})();
