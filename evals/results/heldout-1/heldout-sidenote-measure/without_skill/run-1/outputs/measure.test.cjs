(async()=>{
const { chromium } = require('playwright');
const path = require('node:path');
const url = 'file://' + path.resolve('essay.html');
const b = await chromium.launch();
for (const w of [320, 375, 640, 768, 991, 992, 1100, 1280, 1600, 2400]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(url);
  const r = await p.evaluate(() => {
    function cpl(sel) {
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const tn = el.firstChild; const text = tn.textContent;
        const rg = document.createRange(); let lines = {}; 
        for (let i = 0; i < text.length; i++) { rg.setStart(tn, i); rg.setEnd(tn, i + 1); const rc = rg.getClientRects()[0]; if (!rc) continue; const k = Math.round(rc.top); lines[k] = (lines[k] || 0) + 1; }
        const v = Object.values(lines); v.pop(); out.push(...v);
      }
      if (!out.length) return null;
      return { avg: Math.round(out.reduce((a, b) => a + b, 0) / out.length), min: Math.min(...out), max: Math.max(...out) };
    }
    const a = document.querySelector('.prose').getBoundingClientRect();
    const n = document.querySelector('.notes').getBoundingClientRect();
    const fp = document.querySelector('.prose p').getBoundingClientRect();
    return { prose: cpl('.prose p'), notes: cpl('.notes p'), proseW: Math.round(a.width), notesW: Math.round(n.width), side: n.left > a.right, notesTopVsP1: Math.round(n.top - fp.top), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  console.log(w, JSON.stringify(r));
  await p.close();
}
await b.close();
})();
