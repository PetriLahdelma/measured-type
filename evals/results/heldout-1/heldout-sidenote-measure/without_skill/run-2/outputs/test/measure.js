const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const file = 'file://' + path.resolve(__dirname, '../essay.html');
  for (const [w, zoom] of [[320,1],[375,1],[768,1],[960,1],[992,1],[1024,1],[1280,1],[1440,1],[1920,1],[1280,2]]) {
    const ctx = await browser.newContext({ viewport: { width: Math.round(w/zoom), height: 900 }, deviceScaleFactor: zoom });
    const page = await ctx.newPage();
    await page.goto(file);
    const r = await page.evaluate(() => {
      function lines(sel) {
        const counts = [];
        document.querySelectorAll(sel).forEach(p => {
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          let n, map = new Map();
          while ((n = walker.nextNode())) {
            for (let i = 0; i < n.length; i++) {
              const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
              const rc = rg.getClientRects()[0]; if (!rc) continue;
              const k = Math.round(rc.top); map.set(k, (map.get(k) || 0) + 1);
            }
          }
          const arr = [...map.values()]; arr.pop(); // drop last line of paragraph
          counts.push(...arr);
        });
        counts.sort((a,b)=>a-b);
        return { min: counts[0], median: counts[Math.floor(counts.length/2)], max: counts[counts.length-1] };
      }
      const a = document.querySelector('.prose').getBoundingClientRect();
      const n = document.querySelector('.notes').getBoundingClientRect();
      return { prose: lines('.prose p'), notes: lines('.notes p'),
        proseBox: [Math.round(a.left), Math.round(a.width), Math.round(a.top)],
        notesBox: [Math.round(n.left), Math.round(n.width), Math.round(n.top)],
        sideBySide: n.top < a.bottom, hscroll: document.documentElement.scrollWidth > innerWidth,
        notesSize: getComputedStyle(document.querySelector('.notes p')).fontSize };
    });
    console.log(`${w}px zoom ${zoom}:`, JSON.stringify(r));
    await page.screenshot({ path: path.join(__dirname, `shot-${w}-z${zoom}.png`), fullPage: true });
    await ctx.close();
  }
  await browser.close();
})();
