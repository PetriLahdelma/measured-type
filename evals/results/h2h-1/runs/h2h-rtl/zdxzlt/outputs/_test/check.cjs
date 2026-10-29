(async () => {
const { chromium, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const url = f => 'file://' + path.join(dir, f);
const report = {};
for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
  let browser;
  try { browser = await bt.launch(); } catch (e) { report[name] = 'launch failed: ' + e.message.split('\n')[0]; continue; }
  const out = report[name] = {};
  for (const w of [320, 800]) {
    const page = await browser.newPage({ viewport: { width: w, height: 700 } });
    const shots = {};
    for (const f of ['en-orig.html', 'en-new.html']) {
      await page.goto(url(f)); shots[f] = await page.screenshot({ fullPage: true });
    }
    out[`en identical @${w}`] = Buffer.compare(shots['en-orig.html'], shots['en-new.html']) === 0;
    for (const f of ['ar.html', 'en-text-rtl.html']) {
      await page.goto(url(f));
      await page.screenshot({ path: path.join(dir, `${name}-${f.replace('.html','')}-${w}.png`), fullPage: true });
      out[`${f} @${w}`] = await page.evaluate(() => {
        const r = el => el.getBoundingClientRect();
        const lis = [...document.querySelectorAll('.crumbs li')].map(li => Math.round(r(li).left));
        const h2 = document.querySelector('.title h2'), tag = document.querySelector('.tag'), note = document.querySelector('.note'), steps = document.querySelector('.steps');
        const cs = (el, p, pseudo) => getComputedStyle(el, pseudo).getPropertyValue(p);
        const docW = document.documentElement.scrollWidth, vw = innerWidth;
        // overlap check between heading text and tag
        const range = document.createRange(); range.selectNodeContents(h2);
        const rects = [...range.getClientRects()], tr = r(tag);
        const overlap = rects.some(x => !(x.right <= tr.left || x.left >= tr.right || x.bottom <= tr.top || x.top >= tr.bottom));
        return {
          crumbLefts: lis, tagLeft: Math.round(tr.left), tagRight: Math.round(tr.right), h2Align: cs(h2,'text-align'), h2Pad: [cs(h2,'padding-left'), cs(h2,'padding-right')],
          noteBorder: [cs(note,'border-left-width'), cs(note,'border-right-width')], notePad: [cs(note,'padding-left'), cs(note,'padding-right')],
          stepsPad: [cs(steps,'padding-left'), cs(steps,'padding-right')], listStyle: cs(steps,'list-style-type'),
          sep: cs(document.querySelector('.crumbs li + li'),'content','::before'), next: cs(document.querySelector('.next'),'content','::after'),
          horizontalOverflow: docW > vw, headingTagOverlap: overlap,
        };
      });
    }
    await page.close();
  }
  await browser.close();
}
console.log(JSON.stringify(report, null, 1));
})();
