const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const shots = {};
  for (const f of ['en-old', 'en-new', 'ar']) {
    await p.goto('file://' + path.resolve(__dirname, f + '.html'));
    shots[f] = await p.screenshot({ path: path.resolve(__dirname, f + '.png'), fullPage: true });
    const geo = await p.evaluate(() => {
      const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top) }; };
      const cs = (s, ps, prop) => getComputedStyle(document.querySelector(s), ps).getPropertyValue(prop);
      return {
        h2: r('.title h2'), tag: r('.tag'), noteBorderL: cs('.note', null, 'border-left-width'), noteBorderR: cs('.note', null, 'border-right-width'),
        stepsPadL: cs('.steps', null, 'padding-left'), stepsPadR: cs('.steps', null, 'padding-right'),
        h2PadR: cs('.title h2', null, 'padding-right'), h2PadL: cs('.title h2', null, 'padding-left'),
        firstCrumb: r('.crumbs li:first-child'), lastCrumb: r('.crumbs li:last-child'),
        nextAfter: cs('.next', '::after', 'content'), bodyLH: cs('body', null, 'line-height'),
      };
    });
    console.log(f, JSON.stringify(geo));
  }
  console.log('en identical bytes:', Buffer.compare(shots['en-old'], shots['en-new']) === 0);
  await b.close();
})();
