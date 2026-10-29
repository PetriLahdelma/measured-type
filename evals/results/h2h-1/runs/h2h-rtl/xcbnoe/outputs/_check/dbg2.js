const { chromium } = require('playwright');
const path = require('path');
const variants = {
  v1: '',
  v2: '[dir="rtl"] .crumbs li + li::before{unicode-bidi:normal;direction:inherit}',
  v3: '.crumbs ol{display:block} .crumbs li{display:inline}',
  v4: '[dir="rtl"] .crumbs li + li::before{content:"\\203A";unicode-bidi:normal;direction:inherit}',
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 120 }, deviceScaleFactor: 3 });
  for (const [k, css] of Object.entries(variants)) {
    await p.goto('file://' + path.resolve(__dirname, 'ar.html'));
    if (css) await p.addStyleTag({ content: css });
    await p.screenshot({ path: path.resolve(__dirname, `crumb-${k}.png`), clip: { x: 560, y: 20, width: 230, height: 40 } });
  }
  await b.close();
})();
