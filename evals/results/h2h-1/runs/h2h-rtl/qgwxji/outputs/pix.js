const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 700, 1200]) {
    const p = await b.newPage({ viewport: { width: w, height: 700 } });
    await p.goto('file://' + __dirname + '/help.html'); const a = await p.screenshot({ fullPage: true });
    await p.goto('file://' + __dirname + '/ltr-check.html'); const c = await p.screenshot({ fullPage: true });
    await p.goto('file://' + __dirname + '/rtl-check.html'); await p.screenshot({ path: __dirname + `/shot-ar-${w}.png`, fullPage: true });
    const ov = await p.evaluate(() => { const h = document.querySelector('.title h2').getBoundingClientRect(), t = document.querySelector('.tag').getBoundingClientRect();
      const r = document.createRange(); r.selectNodeContents(document.querySelector('.title h2')); const tx = r.getBoundingClientRect();
      return { textLeft: Math.round(tx.left), tagRight: Math.round(t.right), overlap: tx.left < t.right && tx.top < t.bottom }; });
    console.log(w, 'EN pixel-identical:', a.equals(c), 'AR title/tag', JSON.stringify(ov));
    await p.close();
  }
  await b.close();
})();
