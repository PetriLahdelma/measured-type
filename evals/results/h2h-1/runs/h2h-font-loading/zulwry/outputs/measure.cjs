(async()=>{
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const dir = process.cwd();
const text = `Most of what we read on screens is read in passing. Long reading is different in kind, not only in length: it asks the reader to hold a thread across pages and to trust that the page will not shift under the eye. A layout that jumps when its fonts arrive breaks that trust at the very first line. The fix is not to hide the text until the font has loaded, which leaves readers looking at a blank page on slow connections. Notes from the field nothing else`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:SS;src:url("fonts/SourceSerif4[opsz,wght].ttf") format("truetype");font-weight:200 900;font-style:normal}
@font-face{font-family:SS;src:url("fonts/SourceSerif4-Italic[opsz,wght].ttf") format("truetype");font-weight:200 900;font-style:italic}
span{white-space:nowrap;position:absolute}
</style></head><body></body></html>`;
const fs = require('fs');
fs.writeFileSync(path.join(dir,'_measure.html'), html);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(dir,'_measure.html')).href);
const res = await p.evaluate(async (text) => {
  await Promise.all([document.fonts.load('400 18px SS'), document.fonts.load('italic 400 18px SS'), document.fonts.load('700 36px SS')]);
  const cases = [['normal',400,18],['italic',400,18],['normal',700,36],['normal',400,36],['normal',700,18]];
  const out = {};
  for (const [st,w,sz] of cases) {
    const m = {};
    for (const fam of ['SS','Georgia']) {
      const s = document.createElement('span');
      s.style.cssText = `font-family:${fam};font-style:${st};font-weight:${w};font-size:${sz}px`;
      s.textContent = text; document.body.appendChild(s);
      m[fam] = s.getBoundingClientRect().width; s.remove();
    }
    out[`${st} ${w} ${sz}`] = {...m, ratio: m.SS/m.Georgia};
  }
  return out;
}, text);
console.log(JSON.stringify(res,null,1));
await b.close();
})();
