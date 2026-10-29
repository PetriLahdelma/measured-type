const { chromium, webkit } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'doc.html');
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await bt.launch();
    const page = await browser.newPage({ viewport: { width: 320, height: 900 }, colorScheme: 'dark' });
    await page.goto(url);
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }' });
    const r = await page.evaluate(() => ({ pageScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    console.log(name, '1.4.12 overrides at 320 (dark):', JSON.stringify(r));
    await page.screenshot({ path: path.join(__dirname, `${name}-wcag-dark.png`), fullPage: true });
    await browser.close();
  }
})();
