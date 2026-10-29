// Usage: node measure.js page.html
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const browser = await chromium.launch();
  const cases = [
    { name: '320', width: 320, height: 800 },
    { name: '768', width: 768, height: 1000 },
    { name: '1440', width: 1440, height: 900 },
    { name: '2560', width: 2560, height: 1400 },
    { name: '1280@200%zoom', width: 640, height: 450, dsf: 2 },
    { name: '1280 root 32px', width: 1280, height: 900, rootPx: 32 },
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height }, deviceScaleFactor: c.dsf || 1 });
    const page = await ctx.newPage();
    await page.goto(file);
    if (c.rootPx) await page.addStyleTag({ content: `html{font-size:${c.rootPx}px}` });
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const out = { pageScrollX: doc.scrollWidth - doc.clientWidth };
      const lineInfo = (el) => {
        // chars per line via Range rects over text nodes
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const lines = new Map();
        let n;
        while ((n = walker.nextNode())) {
          for (let i = 0; i < n.length; i++) {
            const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
            const rect = rg.getClientRects()[0]; if (!rect) continue;
            const key = Math.round(rect.top);
            lines.set(key, (lines.get(key) || 0) + 1);
          }
        }
        const counts = [...lines.values()];
        return { lines: counts.length, maxChars: Math.max(...counts), counts };
      };
      const pick = (sel) => {
        const el = document.querySelector(sel);
        const cs = getComputedStyle(el);
        const li = lineInfo(el);
        return { fs: cs.fontSize, lh: cs.lineHeight, ls: cs.letterSpacing, align: cs.textAlign, width: Math.round(el.getBoundingClientRect().width), right: Math.round(el.getBoundingClientRect().right), clipped: el.scrollHeight > el.clientHeight + 1, lines: li.lines, maxChars: li.maxChars };
      };
      out.h1 = pick('h1'); out.h2 = pick('h2'); out.lead = pick('.lead'); out.meta = pick('.meta');
      out.body = pick('main > p:nth-of-type(3)');
      out.callout = pick('.callout'); out.calloutP = pick('.callout p');
      const t = document.querySelector('table'); const tb = t.getBoundingClientRect();
      out.table = { width: Math.round(tb.width), right: Math.round(tb.right), num: getComputedStyle(t).fontVariantNumeric };
      const sc = t.parentElement; out.tableParentScroll = sc.scrollWidth - sc.clientWidth;
      return out;
    });
    console.log('=== ' + c.name, JSON.stringify(r));
    await ctx.close();
  }
  await browser.close();
})();
