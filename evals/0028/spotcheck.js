#!/usr/bin/env node
// Spec 0028 spot-check: re-measures the drawn findings on the live pages with code of its own. It
// shares no measuring helper with the tools; it only names elements the way page-audit.js does, so
// a finding's location can be found again.
//   NODE_PATH=skills/measured-type/node_modules node evals/0028/spotcheck.js <folder holding pages/>
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { spotSample, lineSample } = require('./analyze.js');

const RULES = ['MT-CONTRAST', 'MT-REFLOW', 'MT-TEXT-SPACING', 'MT-ZOOM-VW'];
const SPACING = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }';

// In-page: every element whose page-audit-style path equals the location.
function findByPath(location) {
  const part = (e) => {
    const t = e.tagName.toLowerCase();
    if (e.id) return `${t}#${e.id}`;
    const c = [...e.classList].filter((x) => !x.startsWith('mt-')).slice(0, 2);
    return c.length ? `${t}.${c.join('.')}` : t;
  };
  const pathOf = (el) => {
    const parts = [part(el)];
    for (let p = el.parentElement; p && parts.length < 3 && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      parts.unshift(part(p));
      if (p.id) break;
    }
    return parts.join(' > ');
  };
  return [...document.querySelectorAll('*')].filter((el) => pathOf(el) === location);
}

const locationOf = (f) => f.location.replace(/ at \d+ CSS px.*$/, '').replace(/ under the 1\.4\.12 override$/, '').replace(/ at \d+px$/, '').split(', ')[0];

async function open(browser, url, width, height = 900) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.evaluate(`(${findByPath.toString()}, window.__find = ${findByPath.toString()})`);
  return page;
}

// WCAG 2.2 relative luminance (0.04045 threshold), alpha-composited grounds up the ancestor chain,
// plus the dominant pixel of the element's own screenshot as a second reading of the ground.
async function contrast(browser, f) {
  const page = await open(browser, f.url, 1280);
  try {
    const els = await page.evaluateHandle((loc) => window.__find(loc), locationOf(f));
    const n = await els.evaluate((a) => a.length);
    if (!n) return { verdict: 'unclear', note: 'element not found on the live page' };
    const css = await els.evaluate((a) => {
      const rgba = (s) => { const m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(s); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
      const over = (top, under) => top.slice(0, 3).map((c, i) => c * top[3] + under[i] * (1 - top[3])).concat(1);
      const lum = ([r, g, b]) => [r, g, b].map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
      const el = a.find((e) => e.getBoundingClientRect().width > 0) || a[0];
      const layers = [];
      let image = false;
      for (let p = el; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.backgroundImage !== 'none') image = true;
        const bg = rgba(s.backgroundColor);
        if (bg && bg[3] > 0) { layers.push(bg); if (bg[3] === 1) break; }
      }
      let ground = [255, 255, 255, 1];
      for (const l of layers.reverse()) ground = over(l, ground);
      // Opacity on the element or an ancestor below its ground fades the text into the ground.
      let fade = 1;
      for (let p = el; p; p = p.parentElement) { fade *= parseFloat(getComputedStyle(p).opacity); const bg = rgba(getComputedStyle(p).backgroundColor); if (bg && bg[3] > 0) break; }
      const raw = rgba(getComputedStyle(el).color);
      const ink = [raw[0], raw[1], raw[2], raw[3] * fade];
      const text = over(ink, ground);
      const ratio = (a, b) => { const [L1, L2] = [lum(a), lum(b)].sort((x, y) => y - x); return (L1 + 0.05) / (L2 + 0.05); };
      el.scrollIntoView({ block: 'center' });
      return { ratio: ratio(text, ground), ink, text: text.slice(0, 3).map(Math.round), ground: ground.slice(0, 3).map(Math.round), image, fade, size: parseFloat(getComputedStyle(el).fontSize), weight: +getComputedStyle(el).fontWeight };
    });
    const handle = await els.evaluateHandle((a) => a.find((e) => e.getBoundingClientRect().width > 0) || a[0]);
    const shot = await handle.asElement().screenshot({ timeout: 10000 }).catch(() => null);
    let pixel = null;
    if (shot) {
      pixel = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; const count = new Map();
        for (let i = 0; i < d.length; i += 4) { const k = `${d[i]},${d[i + 1]},${d[i + 2]}`; count.set(k, (count.get(k) || 0) + 1); }
        return [...count.entries()].sort((x, y) => y[1] - x[1])[0][0].split(',').map(Number);
      }, shot.toString('base64'));
    }
    const large = css.size >= 24 || (css.size >= 18.66 && css.weight >= 700);
    const need = large ? 3 : 4.5;
    // The screenshot's dominant colour is the ground the reader sees, whatever element painted it.
    const lum = (rgb) => rgb.map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
    const onPixel = pixel ? (() => { const t = css.ink.slice(0, 3).map((c, i) => c * css.ink[3] + pixel[i] * (1 - css.ink[3])); const [a, b] = [lum(t), lum(pixel)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); })() : null;
    const verdict = css.ratio < need && onPixel !== null && onPixel < need ? 'true' : (onPixel !== null && onPixel >= need) || css.ratio >= need ? 'false' : 'unclear';
    return { verdict, note: `independent ${css.ratio.toFixed(2)}:1 on the ancestors' ground (text ${css.text} on ${css.ground}, opacity ${css.fade}), ${onPixel ? onPixel.toFixed(2) : '?'}:1 on the screenshot ground ${pixel || 'none'}; needs ${need}${css.image ? '; a background image is in the chain' : ''}` };
  } finally { await page.close(); }
}

async function reflow(browser, f) {
  const page = await open(browser, f.url, 320, 225);
  try {
    return await page.evaluate((loc) => {
      const sw = document.documentElement.scrollWidth;
      const els = window.__find(loc);
      const past = els.map((e) => Math.round(e.getBoundingClientRect().right - 320)).filter((x) => x > 1);
      const scrolls = sw > 321;
      const verdict = scrolls || past.length ? 'true' : els.length ? 'false' : 'unclear';
      return { verdict, note: `page ${sw}px wide in 320px; ${els.length} element(s) found, ${past.length} past the right edge (${past.slice(0, 3).join(', ')}px)` };
    }, locationOf(f));
  } finally { await page.close(); }
}

async function textSpacing(browser, f) {
  const page = await open(browser, f.url, 1280);
  try {
    await page.addStyleTag({ content: SPACING });
    await page.waitForTimeout(500);
    return await page.evaluate((loc) => {
      const els = window.__find(loc).filter((e) => e.getBoundingClientRect().height > 1);
      if (!els.length) return { verdict: 'unclear', note: 'element not found or collapsed' };
      const el = els[0];
      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const texts = [];
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent.trim()) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const rect of r.getClientRects()) if (rect.width > 0) texts.push(rect);
      }
      // Hidden: text a clipping axis cuts off. Overlapped: text past the box that a visible next sibling's text covers.
      const clipsY = /hidden|clip/.test(cs.overflowY);
      const clipsX = /hidden|clip/.test(cs.overflowX);
      const cut = texts.filter((t) => (clipsY && t.bottom > box.bottom + 1) || (clipsX && t.right > box.right + 1)).length;
      let covered = 0;
      const next = el.nextElementSibling;
      if (next && !clipsY) {
        const nr = [];
        const w2 = document.createTreeWalker(next, NodeFilter.SHOW_TEXT);
        for (let n = w2.nextNode(); n; n = w2.nextNode()) { const r = document.createRange(); r.selectNodeContents(n); for (const x of r.getClientRects()) if (x.width > 0) nr.push(x); }
        covered = texts.filter((t) => t.bottom > box.bottom + 1 && nr.some((x) => x.left < t.right && x.right > t.left && x.top < t.bottom && x.bottom > t.top)).length;
      }
      const verdict = cut || covered ? 'true' : 'false';
      return { verdict, note: `${texts.length} text boxes; ${cut} cut by overflow (${cs.overflowX}/${cs.overflowY}), ${covered} overlapping the next block's text; box ${Math.round(box.height)}px, content ${el.scrollHeight}px` };
    }, locationOf(f));
  } finally { await page.close(); }
}

async function zoomVw(browser, f) {
  const sizes = [];
  for (const w of [1280, 640, 256]) {
    const page = await open(browser, f.url, w, Math.round((900 * w) / 1280));
    sizes.push(await page.evaluate((loc) => { const e = window.__find(loc)[0]; return e ? parseFloat(getComputedStyle(e).fontSize) : null; }, locationOf(f)));
    await page.close();
  }
  if (sizes.includes(null)) return { verdict: 'unclear', note: `sizes ${sizes}` };
  const g200 = (2 * sizes[1]) / sizes[0];
  const g500 = (5 * sizes[2]) / sizes[0];
  // WCAG 1.4.4 asks that text can reach 200%; any zoom level that gets there passes.
  const verdict = Math.max(g200, g500) < 1.99 ? 'true' : 'false';
  return { verdict, note: `${sizes[0]}px: ${g200.toFixed(2)}× at 200%, ${g500.toFixed(2)}× at 500%` };
}

async function lines(browser, l) {
  const page = await open(browser, l.url, 1280);
  try {
    return await page.evaluate((selector) => {
      const counts = [];
      for (const el of document.querySelectorAll(selector)) {
        if (!el.getClientRects().length) continue;
        const words = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          for (const m of n.textContent.matchAll(/\S+/g)) {
            const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
            const rect = r.getClientRects()[0];
            if (rect && rect.width > 0) words.push({ top: rect.top, len: [...m[0]].length });
          }
        }
        const rows = [];
        for (const w of words) { const row = rows.find((x) => Math.abs(x.top - w.top) < 4); if (row) row.words.push(w.len); else rows.push({ top: w.top, words: [w.len] }); }
        rows.sort((a, b) => a.top - b.top);
        for (const row of rows.slice(0, -1)) counts.push(row.words.reduce((s, x) => s + x, 0) + row.words.length - 1);
      }
      const avg = counts.reduce((s, x) => s + x, 0) / (counts.length || 1);
      return { avg: Math.round(avg * 10) / 10, lines: counts.length };
    }, l.selector);
  } finally { await page.close(); }
}

(async () => {
  const dir = path.join(process.argv[2], 'pages');
  const pages = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const browser = await chromium.launch();
  const out = [];
  const run = async (kind, item, fn) => {
    let r;
    try { r = await fn(browser, item); } catch (e) { r = { verdict: 'unclear', note: `could not re-measure: ${String(e.message).split('\n')[0].slice(0, 120)}` }; }
    out.push({ kind, url: item.url, location: item.location, measured: item.measured, ...r });
    console.log(`${kind} | ${r.verdict} | ${item.url} | ${item.measured || `${item.avg} chars/line`} | ${r.note}`);
  };
  const fns = { 'MT-CONTRAST': contrast, 'MT-REFLOW': reflow, 'MT-TEXT-SPACING': textSpacing, 'MT-ZOOM-VW': zoomVw };
  for (const rule of RULES) for (const f of spotSample(pages, rule, 5)) await run(rule, f, fns[rule]);
  for (const l of lineSample(pages, 5)) {
    await run('lines', l, async (b, x) => {
      const r = await lines(b, x);
      const off = Math.abs(r.avg - x.avg);
      return { verdict: off <= 3 ? 'true' : 'false', note: `independent ${r.avg} over ${r.lines} lines against ${x.avg}` };
    });
  }
  await browser.close();
  fs.writeFileSync(path.join(process.argv[2], 'spotcheck.json'), `${JSON.stringify(out, null, 2)}\n`);
})();
