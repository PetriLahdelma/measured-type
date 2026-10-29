const { chromium } = require('playwright');
const W = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + W + '/article.html');
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(async () => {
    await document.fonts.load('400 18px "Source Serif 4"'); await document.fonts.load('italic 400 18px "Source Serif 4"'); await document.fonts.load('700 36px "Source Serif 4"');await document.fonts.load('italic 700 36px "Source Serif 4"');
    const res = {};
    const sample = (txt, font) => { const s = document.createElement('span'); s.style.cssText = 'white-space:nowrap;position:absolute;font:' + font; s.textContent = txt; document.body.append(s); const w = s.getBoundingClientRect().width; s.remove(); return w; };
    const paras = [...document.querySelectorAll('#body p')].map(p => p.textContent.replace(/\s+/g, ' '));
    const all = paras.join(' ');
    res.regular = sample(all, '400 18px "Source Serif 4"') / sample(all, '400 18px Georgia');
    paras.forEach((t, i) => res['p' + i] = sample(t, '400 18px "Source Serif 4"') / sample(t, '400 18px Georgia'));
    const it = 'nothing else and some more italic words for a fair sample of emphasis in running text';
    res.italic = sample(it, 'italic 400 18px "Source Serif 4"') / sample(it, 'italic 400 18px Georgia');
    const h = 'Notes from the field';
    res.bold = sample(h, '700 36px "Source Serif 4"') / sample(h, '700 36px Georgia');
    res.boldItalicProse = sample(all, "italic 700 36px \"Source Serif 4\"") / sample(all, "italic 700 36px Georgia"); res.italicProse = sample(all, "italic 400 18px \"Source Serif 4\"") / sample(all, "italic 400 18px Georgia");
    res.boldProse = sample(all, '700 36px "Source Serif 4"') / sample(all, '700 36px Georgia');
    return res;
  });
  for (const [k, v] of Object.entries(r)) console.log(k, (v * 100).toFixed(2) + '%');
  await b.close();
})();
