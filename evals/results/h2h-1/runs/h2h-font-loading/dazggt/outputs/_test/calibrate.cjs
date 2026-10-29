(async()=>{
const { chromium, webkit } = require('playwright');
const path = require('node:path');
const out = path.resolve(process.argv[2]);
const corpusArticle = `Most of what we read on screens is read in passing. Long reading is different in kind, not only in length: it asks the reader to hold a thread across pages and to trust that the page will not shift under the eye. A layout that jumps when its fonts arrive breaks that trust at the very first line. The fix is not to hide the text until the font has loaded, which leaves readers looking at a blank page on slow connections. It is to make the first font the reader sees take up the same room as the one that replaces it, so that the swap changes the shapes of the letters and nothing else. Measured that way, a page can show its text at once and still look settled when the web font finishes loading a moment later.`;
const corpusGeneric = `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Typography is the visual component of the written word; it should serve the reader, Who, What, When, Where and Why? In 1923, about 45% of the 3,000 pages were set by hand.`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:SS;src:url("../fonts/SourceSerif4%5Bopsz,wght%5D.ttf") format("truetype");font-weight:200 900;font-style:normal}
@font-face{font-family:SS;src:url("../fonts/SourceSerif4-Italic%5Bopsz,wght%5D.ttf") format("truetype");font-weight:200 900;font-style:italic}
span{white-space:nowrap;position:absolute}
</style></head><body></body></html>`;
const fs = require('node:fs');
fs.writeFileSync(path.join(out, '_test/cal.html'), html);
for (const bt of [chromium, webkit]) {
  const b = await bt.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(out, '_test/cal.html'));
  const r = await p.evaluate(async ({ a, g }) => {
    const res = {};
    const cases = [['regular', 'normal', 400, 18], ['italic', 'italic', 400, 18], ['bold27', 'normal', 700, 27], ['bold36', 'normal', 700, 36], ['bolditalic36', 'italic', 700, 36], ['bolditalic18', 'italic', 700, 18], ['bold18', 'normal', 700, 18]];
    for (const [name, style, wt, sz] of cases) {
      await document.fonts.load(`${style} ${wt} ${sz}px SS`);
      for (const [cn, txt] of [['article', a], ['generic', g]]) {
        const m = fam => { const s = document.createElement('span'); s.style.font = `${style} ${wt} ${sz}px ${fam}`; s.textContent = txt; document.body.append(s); const w = s.getBoundingClientRect().width; s.remove(); return w; };
        res[name + '/' + cn] = +(m('SS') / m('Georgia')).toFixed(4);
      }
    }
    return res;
  }, { a: corpusArticle, g: corpusGeneric });
  console.log(bt.name(), r);
  await b.close();
}
})();
