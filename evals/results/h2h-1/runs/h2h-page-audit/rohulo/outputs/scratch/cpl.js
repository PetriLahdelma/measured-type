const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 for (const f of ['page.html','page.fixed.html']) for (const w of [320,1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } }); await p.goto('file://' + path.resolve(f));
  const r = await p.evaluate(() => [...document.querySelectorAll('main p')].map(el => {
    const t = el.firstChild, txt = el.textContent, range = document.createRange(); const lines = {};
    for (let i = 0; i < txt.length; i++) { range.setStart(t, i); range.setEnd(t, i+1); const top = Math.round(range.getBoundingClientRect().top); lines[top] = (lines[top]||0)+1; }
    const v = Object.values(lines); const full = v.slice(0,-1); return `${el.className||'p'}: lines=${v.length} min=${Math.min(...full)} max=${Math.max(...full)}`; }));
  console.log(f, w, r.join(' | ')); await p.screenshot({ path: `scratch/${f}-${w}.png`, fullPage: true }); await p.close(); }
 await b.close(); })();
