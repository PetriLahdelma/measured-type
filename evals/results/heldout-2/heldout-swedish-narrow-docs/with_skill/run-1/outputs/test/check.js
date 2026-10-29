const { chromium, webkit } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../doc.html');
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    let b; try { b = await bt.launch(); } catch (e) { console.log(name, 'unavailable'); continue; }
    for (const w of [320, 360, 400]) {
      const p = await b.newPage({ viewport: { width: w, height: 900 } });
      await p.goto(file);
      const r = await p.evaluate(() => {
        const de = document.documentElement;
        const over = [...document.querySelectorAll('.doc *')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' || e.getBoundingClientRect().right > de.clientWidth + 0.5).map(e => e.tagName);
        const lines = el => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
        const vals = [...document.querySelectorAll('td:last-child')].map(td => [td.textContent, td.getClientRects().length, Math.round(td.getBoundingClientRect().height)]);
        return { hscroll: de.scrollWidth > de.clientWidth, over, h1: [getComputedStyle(document.querySelector('h1')).fontSize, lines(document.querySelector('h1'))], valueCellHeights: vals.map(v => v[0] + ':' + v[2]), labelW: Math.round(document.querySelector('td').getBoundingClientRect().width) };
      });
      console.log(name, w, JSON.stringify(r));
      await p.screenshot({ path: path.join(__dirname, `${name}-${w}.png`), fullPage: true });
      await p.close();
    }
    await b.close();
  }
})();
