// Total set width of each block on one line, and where the baseline sits, web vs matched fallback.
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'article.html');
async function run(browser, block) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  if (block) await page.route('**/*.ttf', (r) => r.abort());
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.prose > *')];
    // baseline: insert a zero-size inline-block at the start of each block
    const base = els.map((el) => { const s = document.createElement('span'); s.style.cssText = 'display:inline-block;width:0;height:0'; el.prepend(s); const y = s.getBoundingClientRect().bottom - el.getBoundingClientRect().top; s.remove(); return y; });
    els.forEach((el) => { el.style.whiteSpace = 'nowrap'; el.style.width = 'max-content'; });
    return els.map((el, i) => ({ tag: el.tagName, w: el.getBoundingClientRect().width, base: base[i] }));
  });
  await page.close(); return r;
}
(async () => {
  const b = await chromium.launch();
  const web = await run(b, false), fb = await run(b, true);
  web.forEach((x, i) => console.log(x.tag, 'width web', x.w.toFixed(1), 'fallback', fb[i].w.toFixed(1), 'diff', ((fb[i].w / x.w - 1) * 100).toFixed(2) + '%', '| first baseline web', x.base.toFixed(2), 'fallback', fb[i].base.toFixed(2)));
  await b.close();
})();
