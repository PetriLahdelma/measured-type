import { chromium, webkit } from 'playwright';
import path from 'node:path';
const url = 'file://' + path.resolve('doc.html');
for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await bt.launch();
  for (const w of [320, 360, 400]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    await p.goto(url);
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const over = [...document.querySelectorAll('.doc *')].filter(e => {
        if (e.closest('pre')) return false;
        const rc = e.getBoundingClientRect(); return rc.right > de.clientWidth + 0.5 || e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible' && e.tagName !== 'CODE';
      }).map(e => e.tagName + ':' + e.textContent.slice(0, 30));
      const h1 = document.querySelector('h1');
      const lines = el => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      const tds = [...document.querySelectorAll('td:last-child')].map(td => td.textContent + '|' + lines(td));
      const labels = [...document.querySelectorAll('td:first-child')].map(td => lines(td));
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, over, h1Lines: lines(h1), h1fs: getComputedStyle(h1).fontSize, h2Lines: [...document.querySelectorAll('h2')].map(lines), tds, labels };
    });
    console.log(name, w, JSON.stringify(r));
    await p.screenshot({ path: `test/${name}-${w}.png`, fullPage: true });
    await p.close();
  }
  await b.close();
}
