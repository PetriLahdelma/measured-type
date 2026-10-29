const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2] || 'page.html';
const widths = (process.argv[3] || '375,768,1280,1920').split(',').map(Number);
const shots = process.argv[4];
(async () => {
  const browser = await chromium.launch();
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto('file://' + path.resolve(file));
    const r = await page.evaluate(() => {
      const out = {};
      const de = document.documentElement;
      out.hScroll = de.scrollWidth > de.clientWidth ? `${de.scrollWidth}>${de.clientWidth}` : 'none';
      function lines(el) {
        const range = document.createRange();
        const tops = new Map();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          for (let i = 0; i < n.length; i++) {
            if (/\s/.test(n.data[i])) continue;
            range.setStart(n, i); range.setEnd(n, i + 1);
            const rr = range.getClientRects()[0]; if (!rr) continue;
            const k = Math.round(rr.top);
            if (!tops.has(k)) tops.set(k, { s: '', }); 
          }
        }
        // rebuild line strings
        const L = new Map();
        const walker2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while ((n = walker2.nextNode())) {
          for (let i = 0; i < n.length; i++) {
            range.setStart(n, i); range.setEnd(n, i + 1);
            const rr = range.getClientRects()[0]; if (!rr) continue;
            const k = Math.round(rr.top);
            L.set(k, (L.get(k) || '') + n.data[i]);
          }
        }
        return [...L.values()].map(s => s.trim().length);
      }
      const q = (sel) => document.querySelector(sel);
      const desc = (el) => { const cs = getComputedStyle(el); return { fs: cs.fontSize, lh: cs.lineHeight, ratio: (parseFloat(cs.lineHeight)/parseFloat(cs.fontSize)).toFixed(2), color: cs.color, align: cs.textAlign, w: Math.round(el.getBoundingClientRect().width) }; };
      for (const [name, sel] of [['h1','h1'],['h2','h2'],['lead','.lead'],['meta','.meta'],['body','main > p:not(.lead):not(.meta)'],['callout','.callout p'],['td','td']]) {
        const el = q(sel); if (!el) continue;
        const d = desc(el); const ls = lines(el);
        d.lines = ls.length; d.maxChars = Math.max(...ls); d.fullLineAvg = ls.length>1 ? Math.round(ls.slice(0,-1).reduce((a,b)=>a+b,0)/(ls.length-1)) : ls[0];
        out[name] = d;
      }
      const c = q('.callout');
      out.calloutClipped = c.scrollHeight > c.clientHeight ? `${c.scrollHeight}>${c.clientHeight}` : 'no';
      const t = q('table'); const tp = t.parentElement;
      out.table = { w: Math.round(t.getBoundingClientRect().width), parentW: Math.round(tp.clientWidth), parentScroll: tp.scrollWidth > tp.clientWidth };
      return out;
    });
    console.log(`\n=== ${file} @ ${w}px`);
    console.log(JSON.stringify(r, null, 0).replace(/\},"/g, '},\n "'));
    if (shots) await page.screenshot({ path: `${shots}-${w}.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
})();
