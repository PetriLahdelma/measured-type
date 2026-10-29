const { chromium, webkit } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '..', 'doc.html');
(async () => { for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) { const b = await bt.launch();
 for (const af of [4, 7, 10, 12]) for (const w of [320, 360, 400]) {
  const p = await b.newPage({ viewport: { width: w, height: 600 } }); await p.goto(file);
  await p.addStyleTag({ content: `.doc :is(h1,h2){hyphenate-limit-chars:auto 4 ${af};-webkit-hyphenate-limit-after:${af}}` });
  for (const sel of ['h1','h2']) { await (await p.$(sel)).screenshot({ path: path.join(__dirname, `h-${name}-${af}-${w}-${sel}.png`) }); }
  await p.close(); }
 await b.close(); } })();
