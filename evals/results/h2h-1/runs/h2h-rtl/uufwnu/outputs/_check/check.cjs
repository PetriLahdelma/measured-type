const { chromium } = require('playwright'); (async () => {
const dir = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 700, height: 600 } });
const shots = {};
for (const f of ['en-old','en-new','ar-markup','ar-text']) {
  await p.goto('file://' + dir + '/' + f + '.html');
  shots[f] = await p.screenshot({ path: dir + '/' + f + '.png', fullPage: true });
  const info = await p.evaluate(() => {
    const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.top)]; };
    const cs = (s, pse, prop) => getComputedStyle(document.querySelector(s), pse).getPropertyValue(prop);
    return { help: r('.help'), h2: r('.title h2'), tag: r('.tag'), steps: r('.steps li'), note: r('.note'), noteBorderL: cs('.note',null,'border-left-width'), noteBorderR: cs('.note',null,'border-right-width'), arrow: cs('.next','::after','content'), font: cs('body',null,'font'), h2pad: [cs('.title h2',null,'padding-left'), cs('.title h2',null,'padding-right')], h2text: document.querySelector('.title h2').getBoundingClientRect().right };
  });
  console.log(f, JSON.stringify(info));
}
console.log('EN identical bytes:', Buffer.compare(shots['en-old'], shots['en-new']) === 0);
// overflow check at 200% zoom-equivalent (350px)
await p.setViewportSize({ width: 350, height: 600 });
for (const f of ['en-new','ar-text']) { await p.goto('file://' + dir + '/' + f + '.html'); console.log(f, '350px scrollW', await p.evaluate(() => document.documentElement.scrollWidth)); await p.screenshot({ path: dir + '/' + f + '-350.png', fullPage: true }); }
await b.close(); })();
