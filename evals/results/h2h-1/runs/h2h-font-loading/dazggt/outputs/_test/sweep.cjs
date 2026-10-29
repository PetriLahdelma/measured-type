// Sweep size-adjust values for the fallback faces; report viewport widths whose
// block heights differ between web font and fallback.
// usage: node sweep.cjs <outputs dir> <face: regular|italic> <from> <to> <step>
const { chromium, webkit } = require('playwright'); const path = require('path');
const [dir, face, from, to, step] = process.argv.slice(2);
const KEY = [320, 360, 375, 390, 393, 412, 414, 428, 430];
(async () => { for (const bt of [chromium, webkit]) {
  const b = await bt.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file://' + path.resolve(dir, 'article.html')); await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(async ({ face, from, to, step }) => {
    const src = document.getElementById('body');
    const A = src.cloneNode(true), B = src.cloneNode(true);
    for (const x of [A, B]) { x.removeAttribute('id'); x.style.marginInline = '0'; document.body.append(x); }
    A.style.fontFamily = '"Source Serif 4"'; B.style.fontFamily = 'T';
    const mk = (src, weight, style, sa) => new FontFace('T', src, { weight, style, sizeAdjust: (sa * 100).toFixed(2) + '%', ascentOverride: (103.6 / sa).toFixed(2) + '%', descentOverride: (33.5 / sa).toFixed(2) + '%', lineGapOverride: '0%' });
    const out = [];
    for (let sa = +from; sa <= +to + 1e-9; sa += +step) {
      for (const f of [...document.fonts]) if (f.family.replace(/"/g, '') === 'T') document.fonts.delete(f);
      const faces = [mk('local("Georgia")', '400', 'normal', face === 'regular' ? sa : 1.0315), mk('local("Georgia Italic")', '400', 'italic', face === 'italic' ? sa : 0.933), mk('local("Georgia Bold")', '700', 'normal', 0.861)];
      await Promise.all(faces.map(f => f.load())); faces.forEach(f => document.fonts.add(f));
      const bad = [];
      for (let w = 256; w <= 576; w++) {
        A.style.width = B.style.width = w + 'px';
        const ha = [...A.children].map(e => e.getBoundingClientRect().height), hb = [...B.children].map(e => e.getBoundingClientRect().height);
        if (ha.some((h, i) => Math.abs(h - hb[i]) > 0.5)) bad.push(w + 32);
      }
      out.push([+sa.toFixed(4), bad]);
    }
    return out;
  }, { face, from, to, step });
  for (const [sa, bad] of res) console.log(bt.name(), sa, 'fails:', bad.length, 'key-device fails:', bad.filter(v => KEY.includes(v)).join(',') || 'none');
  await b.close(); } })();
