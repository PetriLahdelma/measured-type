const { chromium } = require('playwright');
const { readFileSync, writeFileSync } = require('fs');
const dir = __dirname + '/';
(async()=>{
const base = readFileSync(dir + 'help.html', 'utf8');
const variants = {
  'ltr-orig': base,
  'ltr-new': base.replace('help.css', 'help.rtl.css'),
  'rtl-new': base.replace('help.css', 'help.rtl.css').replace('lang="en" dir="ltr"', 'lang="ar" dir="rtl"'),
};
const b = await chromium.launch();
const out = {};
for (const w of [1024, 320]) {
  for (const [k, html] of Object.entries(variants)) {
    writeFileSync(dir + `_${k}.html`, html);
    const p = await b.newPage({ viewport: { width: w, height: 700 } });
    await p.goto('file://' + dir + `_${k}.html`);
    out[`${k}@${w}`] = await p.screenshot({ fullPage: true });
    if (k === 'rtl-new' && w === 1024) {
      const m = await p.evaluate(() => {
        const r = s => document.querySelector(s).getBoundingClientRect();
        const cs = (s, pe) => getComputedStyle(document.querySelector(s), pe);
        const h2 = document.querySelector('.title h2');
        const range = document.createRange(); range.selectNodeContents(h2);
        const crumbs = [...document.querySelectorAll('.crumbs li')].map(li => Math.round(li.getBoundingClientRect().left));
        return {
          help: r('.help'), tag: r('.tag'), h2text: range.getBoundingClientRect(),
          h2pad: cs('.title h2').paddingRight, h2padL: cs('.title h2').paddingLeft, h2align: cs('.title h2').textAlign,
          stepsPadR: cs('.steps').paddingRight, notesBorderR: cs('.note').borderRightWidth, noteBorderL: cs('.note').borderLeftWidth,
          crumbsLeftX: crumbs, sep: cs('.crumbs li + li', '::before').content, arrow: cs('.next', '::after').content,
        };
      });
      console.log(JSON.stringify(m, null, 1));
      await p.screenshot({ path: dir + 'rtl-preview.png', fullPage: true });
    }
    await p.close();
  }
  console.log(w, 'LTR pixel-identical:', Buffer.compare(out[`ltr-orig@${w}`], out[`ltr-new@${w}`]) === 0);
}
await b.close();
})();
