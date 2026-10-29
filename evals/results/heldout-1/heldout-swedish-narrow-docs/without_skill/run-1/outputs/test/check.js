const { chromium, webkit } = require('playwright');
const path = require('path');
(async () => {
  const url = 'file://' + path.resolve(__dirname, '..', 'doc.html');
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    let browser;
    try { browser = await bt.launch(); } catch (e) { console.log(name, 'unavailable:', e.message.split('\n')[0]); continue; }
    for (const w of [320, 360, 400]) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2 });
      await page.goto(url);
      const r = await page.evaluate(() => {
        const doc = document.documentElement;
        const art = document.querySelector('.doc');
        const cw = art.clientWidth - 32;
        const over = [];
        for (const el of art.querySelectorAll('*')) {
          const b = el.getBoundingClientRect();
          if (b.right > art.getBoundingClientRect().right - 16 + 0.5 || el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline')
            over.push(el.tagName + ':' + Math.round(b.right) + '/' + el.scrollWidth + '>' + el.clientWidth);
        }
        const lh = el => { const s = getComputedStyle(el); return Math.round(el.getBoundingClientRect().height / parseFloat(s.lineHeight)); };
        const vals = [...document.querySelectorAll('td:last-child')].map(td => td.getClientRects().length + ':' + Math.round(td.getBoundingClientRect().height));
        return { pageScroll: doc.scrollWidth - doc.clientWidth, over, h1Lines: lh(document.querySelector('h1')), h2Lines: [...document.querySelectorAll('h2')].map(lh), h1Font: getComputedStyle(document.querySelector('h1')).fontSize, valHeights: vals, labels: [...document.querySelectorAll('td:first-child')].map(td=>Math.round(td.getBoundingClientRect().width)) };
      });
      console.log(name, w, JSON.stringify(r));
      await page.screenshot({ path: path.join(__dirname, `${name}-${w}.png`), fullPage: true });
      await page.close();
    }
    await browser.close();
  }
})();
