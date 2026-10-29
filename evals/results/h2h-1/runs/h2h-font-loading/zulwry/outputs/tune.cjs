// Width ratio of Source Serif 4 to Georgia on the article's own text, per style.
const { chromium } = require('playwright');
const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(pathToFileURL(path.join(process.cwd(), 'article.html')).href);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([document.fonts.load('400 18px "Source Serif 4"'), document.fonts.load('italic 400 18px "Source Serif 4"'), document.fonts.load('700 36px "Source Serif 4"')]));
  const r = await p.evaluate(() => {
    const ps = [...document.querySelectorAll('p')];
    const regular = ps.map(p => [...p.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join(' ')).join(' ').replace(/\s+/g, ' ');
    const cases = { regular: ['normal', 400, 18, regular], italic: ['italic', 400, 18, document.querySelector('em').textContent + ' ' + regular.slice(0, 200)], bold36: ['normal', 700, 36, document.querySelector('h1').textContent + ' ' + regular.slice(0, 300)] };
    const out = {};
    for (const [k, [st, w, sz, t]] of Object.entries(cases)) {
      const m = {};
      for (const fam of ['"Source Serif 4"', 'Georgia']) {
        const s = document.createElement('span'); s.style.cssText = `position:absolute;white-space:nowrap;font-family:${fam};font-style:${st};font-weight:${w};font-size:${sz}px;font-synthesis:none`;
        s.textContent = t; document.body.appendChild(s); m[fam] = s.getBoundingClientRect().width; s.remove();
      }
      const ratio = m['"Source Serif 4"'] / m.Georgia;
      out[k] = { size: (ratio * 100).toFixed(2) + '%', asc: (103.6 / ratio).toFixed(2) + '%', desc: (33.5 / ratio).toFixed(2) + '%' };
    }
    return out;
  });
  console.log(r); await b.close();
})();
