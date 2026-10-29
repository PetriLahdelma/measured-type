const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2] || 'page.html';
const spacing = process.argv[3] === 'spacing';
(async () => {
  const browser = await chromium.launch();
  for (const w of [320, 768, 1280, 1920]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto('file://' + path.resolve(file));
    if (spacing) await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p{margin-bottom:2em!important}' });
    const r = await page.evaluate(() => {
      function lines(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const rows = new Map();
        let n;
        while ((n = walker.nextNode())) {
          for (let i = 0; i < n.length; i++) {
            const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
            const rc = rg.getClientRects()[0]; if (!rc) continue;
            const k = Math.round(rc.top);
            rows.set(k, (rows.get(k) || '') + n.data[i]);
          }
        }
        return [...rows.values()].map(s => s.trim()).filter(Boolean);
      }
      const out = { scrollW: document.documentElement.scrollWidth };
      const cs = s => getComputedStyle(document.querySelector(s));
      out.h1 = cs('h1').fontSize + '/' + cs('h1').lineHeight;
      out.h2 = cs('h2').fontSize;
      out.lead = cs('.lead').fontSize + '/' + cs('.lead').lineHeight;
      out.contentW = document.querySelector('.content').clientWidth;
      out.paras = [...document.querySelectorAll('main p')].map(p => {
        const L = lines(p);
        const full = L.slice(0, -1);
        const lens = full.map(s => s.length);
        return { cls: p.className || (p.closest('.callout') ? 'callout' : 'p'), w: Math.round(p.getBoundingClientRect().width), nLines: L.length, chars: lens.length ? [Math.min(...lens), Math.max(...lens)] : L.map(s=>s.length) };
      });
      const c = document.querySelector('.callout');
      out.callout = { client: c.clientHeight, scroll: c.scrollHeight, clipped: c.scrollHeight > c.clientHeight + 1 };
      const t = document.querySelector('table');
      out.table = { w: Math.round(t.getBoundingClientRect().width), right: Math.round(t.getBoundingClientRect().right), vw: innerWidth };
      const wrap = t.parentElement; out.tableParentScroll = { client: wrap.clientWidth, scroll: wrap.scrollWidth };
      return out;
    });
    console.log('VIEWPORT', w, JSON.stringify(r));
    await page.close();
  }
  // fonts actually used
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file://' + path.resolve(file));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  for (const sel of ['h1', 'p', '.meta', 'td']) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    const f = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    console.log('FONT', sel, JSON.stringify(f.fonts));
  }
  await browser.close();
})();
