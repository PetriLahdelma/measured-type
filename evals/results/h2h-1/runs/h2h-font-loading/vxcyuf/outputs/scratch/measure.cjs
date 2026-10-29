(async()=>{
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const dir = path.resolve('.');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(dir, 'article.html')).href);
const res = await page.evaluate(async () => {
  const css = `
  @font-face{font-family:"SS4";src:url("fonts/SourceSerif4%5Bopsz,wght%5D.ttf") format("truetype");font-weight:200 900;font-style:normal}
  @font-face{font-family:"SS4";src:url("fonts/SourceSerif4-Italic%5Bopsz,wght%5D.ttf") format("truetype");font-weight:200 900;font-style:italic}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
  await Promise.all([document.fonts.load('18px SS4'), document.fonts.load('italic 18px SS4'), document.fonts.load('bold 36px SS4')]);
  const text = document.getElementById('body').textContent.replace(/\s+/g,' ').trim();
  const out = {};
  for (const [label, style, weight, size] of [['regular','normal',400,18],['italic','italic',400,18],['bold','normal',700,36],['bolditalic','italic',700,18],['bold18','normal',700,18]]) {
    const w = {};
    for (const fam of ['SS4','Georgia']) {
      const s = document.createElement('span');
      s.style.cssText = `font-family:${fam};font-style:${style};font-weight:${weight};font-size:${size}px;white-space:nowrap;position:absolute`;
      s.textContent = text; document.body.append(s);
      w[fam] = s.getBoundingClientRect().width; s.remove();
    }
    out[label] = { ...w, ratio: w.SS4 / w.Georgia };
  }
  return out;
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
})();
