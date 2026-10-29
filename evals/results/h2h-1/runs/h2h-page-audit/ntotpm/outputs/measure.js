// Usage: node measure.js page.html
// Renders the page at several widths and reports computed type values,
// characters per line, overflow and clipping.
const { chromium } = require('playwright');
const path = require('path');

const file = 'file://' + path.resolve(__dirname, process.argv[2] || 'page.html');
const widths = [320, 375, 640, 768, 1280, 1440];

(async () => {
  const browser = await chromium.launch();
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(file);
    const r = await page.evaluate(() => {
      const out = {};
      out.docScrollWidth = document.documentElement.scrollWidth;
      out.clientWidth = document.documentElement.clientWidth;
      out.font = (document.fonts && [...document.fonts].length) || 0;
      const lines = (el) => {
        // group character rects by top to get per-line character counts
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const map = new Map();
        let n;
        while ((n = walker.nextNode())) {
          for (let i = 0; i < n.length; i++) {
            const rg = document.createRange();
            rg.setStart(n, i); rg.setEnd(n, i + 1);
            const rect = rg.getClientRects()[0];
            if (!rect) continue;
            const k = Math.round(rect.top);
            map.set(k, (map.get(k) || 0) + 1);
          }
        }
        return [...map.values()];
      };
      const desc = (sel, el) => {
        const cs = getComputedStyle(el);
        const l = lines(el);
        const full = l.slice(0, -1);
        return {
          sel,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          ratio: (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2),
          weight: cs.fontWeight,
          align: cs.textAlign,
          width: Math.round(el.getBoundingClientRect().width),
          lines: l.length,
          maxCPL: full.length ? Math.max(...full) : l[0],
          lastLine: l[l.length - 1],
          clipped: el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflow === 'hidden',
          right: Math.round(el.getBoundingClientRect().right),
        };
      };
      out.items = [
        ['h1', document.querySelector('h1')],
        ['h2', document.querySelector('h2')],
        ['.lead', document.querySelector('.lead')],
        ['.meta', document.querySelector('.meta')],
        ['p (Storage)', document.querySelector('h2 + p')],
        ['.callout', document.querySelector('.callout')],
        ['table', document.querySelector('table')],
      ].map(([s, e]) => desc(s, e));
      const t = document.querySelector('table');
      out.tableRight = Math.round(t.getBoundingClientRect().right); const sc = document.querySelector('.table-scroll'); if (sc) out.tableRight += ' scrollBox=' + sc.clientWidth + '/' + sc.scrollWidth;
      return out;
    });
    console.log(`\n=== ${w}px  docScrollWidth=${r.docScrollWidth} (viewport ${r.clientWidth})  tableRight=${r.tableRight}`);
    for (const i of r.items) {
      console.log(
        `${i.sel.padEnd(12)} fs=${i.fontSize.padEnd(8)} lh=${i.lineHeight.padEnd(8)} (${i.ratio}) w=${i.weight} align=${i.align.padEnd(7)} box=${i.width}px right=${i.right} lines=${i.lines} maxCPL=${i.maxCPL} last=${i.lastLine}${i.clipped ? '  CLIPPED' : ''}`
      );
    }
    await page.close();
  }
  // 200% zoom approximation: 1280 CSS px window at 2x zoom = 640 CSS px viewport.
  // Compare h1 size against what a rem-based size would do: vw text does not grow.
  await browser.close();
})();
