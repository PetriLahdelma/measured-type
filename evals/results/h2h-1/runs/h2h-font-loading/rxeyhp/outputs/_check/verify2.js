// 1) fast load uses Source Serif 4; 2) delayed font: no swap, zero layout shift,
// font still downloads for next view; 3) fallback vs web font geometry (info).
const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const url = 'file://' + root + '/article.html';
const geom = () => [...document.querySelectorAll('.prose > *')].map(el => { const r = el.getBoundingClientRect(); return `${el.tagName}:${r.top.toFixed(1)}/${r.height.toFixed(1)}`; }).join(' ');
const usedFamily = () => { const c = document.createElement('canvas').getContext('2d'); return document.fonts.check('18px "Source Serif 4"') ? 'SS4 available' : 'SS4 not available'; };
(async () => {
  const b = await chromium.launch();
  for (const width of [320, 375, 414, 768, 1280]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    const fast = await ctx.newPage();
    await fast.goto(url); await fast.evaluate(() => document.fonts.ready);
    const fastFonts = await fast.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + '/' + f.style + '/' + f.weight).join(', '));
    const fastGeom = await fast.evaluate(geom);
    if (width === 320) await fast.screenshot({ path: 'web-320.png', fullPage: true });
    const slow = await ctx.newPage();
    let served = 0;
    await slow.route(/\.ttf$/, async r => { await new Promise(s => setTimeout(s, 1500)); served++; await r.continue(); });
    await slow.addInitScript(() => { window.__cls = 0; window.__shifts = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__cls += e.value; window.__shifts++; } }).observe({ type: 'layout-shift', buffered: true }); });
    await slow.goto(url);
    const before = await slow.evaluate(geom);
    await slow.waitForTimeout(2500);
    const after = await slow.evaluate(geom);
    const st = await slow.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts, ss4: [...document.fonts].filter(f => f.family === 'Source Serif 4').map(f => f.style + ':' + f.status).join(',') }));
    if (width === 320) await slow.screenshot({ path: 'fallback-320.png', fullPage: true });
    console.log(`${width}px fast: ${fastFonts}`);
    console.log(`  slow: CLS ${st.cls} (${st.shifts} shifts), geometry unchanged after font arrived: ${before === after}, ttf served ${served}, SS4 faces ${st.ss4}`);
    console.log(`  fast geom ${fastGeom}\n  slow geom ${after}`);
    await ctx.close();
  }
  await b.close();
})();
