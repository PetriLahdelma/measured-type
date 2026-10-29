// Usage: node measure.js page.html
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2]);
const scenarios = [
  { name: '320px', w: 320 }, { name: '768px', w: 768 }, { name: '1280px', w: 1280 }, { name: '1920px', w: 1920 },
  { name: '1280 @200% zoom', w: 640 },
  { name: '1280 + 32px default font', w: 1280, rootPx: 32 },
];
(async () => {
  const browser = await chromium.launch();
  for (const s of scenarios) {
    const page = await browser.newPage({ viewport: { width: s.w, height: 900 } });
    await page.goto(file);
    if (s.rootPx) await page.addStyleTag({ content: `html{font-size:${s.rootPx}px}` });
    const r = await page.evaluate(() => {
      const lines = (el) => {
        const range = document.createRange(); const tops = new Map();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n; while ((n = walker.nextNode())) for (let i = 0; i < n.length; i++) {
          range.setStart(n, i); range.setEnd(n, i + 1);
          const rect = range.getClientRects()[0]; if (!rect) continue;
          const k = Math.round(rect.top); tops.set(k, (tops.get(k) || 0) + 1);
        }
        const counts = [...tops.values()]; const full = counts.slice(0, -1);
        return { lines: counts.length, maxChars: Math.max(...counts), avgFull: full.length ? Math.round(full.reduce((a, b) => a + b, 0) / full.length) : counts[0] };
      };
      const cs = (sel) => { const e = document.querySelector(sel); const c = getComputedStyle(e); return { fs: parseFloat(c.fontSize), lh: c.lineHeight === 'normal' ? 'normal' : +(parseFloat(c.lineHeight) / parseFloat(c.fontSize)).toFixed(2), w: Math.round(e.getBoundingClientRect().width), color: c.color, align: c.textAlign }; };
      const callout = document.querySelector('.callout');
      return {
        hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: { ...cs('h1'), ...lines(document.querySelector('h1')) },
        h2: cs('h2'),
        body: { ...cs('main > p:not(.lead):not(.meta)'), ...lines(document.querySelector('main > p:not(.lead):not(.meta)')) },
        lead: { ...cs('.lead'), ...lines(document.querySelector('.lead')) },
        meta: cs('.meta'),
        calloutClipped: callout.scrollHeight - callout.clientHeight,
        tableW: Math.round(document.querySelector('table').getBoundingClientRect().width),
        mainW: Math.round(document.querySelector('main').getBoundingClientRect().width),
      };
    });
    console.log(`\n== ${s.name} ==\n` + JSON.stringify(r));
    await page.close();
  }
  await browser.close();
})();
