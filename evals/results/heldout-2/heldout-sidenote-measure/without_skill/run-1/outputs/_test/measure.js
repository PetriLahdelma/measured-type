const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const url = 'file://' + path.resolve(__dirname, '..', 'essay.html');
  const widths = [320, 375, 640, 768, 991, 992, 1024, 1280, 1440, 1920];
  for (const w of widths) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(url);
    const r = await p.evaluate(() => {
      function cpl(sel) {
        const el = document.querySelector(sel);
        const out = [];
        for (const para of el.querySelectorAll('p')) {
          const range = document.createRange();
          const tn = para.firstChild; const t = tn.textContent;
          let lines = {}; 
          for (let i = 0; i < t.length; i++) { range.setStart(tn, i); range.setEnd(tn, i+1); const rc = range.getClientRects()[0]; if (!rc) continue; const k = Math.round(rc.top); lines[k] = (lines[k]||0)+1; }
          const counts = Object.values(lines); counts.pop(); // drop last line
          out.push(...counts);
        }
        out.sort((a,b)=>a-b);
        const r = el.getBoundingClientRect();
        return { min: out[0], med: out[Math.floor(out.length/2)], max: out[out.length-1], left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top), fs: getComputedStyle(el).fontSize };
      }
      const p1 = document.querySelector('.prose p').getBoundingClientRect().top;
      return { prose: cpl('.prose'), notes: cpl('.notes'), firstP: Math.round(p1), scrollW: document.documentElement.scrollWidth, vw: innerWidth };
    });
    console.log(w, JSON.stringify(r));
    if ([375, 1280].includes(w)) await p.screenshot({ path: path.join(__dirname, `shot-${w}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
})();
