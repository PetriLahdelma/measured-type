const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('file://' + path.resolve(__dirname, '../report.html')); await p.evaluate(() => document.fonts.ready);
  console.log(await p.evaluate(() => [...document.querySelectorAll('td.change .unit')].map(u => {
    const vis = u.querySelector('[aria-hidden]'); return { box: u.getBoundingClientRect().width.toFixed(1), text: vis && vis.textContent, textW: vis ? vis.getBoundingClientRect().width.toFixed(1) : 0 }; })));
  // data integrity: change equals Q3 vs Q2
  console.log(await p.evaluate(() => [...document.querySelectorAll('#results tbody tr')].map(tr => {
    const v = [...tr.querySelectorAll('.num')].map(n => +n.dataset.value); const [,q2,q3,ch] = v;
    const rel = +((q3/q2 - 1)*100).toFixed(1), abs = +(q3 - q2).toFixed(1);
    return tr.querySelector('th').textContent + ': shown ' + ch + ', relative ' + rel + ', absolute ' + abs; })));
  await p.screenshot({ path: path.join(__dirname, 'shot-units.png'), clip: { x: 280, y: 340, width: 720, height: 230 } });
  await b.close();
})();
