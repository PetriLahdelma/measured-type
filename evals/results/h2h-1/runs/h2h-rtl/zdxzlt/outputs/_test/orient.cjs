// Pixel test: hide all text except the generated separator/arrow glyphs, then read which way each glyph points.
const { chromium, webkit } = require('playwright');
const { PNG } = (() => { try { return require('pngjs'); } catch { return {}; } })();
const { execFileSync } = require('child_process');
function glyphs(file) {
  const lines = execFileSync('magick', [file, '-background', 'white', '-alpha', 'remove', '-colorspace', 'gray', '-depth', '8', 'txt:-'], { maxBuffer: 1 << 28 }).toString().split('\n');
  const ink = [];
  for (const l of lines) { const m = l.match(/^(\d+),(\d+):.*?gray\((\d+(?:\.\d+)?)/); if (m && +m[3] < 200) ink.push([+m[1], +m[2]]); }
  const cols = [...new Set(ink.map(p => p[0]))].sort((a, b) => a - b);
  const groups = []; let g = [];
  for (const c of cols) { if (g.length && c - g[g.length - 1] > 3) { groups.push(g); g = []; } g.push(c); }
  if (g.length) groups.push(g);
  return groups.map(gc => {
    const pts = ink.filter(p => p[0] >= gc[0] && p[0] <= gc[gc.length - 1]);
    const ys = pts.map(p => p[1]); const top = Math.min(...ys), bot = Math.max(...ys), mid = (top + bot) / 2;
    const near = (y0) => pts.filter(p => Math.abs(p[1] - y0) <= 1).map(p => p[0]);
    const topXs = near(top), midXs = near(Math.round(mid));
    const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
    // Chevron tip is at mid-height: mid-row ink right of top-row ink means it points right. A full arrow (shaft + head) reads inverted: its top row is the head, so ">" here means the arrow points left.
    return avg(midXs) > avg(topXs) ? '>' : '<';
  }).join(' ');
}
(async () => {
  for (const [n, b] of [['chromium', chromium], ['webkit', webkit]]) {
    const br = await b.launch(); const p = await br.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 2 });
    for (const f of (process.env.FILES || 'en-orig.html,en-new.html,ar.html,en-text-rtl.html').split(',')) {
      await p.goto('file://' + __dirname + '/' + f);
      await p.addStyleTag({ content: '.crumbs li, .crumbs a, .next { color: transparent !important; text-decoration: none !important } .next::after { color: #000 !important }' });
      const ol = await p.locator('.crumbs ol').boundingBox(); const nx = await p.locator('.next').boundingBox();
      const fc = `${__dirname}/_c.png`, fn = `${__dirname}/_n.png`;
      await p.screenshot({ path: fc, clip: { x: 0, y: ol.y, width: 800, height: ol.height } });
      await p.screenshot({ path: fn, clip: { x: 0, y: nx.y, width: 800, height: nx.height } });
      console.log(n.padEnd(9), f.padEnd(17), 'crumb separators:', glyphs(fc).padEnd(4), ' next arrow:', glyphs(fn));
    }
    await br.close();
  }
  require('fs').rmSync(__dirname + '/_c.png'); require('fs').rmSync(__dirname + '/_n.png');
})();
