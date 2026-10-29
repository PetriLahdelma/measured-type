// Sweeps the article column width (every px the layout can produce) and counts
// widths where the fallback wraps any block differently from Source Serif 4,
// for a grid of roman/italic size-adjust values.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file://' + dir + '/article.html'); await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(async () => {
    const A = 1.036, D = 0.335;
    const src = document.querySelector('article');
    const host = document.createElement('div'); document.body.appendChild(host);
    const widths = []; for (let w = 280; w <= 576; w++) widths.push(w);
    const lines = el => { const rg = document.createRange(); rg.selectNodeContents(el); return new Set([...rg.getClientRects()].map(x => Math.round(x.bottom))).size; };
    const layout = fam => { const out = []; const c = src.cloneNode(true); c.removeAttribute('id'); if (fam) c.style.fontFamily = fam; host.appendChild(c);
      for (const w of widths) { c.style.width = w + 'px'; c.style.maxInlineSize = 'none'; out.push([...c.children].map(lines).join(',') + '|' + c.getBoundingClientRect().height.toFixed(2)); }
      c.remove(); return out; };
    const ref = layout(null);
    let n = 0; const mk = async (r, i, bo) => { const fam = 'FB' + (n++);
      const faces = [new FontFace(fam, 'local("Georgia")', { sizeAdjust: r*100+'%', ascentOverride: A/r*100+'%', descentOverride: D/r*100+'%', lineGapOverride: '0%' }),
        new FontFace(fam, 'local("Georgia Italic")', { style: 'italic', sizeAdjust: i*100+'%', ascentOverride: A/i*100+'%', descentOverride: D/i*100+'%', lineGapOverride: '0%' }),
        new FontFace(fam, 'local("Georgia Bold")', { weight: '700', sizeAdjust: bo*100+'%', ascentOverride: A/bo*100+'%', descentOverride: D/bo*100+'%', lineGapOverride: '0%' })];
      for (const f of faces) { await f.load(); document.fonts.add(f); } return fam; };
    const results = [];
    for (let r = 1.0250; r <= 1.03651; r += 0.0005) for (const i of [0.9326, 0.945]) {
      const fam = await mk(r, i, 0.8607); const l = layout(fam);
      const bad = widths.filter((w, k) => l[k] !== ref[k]);
      results.push({ r: +r.toFixed(4), i, bad: bad.length, sample: bad });
    }
    return results;
  });
  for (const x of res) console.log(x.r, x.i, 'mismatched widths:', x.bad, x.sample.join(' '));
  await b.close();
})();
