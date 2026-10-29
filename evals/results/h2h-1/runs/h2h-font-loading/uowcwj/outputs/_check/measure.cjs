// Measures advance widths of the article's own text in Source Serif 4 vs Georgia
// at the sizes/weights/styles the page actually uses.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const dir = path.resolve(process.argv[2]);
const html = fs.readFileSync(path.join(dir, 'article.html'), 'utf8');
const text = html.match(/<article[\s\S]*<\/article>/)[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const page = `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:SS;src:url('../fonts/SourceSerif4[opsz,wght].ttf') format('truetype');font-weight:200 900;font-style:normal}
@font-face{font-family:SS;src:url('../fonts/SourceSerif4-Italic[opsz,wght].ttf') format('truetype');font-weight:200 900;font-style:italic}
@font-face{font-family:G;src:local('Georgia');font-weight:400;font-style:normal}
@font-face{font-family:G;src:local('Georgia Bold'),local('Georgia-Bold');font-weight:700;font-style:normal}
@font-face{font-family:G;src:local('Georgia Italic'),local('Georgia-Italic');font-weight:400;font-style:italic}
span{white-space:nowrap;display:inline-block}
</style><body></body>`;
(async () => {
  const f = path.join(dir, '_check', 'measure.html'); fs.writeFileSync(f, page);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + f);
  const res = await p.evaluate(async (text) => {
    const cases = [['regular@18', 400, 'normal', 18], ['italic@18', 400, 'italic', 18], ['bold@36', 700, 'normal', 36], ['bold@18', 700, 'normal', 18], ['regular@36', 400, 'normal', 36]];
    const out = {};
    for (const [name, w, st, sz] of cases) {
      const m = {};
      for (const fam of ['SS', 'G']) {
        await document.fonts.load(`${st} ${w} ${sz}px ${fam}`, text);
        const s = document.createElement('span');
        s.style.cssText = `font-family:${fam};font-weight:${w};font-style:${st};font-size:${sz}px`;
        s.textContent = text; document.body.append(s);
        m[fam] = s.getBoundingClientRect().width;
      }
      out[name] = { ss: +m.SS.toFixed(2), georgia: +m.G.toFixed(2), ratio: +(m.SS / m.G).toFixed(4) };
    }
    out.faces = [...document.fonts].map(f => `${f.family} ${f.style} ${f.weight} ${f.status}`);
    return out;
  }, text);
  console.log(JSON.stringify(res, null, 1));
  await b.close(); fs.unlinkSync(f);
})();
