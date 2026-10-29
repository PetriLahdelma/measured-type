const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const geo = async (f) => { await p.goto('file://' + path.resolve(__dirname, f)); return p.evaluate(() =>
    [...document.querySelectorAll('body *')].map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return [e.tagName, e.className, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), cs.fontSize, cs.fontWeight].join(' '); })); };
  const a = await geo('en-orig.html'), c = await geo('en.html');
  const diffs = a.filter((l, i) => l !== c[i]);
  console.log('EN geometry diffs vs help.css:', diffs.length, diffs.slice(0, 5));
  for (const f of ['en-orig.html', 'en.html', 'ar.html']) { await p.goto('file://' + path.resolve(__dirname, f)); await p.screenshot({ path: path.resolve(__dirname, f + '.png') }); }
  await p.goto('file://' + path.resolve(__dirname, 'ar.html'));
  console.log(await p.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect();
    const h = q('.title h2'), t = q('.tag'), n = q('.note'), st = q('.steps li'), help = q('.help');
    return { tagRight: t.right, titleRight: q('.title').right, tagLeft: t.left, h2Right: h.right,
      noteBorderR: getComputedStyle(document.querySelector('.note')).borderRightWidth, noteBorderL: getComputedStyle(document.querySelector('.note')).borderLeftWidth,
      stepsPadR: getComputedStyle(document.querySelector('.steps')).paddingRight, helpRight: help.right, bodyFont: getComputedStyle(document.body).fontSize,
      h2Weight: getComputedStyle(document.querySelector('h2')).fontWeight }; }));
  await b.close();
})();
