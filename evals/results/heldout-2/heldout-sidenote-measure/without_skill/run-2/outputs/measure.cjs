(async()=>{
const { chromium } = require('playwright');
const b = await chromium.launch();
const url = 'file://' + process.cwd() + '/essay.html';
for (const w of [1440, 1280, 961, 959, 800, 640, 375, 320]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(url);
  const r = await p.evaluate(() => {
    function cpl(sel) {
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const range = document.createRange(); const tn = el.firstChild; const t = tn.textContent;
        let lines = {}; for (let i = 0; i < t.length; i++) { range.setStart(tn, i); range.setEnd(tn, i + 1); const rr = range.getClientRects()[0]; if (!rr) continue; const k = Math.round(rr.top); lines[k] = (lines[k] || 0) + 1; }
        const v = Object.values(lines); v.pop(); out.push(...v);
      }
      return v => v;
    }
    function lens(sel) { const all = []; for (const el of document.querySelectorAll(sel)) { const tn = el.firstChild, t = tn.textContent, range = document.createRange(); const lines = {}; for (let i = 0; i < t.length; i++) { range.setStart(tn, i); range.setEnd(tn, i + 1); const rr = range.getClientRects()[0]; if (!rr) continue; const k = Math.round(rr.top); lines[k] = (lines[k] || 0) + 1; } const v = Object.values(lines); v.pop(); all.push(...v); } all.sort((a,b)=>a-b); return all.length ? { min: all[0], med: all[all.length>>1], max: all[all.length-1], n: all.length } : null; }
    const pr = document.querySelector('.prose').getBoundingClientRect(), nr = document.querySelector('.notes').getBoundingClientRect(), p1 = document.querySelector('.prose p').getBoundingClientRect();
    return { scrollW: document.documentElement.scrollWidth, prose: [Math.round(pr.left), Math.round(pr.width)], notes: [Math.round(nr.left), Math.round(nr.top), Math.round(nr.width)], p1top: Math.round(p1.top), prosePL: lens('.prose p'), notesPL: lens('.notes p') };
  });
  console.log(w, JSON.stringify(r));
  await p.close();
}
await b.close();
})();
