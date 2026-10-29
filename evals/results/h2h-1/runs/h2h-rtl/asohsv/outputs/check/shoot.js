const { chromium, firefox, webkit } = require('playwright');
const path = require('path');
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit], ['firefox', firefox]]) {
    let b; try { b = await bt.launch(); } catch (e) { console.log(name, 'unavailable'); continue; }
    const p = await b.newPage({ viewport: { width: 700, height: 520 } });
    const bufs = {};
    for (const f of ['en-orig', 'en', 'ar']) {
      await p.goto('file://' + path.join(__dirname, f + '.html'));
      bufs[f] = await p.screenshot({ path: path.join(__dirname, `${name}-${f}.png`) });
      if (f === 'ar') {
        const r = await p.evaluate(() => {
          const box = s => document.querySelector(s).getBoundingClientRect();
          const cs = (s, pr) => getComputedStyle(document.querySelector(s), pr || null);
          return {
            vw: innerWidth,
            h2: box('.title h2'), tag: box('.tag'),
            noteBorderR: cs('.note').borderRightWidth, noteBorderL: cs('.note').borderLeftWidth,
            stepsPadR: cs('.steps').paddingRight, h2PadL: cs('.title h2').paddingLeft,
            nextAfter: cs('.next', '::after').content, sep: cs('.crumbs li + li', '::before').content,
            main: box('.help'),
          };
        });
        console.log(name, JSON.stringify(r));
      }
    }
    console.log(name, 'EN identical:', Buffer.compare(bufs['en-orig'], bufs['en']) === 0);
    await b.close();
  }
})();
