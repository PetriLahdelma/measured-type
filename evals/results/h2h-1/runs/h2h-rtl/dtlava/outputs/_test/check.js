const { chromium, webkit, firefox } = require('playwright');
const path = require('path');
const u = f => 'file://' + path.join(__dirname, f);
(async () => {
  for (const bt of [chromium, webkit, firefox]) {
    let b; try { b = await bt.launch(); } catch (e) { console.log(bt.name(), 'unavailable'); continue; }
    const p = await b.newPage({ viewport: { width: 700, height: 600 } });
    const shots = {};
    for (const f of ['en-orig.html', 'en-new.html', 'ar.html']) {
      await p.goto(u(f));
      shots[f] = await p.screenshot({ path: path.join(__dirname, `${bt.name()}-${f}.png`) });
      const info = await p.evaluate(() => {
        const r = s => document.querySelector(s).getBoundingClientRect();
        const cs = (s, pe) => getComputedStyle(document.querySelector(s), pe);
        const h2 = r('.title h2'), tag = r('.tag'), note = r('.note'), steps = r('.steps');
        return {
          tagRightGap: Math.round(r('.title').right - tag.right), tagLeftGap: Math.round(tag.left - r('.title').left),
          h2pad: [cs('.title h2').paddingLeft, cs('.title h2').paddingRight],
          noteBorder: [cs('.note').borderLeftWidth, cs('.note').borderRightWidth],
          stepsPad: [cs('.steps').paddingLeft, cs('.steps').paddingRight],
          sep: cs('.crumbs li + li', '::before').content, arrow: cs('.next', '::after').content,
          crumbsX: [...document.querySelectorAll('.crumbs li')].map(l => Math.round(l.getBoundingClientRect().left)),
        };
      });
      console.log(bt.name(), f, JSON.stringify(info));
    }
    console.log(bt.name(), 'en identical:', Buffer.compare(shots['en-orig.html'], shots['en-new.html']) === 0);
    await b.close();
  }
})();
