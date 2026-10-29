const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const dir = __dirname;
  const out = {};
  for (const w of [1024, 360]) {
    const p = await b.newPage({ viewport: { width: w, height: 700 } });
    const shots = {};
    for (const f of ['en-original', 'en-new', 'ar-original', 'ar-new']) {
      await p.goto('file://' + path.join(dir, f + '.html'));
      shots[f] = await p.screenshot({ path: path.join(dir, `${f}-${w}.png`), fullPage: true });
      out[`${f}-${w}`] = await p.evaluate(() => {
        const r = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; };
        const cs = (s, pe, prop) => getComputedStyle(document.querySelector(s), pe).getPropertyValue(prop);
        return { h2: r('.title h2'), tag: r('.tag'), note: r('.note'), noteBorderL: cs('.note', null, 'border-left-width'), noteBorderR: cs('.note', null, 'border-right-width'), stepsPadL: cs('.steps', null, 'padding-left'), stepsPadR: cs('.steps', null, 'padding-right'), h2PadR: cs('.title h2', null, 'padding-right'), h2PadL: cs('.title h2', null, 'padding-left'), next: cs('.next', '::after', 'content'), crumb1: r('.crumbs li:first-child'), crumb3: r('.crumbs li:last-child') };
      });
    }
    out[`en-identical-${w}`] = Buffer.compare(shots['en-original'], shots['en-new']) === 0;
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
