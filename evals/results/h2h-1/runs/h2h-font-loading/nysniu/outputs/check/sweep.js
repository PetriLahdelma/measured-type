// Sweeps the article's text width from 288px (320px viewport) to 576px (its max)
// in 0.5px steps and counts widths at which any word sits on a different line
// with the fallback than with Source Serif 4. Optional args override size-adjust
// for faces: node sweep.js "Georgia\"\\);|102.85" ... (pattern after local name).
const fs = require('fs');
const path = require('path');
const { chromium, webkit } = require('playwright');
const dir = path.resolve(__dirname, '..');
const url = 'file://' + path.join(dir, 'article.html');
const engine = process.argv[2] === 'webkit' ? webkit : chromium;
const overrides = JSON.parse(process.argv[3] || '{}'); // { "Source Serif 4 Fallback|normal|200 500": 102.5 }

function cssWith(over) {
  // Force swap so the web-font run really renders Source Serif 4 (the shipped CSS uses optional).
  let css = fs.readFileSync(path.join(dir, 'fonts.css'), 'utf8').replace(/font-display: optional/g, 'font-display: swap');
  return css.replace(/@font-face\s*{[^}]*}/g, (block) => {
    const fam = /font-family:\s*"([^"]+)"/.exec(block)[1];
    const st = /font-style:\s*(\w+)/.exec(block)[1];
    const wt = /font-weight:\s*([\d ]+);/.exec(block)[1];
    const v = over[`${fam}|${st}|${wt}`];
    if (v == null) return block;
    return block.replace(/size-adjust:[^;]+;/, `size-adjust: ${v}%;`)
      .replace(/ascent-override:[^;]+;/, `ascent-override: ${(103.6 / v * 100).toFixed(2)}%;`)
      .replace(/descent-override:[^;]+;/, `descent-override: ${(33.5 / v * 100).toFixed(2)}%;`);
  });
}

async function signatures(browser, mode, over) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  if (mode === 'fallback') await page.route(/\.ttf$/, (r) => r.abort());
  await page.route(/fonts\.css$/, (r) => r.fulfill({ contentType: 'text/css', body: cssWith(over) }));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  const sigs = await page.evaluate(() => {
    const art = document.querySelector('.prose');
    const out = [];
    for (let w = 288; w <= 576; w += 0.5) {
      art.style.maxInlineSize = w + 'px';
      const sig = [];
      for (const el of art.children) {
        const top = el.getBoundingClientRect().top;
        const lh = parseFloat(getComputedStyle(el).lineHeight);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n; (n = walker.nextNode()); ) for (const m of n.data.matchAll(/\S+/g)) {
          const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + 1);
          sig.push(Math.round((rg.getClientRects()[0].top - top) / lh));
        }
      }
      const heights = [...art.children].map((el) => Math.round(el.getBoundingClientRect().height));
      out.push({ words: sig.join(','), heights: heights.join(','), blocks: [...art.children].map((el, k) => sig.length) });
    }
    return out;
  });
  await page.close();
  return sigs;
}

(async () => {
  const browser = await engine.launch();
  const web = await signatures(browser, 'web', {});
  const fb = await signatures(browser, 'fallback', overrides);
  const words = [], heights = [], perBlock = {};
  web.forEach((s, i) => {
    if (s.words !== fb[i].words) words.push(288 + i * 0.5);
    if (s.heights !== fb[i].heights) {
      heights.push(288 + i * 0.5);
      const a = s.heights.split(','), b = fb[i].heights.split(',');
      a.forEach((h, k) => { if (h !== b[k]) perBlock[k] = (perBlock[k] || 0) + 1; });
    }
  });
  console.log(`${engine.name()} ${JSON.stringify(overrides)} -> words reflow at ${words.length}/${web.length} widths; block heights change at ${heights.length}/${web.length}`, JSON.stringify(perBlock), heights.length < 30 ? heights.join(' ') : '');
  await browser.close();
})();
