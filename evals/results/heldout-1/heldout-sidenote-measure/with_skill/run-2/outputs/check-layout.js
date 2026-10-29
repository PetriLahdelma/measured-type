const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, z] of [[1280,1],[944,1],[930,1],[375,1],[1280,2],[1280,4]]) {
    const p = await b.newPage({ viewport: { width: Math.round(w / z), height: 800 }, deviceScaleFactor: z });
    await p.goto('file://' + __dirname + '/essay.html');
    const r = await p.evaluate(() => {
      const box = s => { const e = document.querySelector(s).getBoundingClientRect(); return [Math.round(e.left), Math.round(e.top), Math.round(e.width)]; };
      return { vw: innerWidth, scrollX: document.documentElement.scrollWidth > innerWidth,
        prose: box('.prose'), notes: box('.notes'), h1: box('.prose h1'), p1: box('.prose > p'), n1: box('.notes > p'),
        h1h: document.querySelector('.prose h1').getBoundingClientRect().height };
    });
    console.log(w, 'zoom', z, JSON.stringify(r));
    if (w === 1280 && z === 1) await p.screenshot({ path: __dirname + '/shot-1280.png', fullPage: true });
    if (w === 375) await p.screenshot({ path: __dirname + '/shot-375.png', fullPage: true });
    await p.close();
  }
  await b.close();
})();
