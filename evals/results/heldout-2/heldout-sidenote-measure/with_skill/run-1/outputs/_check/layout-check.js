const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const file = 'file://' + path.resolve(__dirname, '..', 'essay.html');
  for (const [w, z] of [[1440,1],[1280,1],[960,1],[959,1],[1280,2],[375,1],[320,1]]) {
    const p = await b.newPage({ viewport: { width: Math.round(w / z), height: 800 }, deviceScaleFactor: z });
    await p.goto(file);
    const r = await p.evaluate(() => {
      const box = s => document.querySelector(s).getBoundingClientRect();
      const a = box('.prose'), n = box('.notes'), p1 = box('.prose > p'), np = box('.notes > p');
      return { sideBySide: n.left > a.right, gap: Math.round(n.left - a.right), proseW: Math.round(a.width), notesW: Math.round(n.width),
        noteTopVsFirstP: Math.round(np.top - p1.top), hScroll: document.documentElement.scrollWidth > innerWidth,
        leftMargin: Math.round(a.left) };
    });
    console.log(`${w}px zoom ${z}:`, JSON.stringify(r));
    if (w === 1280 && z === 1) await p.screenshot({ path: path.join(__dirname, 'wide.png'), fullPage: true });
    if (w === 375) await p.screenshot({ path: path.join(__dirname, 'phone.png'), fullPage: true });
    await p.close();
  }
  await b.close();
})();
