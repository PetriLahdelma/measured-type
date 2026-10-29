const { chromium, webkit } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'doc.html');
const shots = process.argv.includes('--shots');
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    let browser;
    try { browser = await bt.launch(); } catch (e) { console.log(name, 'unavailable:', e.message.split('\n')[0]); continue; }
    for (const w of [320, 360, 375, 400]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(url);
      const r = await page.evaluate(() => {
        const de = document.documentElement;
        const out = { pageScroll: de.scrollWidth - de.clientWidth, overflow: [] };
        const doc = document.querySelector('.doc');
        const box = doc.getBoundingClientRect();
        const cs = getComputedStyle(doc);
        const left = box.left + parseFloat(cs.paddingLeft), right = box.right - parseFloat(cs.paddingRight);
        for (const el of doc.querySelectorAll('*')) {
          const b = el.getBoundingClientRect();
          if (b.right > right + 0.5 || b.left < left - 0.5) out.overflow.push(el.tagName + ' ' + Math.round(b.left) + '-' + Math.round(b.right));
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') out.overflow.push('scroll:' + el.tagName);
        }
        const lines = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
        out.h1 = lines(document.querySelector('h1'));
        out.h2 = [...document.querySelectorAll('h2')].map(lines);
        out.pre = lines(document.querySelector('pre code')) ;
        out.cols = [...document.querySelectorAll('tbody tr')].map(tr => [...tr.cells].map(c => Math.round(c.getBoundingClientRect().height/24)).join('/')).join(' ');
        // gap under h2 to next block top
        const h2 = document.querySelector('h2'); out.gapUnderH2 = Math.round(h2.nextElementSibling.getBoundingClientRect().top - h2.getBoundingClientRect().bottom);
        out.textW = Math.round(right - left);
        return out;
      });
      console.log(name, w, JSON.stringify(r));
      if (shots) await page.screenshot({ path: path.join(__dirname, `${name}-${w}.png`), fullPage: true });
      await page.close();
    }
    await browser.close();
  }
})();
