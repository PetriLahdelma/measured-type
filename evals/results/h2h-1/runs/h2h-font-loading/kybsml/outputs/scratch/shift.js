const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const W = process.argv[2];
const ORIGIN = 'http://article.test/';
async function run(variant, width) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  let css = fs.readFileSync(path.join(W, 'fonts.css'), 'utf8');
  if (variant === 'plain-georgia') css = css.replace('"Source Serif 4 Fallback", ', '');
  let release; const gate = new Promise(r => (release = r));
  await page.route(ORIGIN + '**', async route => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
    if (rel === 'fonts.css') return route.fulfill({ body: css, contentType: 'text/css' });
    if (rel.startsWith('fonts/')) await gate;
    const type = rel.endsWith('.html') ? 'text/html' : 'font/ttf';
    route.fulfill({ body: fs.readFileSync(path.join(W, rel)), contentType: type });
  });
  const measure = () => page.evaluate(() => {
    const out = {};
    for (const [i, el] of [...document.querySelectorAll('#body > *')].entries()) {
      const r = document.createRange(); const tops = new Set(); const breaks = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let prevTop = null, n;
      while ((n = walker.nextNode())) {
        for (const m of n.data.matchAll(/\S+/g)) {
          r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
          const t = Math.round(r.getClientRects()[0].top);
          if (prevTop !== null && t !== prevTop) breaks.push(m[0]);
          prevTop = t;
        }
      }
      const b = el.getBoundingClientRect();
      out[el.tagName + i] = { top: +b.top.toFixed(2), height: +b.height.toFixed(2), lines: breaks.length + 1, breaks: breaks.join('|') };
    }
    out.fontsUsed = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style + ' ' + f.weight);
    return out;
  });
  await page.goto(ORIGIN + 'article.html');
  await page.waitForTimeout(400);
  const before = await measure();
  release();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const after = await measure();
  await browser.close();
  return { before, after };
}
(async () => {
  for (const variant of ['fonts.css', 'plain-georgia']) for (const width of [320, 360, 375, 390, 414, 430, 768, 1280]) {
    const { before, after } = await run(variant, width);
    let maxShift = 0, breakDiff = 0, rows = [];
    for (const k of Object.keys(after)) {
      if (k === 'fontsUsed') continue;
      const a = before[k], b = after[k];
      maxShift = Math.max(maxShift, Math.abs(a.top - b.top), Math.abs(a.height - b.height));
      if (a.breaks !== b.breaks) breakDiff++;
      rows.push(`${k}:${a.lines}->${b.lines}`);
    }
    console.log(`${variant.padEnd(13)} ${String(width).padStart(4)}px  maxShift=${maxShift.toFixed(2)}px  blocksWithDifferentBreaks=${breakDiff}  ${rows.join(' ')}`);
    if (false) console.log('  loaded faces before:', before.fontsUsed, '\n  after:', after.fontsUsed);
  }
})();
