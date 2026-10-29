const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const file = 'file://' + path.resolve(__dirname, '..', 'report.html');
  for (const w of [1024, 320]) {
    const p = await b.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2 });
    const errs = []; p.on('console', m => m.type()==='error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
    await p.goto(file); await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const fonts = [...document.fonts].map(f => f.family + ':' + f.status);
      const used = document.fonts.check('16px "Source Serif 4"');
      const rows = [...document.querySelectorAll('tbody tr')].map(tr => {
        const tds = [...tr.querySelectorAll('td')];
        const pad=tr.querySelector(".delta .u").getBoundingClientRect().left; const frac=pad;
        const intR = tr.querySelector('td.change').getBoundingClientRect().right;
        return { text: tr.innerText.replace(/\s+/g,' '), rights: tds.slice(0,3).map(t => Math.round(t.getBoundingClientRect().right)), fracLeft: frac.toFixed(2), intRight: intR.toFixed(2) };
      });
      return { fonts, used, rows, scrollW: document.documentElement.scrollWidth, wrapScroll: document.querySelector('.table-wrap').scrollWidth - document.querySelector('.table-wrap').clientWidth, numVariant: getComputedStyle(document.querySelector('td')).fontVariantNumeric };
    });
    console.log(w, JSON.stringify(r, null, 1), errs);
    await p.screenshot({ path: path.join(__dirname, `shot-${w}.png`), fullPage: true });
  }
  await b.close();
})();
// scrolled-end + dark shot
(async () => {
  const { chromium } = require('playwright'); const path=require('path');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await p.goto('file://' + path.resolve(__dirname, '..', 'report.html')); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { const w=document.querySelector('.table-wrap'); w.scrollLeft = w.scrollWidth; });
  await p.screenshot({ path: path.join(__dirname, 'shot-320-dark-scrolled.png') });
  await b.close();
})();
