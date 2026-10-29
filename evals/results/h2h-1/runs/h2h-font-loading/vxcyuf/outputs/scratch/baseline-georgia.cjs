const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve('article.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const res = await page.evaluate(async () => {
    const art = document.querySelector('article');
    const web = art.cloneNode(true); web.id = 'w';
    const fb = art.cloneNode(true); fb.id = 'f';
    fb.style.fontFamily = 'Georgia';
    document.body.append(web, fb);
    const results = [];
    for (let sa = 100; sa <= 100; sa += 1) {
      const st = document.createElement('style');
      st.textContent = `@font-face{font-family:TestFB;src:local("Georgia");size-adjust:${sa}%;ascent-override:${103.6/sa*100}%;descent-override:${33.5/sa*100}%;line-gap-override:0%}
      @font-face{font-family:TestFB;src:local("Georgia Italic");font-style:italic;size-adjust:93.26%;ascent-override:111.09%;descent-override:35.92%;line-gap-override:0%}
      @font-face{font-family:TestFB;src:local("Georgia Bold");font-weight:700;size-adjust:86.07%;ascent-override:120.37%;descent-override:38.92%;line-gap-override:0%}`;
      document.head.append(st);
      await document.fonts.load(`18px TestFB`); await document.fonts.load(`italic 18px TestFB`); await document.fonts.load(`bold 36px TestFB`);
      let mism = 0, total = 0, heightDiffWidths = 0;
      for (let w = 288; w <= 576; w += 1) {
        web.style.inlineSize = fb.style.inlineSize = w + 'px';
        const a = [...web.children].map(e => e.getBoundingClientRect().height);
        const b = [...fb.children].map(e => e.getBoundingClientRect().height);
        let any = false;
        a.forEach((h, i) => { total++; if (Math.abs(h - b[i]) > 0.5) { mism++; any = true; } });
        if (any) heightDiffWidths++;
      }
      results.push({ sa: +sa.toFixed(2), mism, heightDiffWidths, widths: 289 });
      st.remove();
    }
    return results;
  });
  console.log(res.map(r => `${r.sa}%: ${r.heightDiffWidths}/${r.widths} widths shift (${r.mism} block mismatches)`).join('\n'));
  await browser.close();
})();
