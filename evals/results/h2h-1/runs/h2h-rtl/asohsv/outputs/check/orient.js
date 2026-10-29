// Measures which way each breadcrumb separator points by rasterising the
// page and comparing ink in the left vs right half of the glyph's middle row.
const { chromium, webkit } = require('playwright');
const path = require('path');
(async () => {
  for (const [n, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await bt.launch(); const p = await b.newPage({ viewport: { width: 700, height: 300 }, deviceScaleFactor: 4 });
    for (const f of ['en', 'ar']) {
      await p.goto('file://' + path.join(__dirname, f + '.html'));
      const rects = await p.evaluate(() => [...document.querySelectorAll('.crumbs li + li')].map(li => {
        const r = li.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, rtl: getComputedStyle(li).direction };
      }));
      const out = [];
      for (const r of rects) {
        // separator sits at the inline-start edge of the li: left in LTR, right in RTL
        const sepW = 14;
        const x = r.rtl === 'rtl' ? r.x + r.w - sepW : r.x;
        const buf = await p.screenshot({ clip: { x, y: r.y, width: sepW, height: r.h } });
        const res = await p.evaluate(async (b64) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          // find ink bbox, then compare x of ink at the vertical middle vs at the top of the ink
          let minY = 1e9, maxY = -1;
          const dark = (x, y) => { const i = (y * c.width + x) * 4; return d[i] < 160 && d[i+1] < 160 && d[i+2] < 160; };
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (dark(x, y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
          const rowX = y => { let s = 0, k = 0; for (let x = 0; x < c.width; x++) if (dark(x, y)) { s += x; k++; } return k ? s / k : null; };
          const top = rowX(minY + 1), mid = rowX(Math.round((minY + maxY) / 2));
          return mid > top ? 'points right (›)' : 'points left (‹)';
        }, buf.toString('base64'));
        out.push(res);
      }
      console.log(n, f, out.join(', '));
    }
    await b.close();
  }
})();
