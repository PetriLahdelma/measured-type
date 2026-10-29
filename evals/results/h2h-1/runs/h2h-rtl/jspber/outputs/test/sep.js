// Does the crumb separator mirror? Compare implicit vs isolated-explicit, Arabic vs Latin content, per engine.
const { chromium, webkit } = require('playwright');
const path = require('path');
const variants = {
  implicit: `li+li::before{content:"›";margin:0 .5em}`,
  isolated: `li+li::before{content:"›";margin:0 .5em;direction:ltr;unicode-bidi:isolate}
             [dir=rtl] li+li::before{content:"‹"}`,
};
const contents = { latin: ['Help', 'Projects', 'Exporting'], arabic: ['مساعدة', 'المشاريع', 'التصدير'] };
(async () => {
  for (const [n, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await bt.launch(); const p = await b.newPage({ viewport: { width: 300, height: 40 }, deviceScaleFactor: 3 });
    for (const [vn, css] of Object.entries(variants)) for (const [cn, c] of Object.entries(contents)) {
      await p.setContent(`<html dir="rtl" lang="ar"><style>body{margin:8px;font:16px/1.6 system-ui,sans-serif}ol{list-style:none;display:flex;margin:0;padding:0}${css}</style><ol><li><a href="#">${c[0]}</a></li><li><a href="#">${c[1]}</a></li><li>${c[2]}</li></ol></html>`);
      const f = path.join(__dirname, 'shots', `sep-${n}-${vn}-${cn}.png`);
      await p.screenshot({ path: f }); console.log(f);
    }
    await b.close();
  }
})();
