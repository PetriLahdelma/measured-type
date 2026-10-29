const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, z] of [[1040,1],[1440,1],[1280,1],[1000,1],[800,1],[1280,2],[375,1],[1280,4]]) {
    const ctx = await b.newContext({ viewport: { width: Math.round(w / z), height: 900 }, deviceScaleFactor: z });
    const p = await ctx.newPage();
    await p.goto('file://' + process.cwd() + '/essay.html');
    const r = await p.evaluate(() => {
      const box = s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; };
      return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
        prose: box('.prose'), notes: box('.notes'), p1: box('.prose p'), n1: box('.notes p') };
    });
    console.log(w, z, JSON.stringify(r));
    if (w === 1280 && z === 1) await p.screenshot({ path: 'shot-1280.png', fullPage: true });
    if (w === 375) await p.screenshot({ path: 'shot-375.png', fullPage: true });
    await ctx.close();
  }
  await b.close();
})();
