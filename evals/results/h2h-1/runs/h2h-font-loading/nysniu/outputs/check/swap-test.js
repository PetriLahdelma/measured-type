// Renders article.html three ways and compares the layout:
//   web      - Source Serif 4 loaded
//   fallback - web font blocked, metric-matched Georgia from fonts.css
//   plain    - web font blocked, unadjusted Georgia (what the swap would cost without the fallback faces)
// For every word it records which line it sits on, and for every block its top and height.
const path = require('path');
const { chromium, webkit } = require('playwright');
const url = 'file://' + path.resolve(__dirname, '..', 'article.html');

async function snapshot(browser, width, mode) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  if (mode !== 'web') await page.route(/\.ttf$/, (r) => r.abort());
  await page.goto(url);
  await page.route(/fonts\.css$/, async (r) => r.fulfill({ contentType: 'text/css', body: require('fs').readFileSync(path.resolve(__dirname, '..', 'fonts.css'), 'utf8').replace(/font-display: optional/g, 'font-display: swap') }));
  if (mode === 'plain') await page.addStyleTag({ content: '.prose, .prose h1 { font-family: "Source Serif 4", Georgia, serif !important; }' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const data = await page.evaluate(() => {
    const faces = [...document.fonts].map((f) => `${f.family}/${f.style}/${f.weight}:${f.status}`);
    const blocks = [...document.querySelectorAll('.prose > *')].map((el) => {
      const r = el.getBoundingClientRect();
      const words = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const lh = parseFloat(getComputedStyle(el).lineHeight);
      for (let n; (n = walker.nextNode()); ) {
        for (const m of n.data.matchAll(/\S+/g)) {
          const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
          const rr = rg.getClientRects()[0];
          words.push({ w: m[0], line: Math.round((rr.top - r.top) / lh), x: rr.left });
        }
      }
      return { tag: el.tagName, top: r.top, h: r.height, lines: Math.round(r.height / lh), words };
    });
    return { faces, blocks, docH: document.documentElement.scrollHeight, web: document.fonts.check('18px "Source Serif 4"') };
  });
  await ctx.close();
  return data;
}

function compare(a, b) {
  let moved = 0, maxTop = 0, maxH = 0, maxX = 0;
  a.blocks.forEach((blk, i) => {
    const o = b.blocks[i];
    maxTop = Math.max(maxTop, Math.abs(blk.top - o.top));
    maxH = Math.max(maxH, Math.abs(blk.h - o.h));
    blk.words.forEach((w, j) => {
      if (w.line !== o.words[j].line) moved++;
      else maxX = Math.max(maxX, Math.abs(w.x - o.words[j].x));
    });
  });
  return { wordsChangingLine: moved, maxBlockShiftPx: +maxTop.toFixed(2), maxHeightChangePx: +maxH.toFixed(2), docHeightChangePx: Math.abs(a.docH - b.docH), maxWordXDriftPx: +maxX.toFixed(1) };
}

(async () => {
  let fail = false;
  for (const type of [chromium, webkit]) {
    const browser = await type.launch();
    for (const width of [320, 375, 414, 768, 1280]) {
      const web = await snapshot(browser, width, 'web');
      const fb = await snapshot(browser, width, 'fallback');
      const plain = await snapshot(browser, width, 'plain');
      if (!web.web) { console.log(type.name(), width, 'web font did not load'); fail = true; }
      if (width === 320) console.log(type.name(), 'faces (fallback run):', fb.faces.filter((f) => /Fallback/.test(f)).join(', '));
      const m = compare(fb, web), p = compare(plain, web);
      console.log(`${type.name().padEnd(8)} ${String(width).padStart(4)}px  matched: ${JSON.stringify(m)}\n${''.padEnd(15)}plain:   ${JSON.stringify(p)}`);
      if (m.wordsChangingLine || m.maxBlockShiftPx > 1 || m.docHeightChangePx > 1) fail = true;
    }
    await browser.close();
  }
  console.log(fail ? 'RESULT (with swap forced): layout moves on swap at some width' : 'RESULT (with swap forced): no reflow on swap');
  process.exit(fail ? 1 : 0);
})();
