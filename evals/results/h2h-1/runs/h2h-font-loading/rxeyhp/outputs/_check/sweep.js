// For a range of size-adjust values on the regular text fallback, count how many
// viewport widths (300..1280) produce different line breaks than the web font.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + root + '/article.html');
  await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(async () => {
    // per-paragraph nowrap width ratios
    const prose = document.querySelector('.prose');
    const ratios = [];
    for (const el of prose.querySelectorAll('p')) {
      const c = el.cloneNode(true); c.style.whiteSpace = 'nowrap'; c.style.position = 'absolute'; c.style.width = 'auto'; prose.append(c);
      const span = document.createElement('span'); span.append(...c.childNodes); c.append(span);
      const a = span.getBoundingClientRect().width;
      c.style.fontFamily = 'Georgia';
      const g = span.getBoundingClientRect().width;
      ratios.push(a / g); c.remove();
    }
    return ratios;
  });
  console.log('per-paragraph SS4/Georgia nowrap ratios (incl. italic run):', res.map(r => (r * 100).toFixed(2)).join(', '));
  await b.close();
})();
