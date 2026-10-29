// Real swap: hold the font files back 1.5 s, record layout shifts while they arrive.
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'article.html');
(async () => {
  const b = await chromium.launch();
  for (const width of [360, 1280]) {
    for (const mode of ['matched', 'plain Georgia']) {
      const p = await b.newPage({ viewport: { width, height: 800 } });
      await p.route('**/*.ttf', async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); r.continue(); });
      await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
      if (mode !== 'matched') await p.route('**/fonts.css', async (r) => { const css = require('fs').readFileSync(path.resolve(__dirname, '..', 'fonts.css'), 'utf8').replace(/"Source Serif 4 Fallback", /, ''); r.fulfill({ contentType: 'text/css', body: css }); });
      await p.goto(url);
      const before = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
      await p.waitForTimeout(2500);
      const after = await p.evaluate(() => ({ cls: window.__cls, loaded: [...document.fonts].filter((f) => f.status === 'loaded' && f.family === 'Source Serif 4').length }));
      console.log(`${width}px ${mode.padEnd(14)} web faces loaded after swap: ${after.loaded}  CLS: ${after.cls.toFixed(4)}`);
      await p.close();
    }
  }
  await b.close();
})();
