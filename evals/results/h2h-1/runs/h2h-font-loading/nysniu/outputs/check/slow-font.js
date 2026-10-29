// Delays the font files by 1.5s (a slow first visit) and records the article
// layout and rendered family before and after they finish downloading, plus
// the layout-shift entries the browser itself reports.
const path = require('path');
const { chromium, webkit } = require('playwright');
const url = 'file://' + path.resolve(__dirname, '..', 'article.html');
const snap = () => ({
  rects: [...document.querySelectorAll('.prose > *')].map((el) => { const r = el.getBoundingClientRect(); return [r.top, r.height].map((v) => +v.toFixed(2)); }),
  ss4: document.fonts.check('18px "Source Serif 4"'),
  faces: [...document.fonts].filter((f) => /^"?Source Serif 4"?$/.test(f.family)).map((f) => f.style + ':' + f.status),
  cls: (window.__cls || 0).toFixed(4),
});
(async () => {
  for (const type of [chromium, webkit]) {
    const browser = await type.launch();
    for (const delay of [0, 1500]) {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await page.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch {} });
      await page.route(/\.ttf$/, async (r) => { if (delay) await new Promise((res) => setTimeout(res, delay)); await r.continue(); });
      await page.goto(url);
      await page.waitForTimeout(300);
      const early = await page.evaluate(snap);
      await page.waitForTimeout(delay + 1500);
      const late = await page.evaluate(snap);
      const moved = JSON.stringify(early.rects) !== JSON.stringify(late.rects);
      console.log(`${type.name().padEnd(8)} font delay ${delay}ms: at 0.3s SS4=${early.ss4}; after load SS4=${late.ss4} faces=${late.faces.join(',')} layout moved=${moved} CLS=${late.cls}`);
      await page.close();
    }
    await browser.close();
  }
})();
