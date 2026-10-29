const { chromium, webkit } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '..', 'doc.html');
(async () => { for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) { const b = await bt.launch();
 for (const [w, z] of [[320,1],[1280,4]]) {
  const p = await b.newPage({ viewport: { width: w/z, height: 800 }, deviceScaleFactor: z });
  await p.goto(file);
  await p.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important} p{margin-block-end:2em!important}' });
  const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    clipped: [...document.querySelectorAll('.doc *')].filter(e => e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && getComputedStyle(e).display !== 'inline').map(e => e.tagName) }));
  console.log(name, `${w/z}px spacing-override`, r); await p.screenshot({ path: path.join(__dirname, `${name}-spacing-${w/z}.png`), fullPage: true }); await p.close(); }
 await b.close(); } })();
