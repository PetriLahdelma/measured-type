// Renders article.html three ways and compares layout:
//   web      = Source Serif 4 loaded
//   matched  = font files blocked, so the metric-matched Georgia faces render
//   plain    = font files blocked and plain Georgia forced (what you'd get with no overrides)
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'article.html');

async function measure(browser, width, mode) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  if (mode !== 'web') await page.route('**/*.ttf', (r) => r.abort());
  await page.goto(url);
  if (mode === 'plain') await page.addStyleTag({ content: '.prose{font-family:Georgia,serif !important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  const out = await page.evaluate(() => {
    const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style} ${f.weight}`);
    const blocks = [...document.querySelectorAll('.prose > *')].map((el) => {
      const r = el.getBoundingClientRect();
      // line-start offsets: walk text nodes char by char
      const starts = []; let lastTop = null; let idx = 0;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      while (tw.nextNode()) {
        const n = tw.currentNode;
        for (let i = 0; i < n.length; i++, idx++) {
          if (/\s/.test(n.data[i])) continue;
          range.setStart(n, i); range.setEnd(n, i + 1);
          const t = Math.round(range.getBoundingClientRect().top);
          if (lastTop === null || t > lastTop + 4) { starts.push(idx); lastTop = t; }
        }
      }
      return { tag: el.tagName, top: r.top, h: r.height, lines: starts.length, starts };
    });
    const em = document.querySelector('em').getBoundingClientRect();
    return { loaded, blocks, emW: em.width, docH: document.documentElement.scrollHeight };
  });
  await page.close();
  return out;
}

(async () => {
  const browser = await chromium.launch();
  let worst = 0;
  for (const w of [320, 360, 390, 768, 1280]) {
    const web = await measure(browser, w, 'web');
    const matched = await measure(browser, w, 'matched');
    const plain = await measure(browser, w, 'plain');
    if (w === 320) console.log('loaded faces (web):', web.loaded.join(' | ') || 'NONE', '\nloaded faces (matched):', matched.loaded.join(' | '));
    console.log(`\n== viewport ${w}px  page height web ${web.docH} matched ${matched.docH} plain ${plain.docH}`);
    web.blocks.forEach((b, i) => {
      const m = matched.blocks[i], p = plain.blocks[i];
      const sameBreaks = JSON.stringify(b.starts) === JSON.stringify(m.starts);
      const plainBreaks = JSON.stringify(b.starts) === JSON.stringify(p.starts);
      const shift = Math.abs(b.top - m.top) + Math.abs(b.h - m.h);
      worst = Math.max(worst, shift);
      console.log(`${b.tag.padEnd(3)} lines web ${b.lines} matched ${m.lines} plain ${p.lines} | top dy matched ${(m.top - b.top).toFixed(2)} plain ${(p.top - b.top).toFixed(2)} | breaks identical: matched ${sameBreaks} plain ${plainBreaks}`);
    });
    console.log(`em width web ${web.emW.toFixed(1)} matched ${matched.emW.toFixed(1)} plain ${plain.emW.toFixed(1)}`);
  }
  console.log('\nworst block move/resize, matched vs web:', worst.toFixed(2), 'px');
  await browser.close();
})();
