const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const out = {};
  for (const w of [1280, 320]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    const shots = {};
    for (const f of ['ltr-old', 'ltr-new', 'rtl-same', 'rtl-ar']) {
      await p.goto('file://' + path.join(__dirname, f + '.html'));
      shots[f] = await p.screenshot({ fullPage: true, path: path.join(__dirname, `${f}-${w}.png`) });
      const g = await p.evaluate(() => {
        const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right) }; };
        const cs = (s, pr, pe) => getComputedStyle(document.querySelector(s), pe || null)[pr];
        const h2 = document.querySelector('.title h2'), tag = document.querySelector('.tag');
        const li = document.querySelector('.steps li');
        return {
          dir: document.documentElement.dir, vw: innerWidth, scrollW: document.documentElement.scrollWidth,
          h2: r('.title h2'), tag: r('.tag'), noteBorderL: cs('.note','borderLeftWidth'), noteBorderR: cs('.note','borderRightWidth'),
          stepsPadL: cs('.steps','paddingLeft'), stepsPadR: cs('.steps','paddingRight'),
          h2PadL: cs('.title h2','paddingLeft'), h2PadR: cs('.title h2','paddingRight'), h2Align: cs('.title h2','textAlign'),
          arrow: cs('.next','content','::after'), font: cs('body','fontFamily'), lh: cs('body','lineHeight'),
          crumbs: [...document.querySelectorAll('.crumbs li')].map(e => Math.round(e.getBoundingClientRect().left)),
          tagOverlapsH2Text: (() => { const rg = document.createRange(); rg.selectNodeContents(h2); const tb = rg.getBoundingClientRect(), gb = tag.getBoundingClientRect(); return !(tb.right <= gb.left || tb.left >= gb.right || tb.bottom <= gb.top || tb.top >= gb.bottom); })(),
        };
      });
      out[`${f}@${w}`] = g;
    }
    out[`ltr identical @${w}`] = Buffer.compare(shots['ltr-old'], shots['ltr-new']) === 0;
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
