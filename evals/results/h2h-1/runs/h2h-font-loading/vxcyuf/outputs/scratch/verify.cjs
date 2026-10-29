const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const url = pathToFileURL(path.resolve('article.html')).href;
async function snap(browser, width, mode) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  if (mode !== 'webfont') await page.route('**/*.ttf', r => r.abort());
  await page.goto(url);
  if (mode === 'plainGeorgia') await page.addStyleTag({ content: 'article{font-family:Georgia,serif !important}' });
  await page.evaluate(() => document.fonts.ready);
  const data = await page.evaluate(() => {
    const els = [...document.querySelectorAll('article > *')];
    const status = [...document.fonts].map(f => `${f.family}/${f.style}/${f.weight}:${f.status}`);
    const used = getComputedStyle(document.querySelector('p')).fontFamily;
    const out = els.map(el => {
      // record the word that starts each line
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const starts = []; let lastTop = null; let n;
      while ((n = walker.nextNode())) {
        const re = /\S+/g; let m;
        while ((m = re.exec(n.data))) {
          const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
          const top = Math.round(r.getClientRects()[0].top);
          if (top !== lastTop) { starts.push(m[0]); lastTop = top; }
        }
      }
      const b = el.getBoundingClientRect();
      return { tag: el.tagName, top: +b.top.toFixed(2), height: +b.height.toFixed(2), lines: starts.length, starts };
    });
    return { status, used, out, articleH: +document.querySelector('article').getBoundingClientRect().height.toFixed(2) };
  });
  await page.close();
  return data;
}
(async () => {
  const browser = await chromium.launch();
  let first = true;
  for (const w of [320, 375, 414, 600, 768, 1280]) {
    const web = await snap(browser, w, 'webfont');
    const fb = await snap(browser, w, 'fallback');
    const geo = await snap(browser, w, 'plainGeorgia');
    if (first) { console.log('webfont faces:', web.status.join(' ')); console.log('fallback run faces:', fb.status.join(' ')); first = false; }
    const diff = (a, b) => a.out.map((e, i) => {
      const o = b.out[i];
      const breaks = e.starts.filter((s, j) => s !== o.starts[j]).length + Math.abs(e.starts.length - o.starts.length);
      return `${e.tag} dH=${(o.height - e.height).toFixed(2)} dTop=${(o.top - e.top).toFixed(2)} lines ${e.lines}/${o.lines} breakDiffs=${breaks}`;
    }).join(' | ');
    console.log(`\n${w}px article height web=${web.articleH} matchedFallback=${fb.articleH} plainGeorgia=${geo.articleH}`);
    console.log('  matched fallback vs web:', diff(web, fb));
    console.log('  plain Georgia   vs web:', diff(web, geo));
  }
  await browser.close();
})();
