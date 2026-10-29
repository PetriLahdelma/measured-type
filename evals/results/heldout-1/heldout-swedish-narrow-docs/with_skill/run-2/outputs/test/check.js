const { chromium, webkit } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '..', 'doc.html');
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await bt.launch();
    for (const w of [320, 360, 375, 400]) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.goto(file);
      const r = await page.evaluate(() => {
        const out = {};
        out.scrollW = document.documentElement.scrollWidth;
        out.clientW = document.documentElement.clientWidth;
        const docR = document.querySelector('.doc').getBoundingClientRect();
        const contentRight = docR.right - 16;
        out.overflow = [...document.querySelectorAll('.doc *')].filter(e => e.getBoundingClientRect().right > contentRight + 0.5).map(e => e.tagName + ':' + e.textContent.slice(0, 20));
        // line breaks per element (text split by line)
        function lines(el) {
          const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let res = [], cur = '', top = null, n;
          while ((n = tw.nextNode())) {
            for (let i = 0; i < n.length; i++) {
              const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
              const rc = rg.getClientRects()[0]; if (!rc) { cur += n.data[i]; continue; }
              if (top !== null && rc.top > top + rc.height / 2) { res.push(cur); cur = ''; }
              if (top === null || rc.top > top + rc.height / 2) top = rc.top;
              cur += n.data[i];
            }
          }
          res.push(cur); return res;
        }
        out.h1 = lines(document.querySelector('h1'));
        out.h2 = [...document.querySelectorAll('h2')].map(lines);
        out.p = [...document.querySelectorAll('.doc > p')].map(lines);
        out.li = [...document.querySelectorAll('li')].map(lines);
        out.pre = lines(document.querySelector('pre'));
        out.rows = [...document.querySelectorAll('tr')].map(tr => [...tr.cells].map(c => lines(c).join(' | ')));
        const h2 = document.querySelectorAll('h2');
        out.gapsAfterH2 = [...h2].map(h => Math.round(h.nextElementSibling.getBoundingClientRect().top - h.getBoundingClientRect().bottom));
        out.gapsBeforeH2 = [...h2].map(h => Math.round(h.getBoundingClientRect().top - h.previousElementSibling.getBoundingClientRect().bottom));
        out.hyph = getComputedStyle(document.querySelector('p')).hyphens || getComputedStyle(document.querySelector('p')).webkitHyphens;
        out.h1size = getComputedStyle(document.querySelector('h1')).fontSize;
        return out;
      });
      console.log(`\n== ${name} ${w}px  scroll ${r.scrollW}/${r.clientW} overflow=${JSON.stringify(r.overflow)} hyphens=${r.hyph} h1=${r.h1size}`);
      console.log('h1', JSON.stringify(r.h1));
      console.log('h2', JSON.stringify(r.h2));
      console.log('pre', JSON.stringify(r.pre));
      console.log('rows', JSON.stringify(r.rows));
      console.log('gaps before/after h2', r.gapsBeforeH2, r.gapsAfterH2);
      if (w === 320) { console.log('p', JSON.stringify(r.p, null, 0)); console.log('li', JSON.stringify(r.li)); }
      await page.screenshot({ path: path.join(__dirname, `${name}-${w}.png`), fullPage: true });
      await page.close();
    }
    await browser.close();
  }
})();
