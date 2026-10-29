const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2];
const out = process.argv[3] || '';
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 375, 768, 1280, 1920]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('file://' + path.resolve(file));
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      const res = { scrollW: de.scrollWidth, clientW: de.clientWidth };
      const cpl = (el) => {
        // chars per line: walk text with ranges
        const range = document.createRange(); const tn = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
        const lines = new Map();
        while ((n = walker.nextNode())) for (let i = 0; i < n.length; i++) {
          range.setStart(n, i); range.setEnd(n, i + 1);
          const rc = range.getClientRects()[0]; if (!rc) continue;
          const k = Math.round(rc.top); lines.set(k, (lines.get(k) || 0) + 1);
        }
        const v = [...lines.values()]; return { lines: v.length, max: Math.max(...v), avg: Math.round(v.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, v.length - 1)) };
      };
      const q = (s) => document.querySelector(s);
      for (const [k, s] of [['h1', 'h1'], ['h2', 'h2'], ['lead', '.lead'], ['meta', '.meta'], ['body', 'main > p:nth-of-type(3)'], ['callout', '.callout p'], ['td', 'td'], ['th', 'th']]) {
        const el = q(s); const cs = getComputedStyle(el); const bb = el.getBoundingClientRect();
        res[k] = { fs: cs.fontSize, lh: cs.lineHeight, w: Math.round(bb.width), right: Math.round(bb.right), h: Math.round(bb.height), ff: cs.fontFamily.slice(0, 30), color: cs.color, align: cs.textAlign };
        if (['lead', 'body', 'callout', 'meta', 'h1'].includes(k)) res[k].cpl = cpl(el);
      }
      const c = q('.callout'); res.calloutClip = { scrollH: c.scrollHeight, clientH: c.clientHeight };
      const t = q('table'); res.table = { w: Math.round(t.getBoundingClientRect().width), right: Math.round(t.getBoundingClientRect().right) };
      return res;
    });
    console.log(w, JSON.stringify(r));
    if (out) await p.screenshot({ path: `${out}-${w}.png`, fullPage: true });
    await p.close();
  }
  await b.close();
})();
