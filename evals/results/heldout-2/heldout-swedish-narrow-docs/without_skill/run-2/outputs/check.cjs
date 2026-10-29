(async()=>{
const { chromium, webkit } = require('playwright');
const url = 'file://' + process.cwd() + '/doc.html';
for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
  let b; try { b = await bt.launch(); } catch (e) { console.log(name, 'unavailable'); continue; }
  for (const w of [320, 360, 400]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(url);
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const lines = el => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      const over = [...document.querySelectorAll('.doc *')].filter(e => e.getBoundingClientRect().right > de.clientWidth + 0.5 && !e.closest('pre')).map(e => e.tagName + ':' + e.textContent.slice(0, 20));
      const vals = [...document.querySelectorAll('td:last-child')].map(td => td.textContent + '=' + lines(td));
      const names = [...document.querySelectorAll('td:first-child')].map(td => lines(td));
      const pre = document.querySelector('pre');
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, over, h1: lines(document.querySelector('h1')), h2: [...document.querySelectorAll('h2')].map(lines), vals, names, preScroll: pre.scrollWidth > pre.clientWidth, hyph: getComputedStyle(document.querySelector('h1')).hyphens };
    });
    console.log(name, w, JSON.stringify(r));
    await p.screenshot({ path: `shot-${name}-${w}.png`, fullPage: true });
    await p.close();
  }
  await b.close();
}
})();
