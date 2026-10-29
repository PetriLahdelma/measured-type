// Compares the article's layout before the web font arrives (font requests
// blocked, so the tuned fallback renders) with the layout after it loads.
const { webkit: chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'article.html');
const snap = () => {
  const els = [...document.querySelectorAll('article > *')];
  return {
    family: getComputedStyle(document.querySelector('p')).fontFamily,
    loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style + ' ' + f.weight),
    articleH: document.querySelector('article').getBoundingClientRect().height,
    els: els.map(e => {
      const r = e.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(e);
      const lines = new Set([...range.getClientRects()].map(x => Math.round(x.top))).size;
      return { tag: e.tagName, top: +r.top.toFixed(2), h: +r.height.toFixed(2), lines };
    }),
  };
};
async function run(browser, width, block, cssOverride) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  if (block) await p.route('**/*.ttf', r => r.abort());
  if (cssOverride) await p.route('**/fonts.css', r => r.fulfill({ contentType: 'text/css', body: cssOverride }));
  await p.goto(url);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.fonts].map(f => f.load().catch(() => null))));
  await p.waitForTimeout(100);
  const s = await p.evaluate(snap);
  await ctx.close();
  return s;
}
(async () => {
  const b = await chromium.launch();
  const naive = `.prose{font-family:"Source Serif 4",Georgia,serif}` + require('fs').readFileSync(path.resolve(__dirname,'..','fonts.css'),'utf8').replace(/\.prose\s*\{[^}]*\}/, '');
  let worstTuned = 0, worstNaive = 0, lineMismatch = 0, naiveLineMismatch = 0;
  for (const w of [320, 360, 375, 390, 414, 480, 540, 600, 640, 700, 768, 1024, 1280]) {
    const before = await run(b, w, true), after = await run(b, w, false);
    const nb = await run(b, w, true, naive);
    if (w === 320) { console.log('fallback faces loaded:', before.loaded); console.log('webfont faces loaded:', after.loaded); }
    const d = before.els.map((e, i) => Math.abs(e.top - after.els[i].top));
    const nd = nb.els.map((e, i) => Math.abs(e.top - after.els[i].top));
    const lb = before.els.map(e => e.lines).join('/'), la = after.els.map(e => e.lines).join('/'), ln = nb.els.map(e => e.lines).join('/');
    if (lb !== la) lineMismatch++; if (ln !== la) naiveLineMismatch++;
    worstTuned = Math.max(worstTuned, ...d); worstNaive = Math.max(worstNaive, ...nd);
    console.log(`${w}px  lines fallback ${lb} webfont ${la} plainGeorgia ${ln} | max top shift tuned ${Math.max(...d).toFixed(2)}px, plain Georgia ${Math.max(...nd).toFixed(2)}px | article h ${before.articleH.toFixed(1)} -> ${after.articleH.toFixed(1)}`);
  }
  console.log({ worstTuned, worstNaive, lineMismatch, naiveLineMismatch });
  await b.close();
})();
