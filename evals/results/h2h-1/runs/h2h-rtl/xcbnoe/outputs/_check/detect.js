// Renders a page, then for every breadcrumb separator reports which way it points,
// by reading the pixels of the separator's box.
const { chromium } = require('playwright');
const path = require('path');
async function pointing(page, b, ctx) {
  const buf = await page.screenshot({ clip: b });
  const p2 = await ctx.newPage();
  const res = await p2.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const pts = [];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i] < 180) pts.push([x, y]); }
    if (!pts.length) return 'blank';
    const ys = pts.map(p => p[1]); const y0 = Math.min(...ys), y1 = Math.max(...ys), ym = (y0 + y1) / 2;
    const band = (lo, hi) => { const s = pts.filter(p => p[1] >= lo && p[1] <= hi); return s.reduce((a, p) => a + p[0], 0) / s.length; };
    const top = band(y0, y0 + (y1 - y0) * 0.2), mid = band(ym - (y1 - y0) * 0.1, ym + (y1 - y0) * 0.1);
    return mid > top ? 'right ›' : 'left ‹';
  }, 'data:image/png;base64,' + buf.toString('base64'));
  await p2.close();
  return res;
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ deviceScaleFactor: 4 });
  const page = await ctx.newPage();
  for (const f of process.argv.slice(2)) {
    await page.goto('file://' + path.resolve(__dirname, f));
    const boxes = await page.evaluate(() => [...document.querySelectorAll('.crumbs li + li')].map(li => {
      // separator box: from li inline-start edge, width of the ::before incl. nothing else
      const r = li.getBoundingClientRect(); const a = li.firstElementChild || li;
      const rtl = getComputedStyle(li).direction === 'rtl';
      const range = document.createRange(); range.selectNodeContents(li); const tr = range.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(li).fontSize);
      return rtl ? { x: tr.right + 0.1, y: r.top, width: r.right - tr.right - 0.2, height: r.height }
                 : { x: r.left + 0.1, y: r.top, width: tr.left - r.left - 0.2, height: r.height };
    }));
    const out = [];
    for (const bx of boxes) out.push(await pointing(page, bx, ctx));
    console.log(f, out.join(' | '));
  }
  await b.close();
})();
