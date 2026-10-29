const { chromium } = require('playwright');
const path = require('path');
const variants = {
  v5: '.crumbs li + li::before{display:inline-block;unicode-bidi:normal;direction:ltr}',
  v6: '.crumbs li + li::before{unicode-bidi:isolate;direction:ltr;margin-inline:0} ',
  v7: '.crumbs li + li::before{unicode-bidi:bidi-override;direction:ltr}',
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 120 }, deviceScaleFactor: 3 });
  for (const [k, css] of Object.entries(variants)) {
    await p.goto('file://' + path.resolve(__dirname, 'ar.html'));
    await p.addStyleTag({ content: css });
    await p.screenshot({ path: path.resolve(__dirname, `crumb-${k}.png`), clip: { x: 560, y: 20, width: 230, height: 40 } });
  }
  // english pixel check for v5
  const shots = [];
  for (const f of ['en-old', 'en-new']) {
    await p.goto('file://' + path.resolve(__dirname, f + '.html'));
    if (f === 'en-new') await p.addStyleTag({ content: variants.v5 });
    shots.push(await p.screenshot({ fullPage: true }));
  }
  console.log('v5 english identical:', Buffer.compare(shots[0], shots[1]) === 0);
  await b.close();
})();
