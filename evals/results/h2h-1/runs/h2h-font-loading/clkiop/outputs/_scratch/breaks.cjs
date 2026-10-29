const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve('article.html');
// Height of the article and the first word of each line, per paragraph.
const probe = () => {
  const res = [];
  for (const el of document.querySelectorAll('h1, p')) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const starts = []; let lastTop = null; let n;
    while ((n = w.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const t = Math.round(r.getBoundingClientRect().top); if (t !== lastTop) { starts.push(m[0]); lastTop = t; } } }
    res.push(starts.join(' '));
  }
  return { breaks: res.join(' || '), h: document.querySelector('article').getBoundingClientRect().height };
};
(async () => {
  const browser = await chromium.launch();
  let same = 0, total = 0, plainSame = 0;
  for (const width of [320, 360, 390, 414, 480, 540, 600, 680, 768, 1024]) {
    const go = async (mode) => {
      const p = await browser.newPage({ viewport: { width, height: 900 } });
      if (mode !== 'web') await p.route('**/*.ttf', r => r.abort());
      if (mode === 'plain') await p.route('**/fonts.css', r => r.fulfill({ contentType: 'text/css', body: '.prose{font-family:"Source Serif 4",Georgia,serif}' }));
      await p.goto(url); await p.evaluate(() => document.fonts.ready);
      const o = await p.evaluate(probe); await p.close(); return o;
    };
    const web = await go('web'), fb = await go('fallback'), plain = await go('plain');
    total++; if (web.breaks === fb.breaks && web.h === fb.h) same++; if (web.breaks === plain.breaks && web.h === plain.h) plainSame++;
    console.log(`${String(width).padStart(4)}  article h web ${web.h.toFixed(1)}  tuned ${fb.h.toFixed(1)} ${web.breaks === fb.breaks ? 'same breaks' : 'BREAKS DIFFER'}  | plain Georgia ${plain.h.toFixed(1)} ${web.breaks === plain.breaks ? 'same breaks' : 'breaks differ'}`);
  }
  console.log(`tuned fallback identical at ${same}/${total} widths; plain Georgia at ${plainSame}/${total}`);
  await browser.close();
})();
