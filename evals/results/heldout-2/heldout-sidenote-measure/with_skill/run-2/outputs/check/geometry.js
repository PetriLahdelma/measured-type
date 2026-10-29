const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const url = 'file://' + path.resolve(__dirname, '../essay.html');
  for (const [w, z, spacing] of [[1440,1,0],[1024,1,0],[1000,1,0],[1280,2,0],[375,1,0],[320,1,0],[320,1,1],[1440,1,1]]) {
    const p = await b.newPage({ viewport: { width: Math.round(w/z), height: 900 }, deviceScaleFactor: z });
    await p.goto(url);
    if (spacing) await p.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p{margin-block-end:2em!important}' });
    const r = await p.evaluate(() => {
      const q = s => document.querySelector(s).getBoundingClientRect();
      const a = q('.prose'), n = q('.notes'), p1 = q('.prose h1 + p'), h = q('.prose h1');
      return {
        overflowX: document.documentElement.scrollWidth - innerWidth,
        prose: [Math.round(a.left), Math.round(a.width)],
        notes: [Math.round(n.left), Math.round(n.top), Math.round(n.width)],
        firstP_top: Math.round(p1.top), h1_h: Math.round(h.height),
        sideBySide: n.top < a.bottom && n.left > a.right,
      };
    });
    console.log(w, 'zoom', z, spacing ? '1.4.12' : '', JSON.stringify(r));
    if (!spacing && (w===1440||w===320||w===1000)) await p.screenshot({ path: path.join(__dirname, `shot-${w}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
})();
