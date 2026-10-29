// Usage: node measure.js page.html
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = 'file://' + path.resolve(process.argv[2]);
  const browser = await chromium.launch();
  for (const [w, h] of [[320, 700], [375, 812], [768, 1024], [1280, 900], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(file);
    const r = await page.evaluate(() => {
      const out = {};
      out.docScrollW = document.documentElement.scrollWidth;
      out.font = getComputedStyle(document.body).fontFamily;
      const lineStats = (el) => {
        const range = document.createRange();
        const text = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : null;
        if (!text) return null;
        const lines = []; let cur = ''; let top = null;
        for (let i = 0; i < text.length; i++) {
          range.setStart(text, i); range.setEnd(text, i + 1);
          const rects = range.getClientRects(); if (!rects.length) continue;
          const t = Math.round(rects[0].top);
          if (top !== null && Math.abs(t - top) > 2) { lines.push(cur); cur = ''; }
          top = t; cur += text.data[i];
        }
        lines.push(cur);
        const lens = lines.slice(0, -1).map(l => l.trim().length);
        return { lines: lines.length, maxChars: Math.max(...lens, 0), avgChars: lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : lines[0].length };
      };
      const cs = (sel) => { const e = document.querySelector(sel); const s = getComputedStyle(e); return { fs: s.fontSize, lh: s.lineHeight, w: Math.round(e.getBoundingClientRect().width) }; };
      out.h1 = { ...cs('h1'), height: Math.round(document.querySelector('h1').getBoundingClientRect().height) };
      out.h2 = cs('h2');
      out.lead = { ...cs('.lead'), ...lineStats(document.querySelector('.lead')) };
      out.body = { ...cs('main > p:not(.lead):not(.meta)'), ...lineStats(document.querySelector('main > p:not(.lead):not(.meta)')) };
      const co = document.querySelector('.callout'); const cp = co.querySelector('p');
      out.callout = { boxH: Math.round(co.getBoundingClientRect().height), textH: Math.round(cp.scrollHeight), clipped: co.scrollHeight > co.clientHeight + 1 };
      const t = document.querySelector('table'); const p = t.parentElement;
      out.table = { w: Math.round(t.getBoundingClientRect().width), containerW: Math.round(document.querySelector('main').clientWidth), parentScrolls: p.scrollWidth > p.clientWidth + 1 };
      return out;
    });
    console.log(`\n== ${w}px ==`); console.log(JSON.stringify(r));
    await page.close();
  }
  await browser.close();
})();
