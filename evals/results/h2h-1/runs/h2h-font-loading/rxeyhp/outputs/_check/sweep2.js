const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
// Generic running prose (not the article) for the width ratio.
const prose = `When a reader settles into a long piece of writing, the page becomes a kind of room. They notice its proportions only when something is wrong with them: a column that runs too wide, a line that crowds the next, a word that hops to a new line for no reason they can see. Good settings disappear. The reader forgets the type and remembers the argument, which is the whole point of the exercise. Publishers have known this for centuries, and the web has spent a few decades relearning it, one awkward reflow at a time. Short sentences help. So do generous margins, quiet colour, and a face drawn for reading at the size it is actually used.`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + root + '/article.html');
  await p.evaluate(() => document.fonts.ready);
  const out = await p.evaluate(async ({ prose }) => {
    const w = (fam, style, weight, size) => { const s = document.createElement('span'); s.style.cssText = `font-family:${fam};font-style:${style};font-weight:${weight};font-size:${size}px;white-space:nowrap;position:absolute`; s.textContent = prose; document.body.append(s); const x = s.getBoundingClientRect().width; s.remove(); return x; };
    const r = {};
    for (const [k, st, wt, sz] of [['regular18','normal',400,18],['italic18','italic',400,18],['bold18','normal',700,18],['bolditalic18','italic',700,18],['regular36','normal',400,36],['italic36','italic',400,36],['bold36','normal',700,36],['bolditalic36','italic',700,36]])
      r[k] = (w('"Source Serif 4"', st, wt, sz) / w('Georgia', st, wt, sz) * 100).toFixed(2);
    return r;
  }, { prose });
  console.log(out);
  await b.close();
})();
