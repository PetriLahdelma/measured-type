const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const url = 'file://' + path.resolve(__dirname, '../report.html');
  for (const [w,h,name] of [[1024,700,'desktop'],[375,700,'mobile']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('requestfailed', r=>errs.push('fail '+r.url()));
    await p.goto(url); await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const loaded = [...document.fonts].map(f => f.family + ':' + f.status);
      const check = document.fonts.check('16px "Source Serif 4"');
      const rows = [...document.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent));
      // right edge of the integer part: measure position of visible text end for each numeric cell
      const cols = [1,2,3,4].map(i => [...document.querySelectorAll('tbody tr')].map(tr => {
        const td = tr.children[i]; const rg = document.createRange();
        const tn = [...td.querySelectorAll('*'), td].flatMap(n => [...n.childNodes]).find(n => n.nodeType===3 && /\d/.test(n.textContent));
        rg.selectNodeContents(tn); return Math.round(rg.getBoundingClientRect().right*10)/10;
      }));
      return { loaded, check, rows, cols, scrollW: document.documentElement.scrollWidth, tableW: document.querySelector('table').scrollWidth, regionW: document.querySelector('.table-scroll').clientWidth, ff: getComputedStyle(document.querySelector('td')).fontVariantNumeric };
    });
    console.log(name, JSON.stringify(r, null, 0), errs);
    await p.screenshot({ path: path.join(__dirname, name + '.png'), fullPage: true });
  }
  await b.close();
})();
