#!/usr/bin/env node
/**
 * Deterministic graders for the h2h-* cases (spec 0001, part E). Written and
 * committed before any head-to-head output was read. Every rendered check
 * runs in Chromium; the two audit-text checks are fixed patterns.
 *
 *   NODE_PATH=skills/measured-type/node_modules node evals/h2h-grade.js <case> <outputs-dir>
 *
 * Prints grading.json (expectations with text, passed, evidence) to stdout.
 * Characters per line use scripts/measure-line.js, whose behaviour is pinned
 * by its own tests; everything else is computed here.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { measureLines } = require('../skills/measured-type/scripts/measure-line.js');

const ASSERTIONS = (name) => fs.readdirSync(path.join(__dirname, name, 'graders')).sort()
  .map((f) => fs.readFileSync(path.join(__dirname, name, 'graders', f), 'utf8').split('---\n')[2].trim());

// Copy the outputs to a temp folder so grading never writes into them.
function stage(outputs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h2h-grade-'));
  fs.cpSync(outputs, dir, { recursive: true });
  return dir;
}

function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

async function open(browser, file, width, opts = {}) {
  const page = await browser.newPage({ viewport: { width, height: opts.height || 900 } });
  if (opts.blockFonts) await page.route(/\.(ttf|otf|woff2?)(\?.*)?$/i, (r) => r.abort());
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (opts.css) await page.addStyleTag({ content: opts.css });
  if (opts.rtl) await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; });
  await page.addScriptTag({ content: measureLines.toString() });
  return page;
}

// ---------- h2h-page-audit ----------

async function gradePageAudit(browser, dir) {
  let file = path.join(dir, 'page.fixed.html');
  if (!fs.existsSync(file)) {
    file = path.join(dir, '__graded.html');
    fs.writeFileSync(file, fs.readFileSync(path.join(dir, 'page.html'), 'utf8').replace('href="page.css"', 'href="page.fixed.css"'));
  }
  const hasCss = fs.existsSync(path.join(dir, 'page.fixed.css'));
  const audit = fs.existsSync(path.join(dir, 'audit.md')) ? fs.readFileSync(path.join(dir, 'audit.md'), 'utf8') : '';
  const out = [];

  const p320 = await open(browser, file, 320);
  const sw = await p320.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  out.push([sw.sw <= sw.cw + 1, `scrollWidth ${sw.sw} in a ${sw.cw}px viewport`]);
  await p320.close();

  const p = await open(browser, file, 1280);
  const low = await p.evaluate(() => {
    const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const res = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el);
      let bg = null;
      for (let q = el; q; q = q.parentElement) {
        const b = getComputedStyle(q).backgroundColor;
        const v = parse(b);
        if (v.length === 3 || (v.length === 4 && v[3] > 0)) { bg = v; break; }
      }
      const fg = parse(cs.color);
      res.push({ tag: el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ''), fg, bg: bg || [255, 255, 255], size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) });
    }
    return res;
  });
  const failing = low.filter((t) => {
    const a = t.fg.length > 3 ? t.fg[3] : 1;
    const fg = [0, 1, 2].map((i) => t.fg[i] * a + t.bg[i] * (1 - a));
    const [l1, l2] = [luminance(fg), luminance(t.bg)].sort((x, y) => y - x);
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    t.ratio = ratio.toFixed(2);
    return ratio < (t.size >= 24 || (t.size >= 18.66 && t.weight >= 700) ? 3 : 4.5);
  });
  out.push([failing.length === 0, failing.length ? `below ratio: ${failing.map((t) => `${t.tag} ${t.ratio}:1`).join(', ')}` : `all ${low.length} text elements pass`]);

  const cpl = await p.evaluate(() => {
    const ps = [...document.querySelectorAll('main p, body > p')].filter((e) => e.textContent.trim().length > 100);
    ps.forEach((e, i) => e.setAttribute('data-g', i));
    return ps.map((e, i) => measureLines(`[data-g="${i}"]`)).filter((m) => m.fullLines);
  });
  const lines = cpl.reduce((s, m) => s + m.fullLines, 0);
  const avg = lines ? cpl.reduce((s, m) => s + m.avgCharsPerLine * m.fullLines, 0) / lines : null;
  const each = cpl.map((m) => m.avgCharsPerLine);
  out.push([avg !== null && each.every((a) => a >= 45 && a <= 75), `per paragraph ${each.join(', ')}; pooled ${avg && avg.toFixed(1)}`]);

  const just = await p.evaluate(() => [...document.querySelectorAll('p')].filter((e) => {
    const cs = getComputedStyle(e);
    return cs.textAlign === 'justify' && cs.hyphens !== 'auto';
  }).length);
  await p.close();

  const h1 = async (w) => { const q = await open(browser, file, w); const s = await q.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)); await q.close(); return s; };
  const [s1280, s256] = [await h1(1280), await h1(256)];
  const g = (5 * s256) / s1280;
  out.push([g >= 1.99, `h1 ${s1280}px at 1280, ${s256}px at 256: ${g.toFixed(2)}× by 500% zoom`]);

  const sp = await open(browser, file, 1280, { css: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }' });
  const clipped = await sp.evaluate(() => [...document.body.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    return /hidden|clip/.test(cs.overflowX + cs.overflowY) && el.textContent.trim() && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
  }).map((el) => el.tagName.toLowerCase() + (el.className ? `.${el.className}` : '')));
  await sp.close();
  out.push([clipped.length === 0, clipped.length ? `clipped: ${clipped.join(', ')}` : 'nothing clipped']);
  out.push([just === 0, `${just} justified paragraph(s) without hyphens: auto`]);

  const a7 = /table/i.test(audit) && /(scroll|overflow|reflow)/i.test(audit) && /(320|400\s*%|narrow|small screen|mobile|phone|zoom)/i.test(audit);
  out.push([a7, a7 ? 'audit names the table overflow at narrow widths or zoom' : 'no mention of the table causing sideways scroll']);
  const a8 = /\.?meta\b/i.test(audit) && /\d+(\.\d+)?\s*:\s*1/.test(audit);
  out.push([a8, a8 ? 'audit names .meta and a contrast ratio' : 'no .meta contrast figure']);
  if (!hasCss && !fs.existsSync(path.join(dir, 'page.fixed.html'))) out.forEach((o) => { o[0] = false; o[1] = 'no page.fixed.css'; });
  return out;
}

// ---------- h2h-font-loading ----------

async function gradeFontLoading(browser, dir) {
  const cssPath = path.join(dir, 'fonts.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/gi)].map((m) => m[1]);
  const out = [];
  const romanFace = faces.find((f) => /fonts\/SourceSerif4(%5B|\[)opsz/i.test(f.replace(/\s/g, '')) || /SourceSerif4(%5B|\[)opsz,wght(%5D|\])\.ttf/i.test(f));
  const display = romanFace && /font-display\s*:\s*(swap|fallback|optional)/i.exec(romanFace);
  out.push([Boolean(romanFace && display), romanFace ? `roman @font-face, font-display ${display ? display[1] : 'missing'}` : 'no @font-face for the roman file']);
  const italicFace = faces.find((f) => /SourceSerif4-Italic/i.test(f) && /font-style\s*:\s*italic/i.test(f));
  out.push([Boolean(italicFace), italicFace ? 'italic @font-face with font-style: italic' : 'no italic @font-face']);

  const file = path.join(dir, 'article.html');
  const measure = async (blockFonts) => {
    const p = await open(browser, file, 1280, { blockFonts });
    const r = await p.evaluate(() => {
      const ps = [...document.querySelectorAll('#body p')];
      ps.forEach((e, i) => e.setAttribute('data-g', i));
      const ms = ps.map((e, i) => measureLines(`[data-g="${i}"]`)).filter((m) => m.fullLines);
      const lines = ms.reduce((s, m) => s + m.fullLines, 0);
      return { h: document.getElementById('body').getBoundingClientRect().height, cpl: lines ? ms.reduce((s, m) => s + m.avgCharsPerLine * m.fullLines, 0) / lines : null };
    });
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#body p' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    await p.close();
    return { ...r, fonts: fonts.map((f) => f.familyName) };
  };
  const loaded = await measure(false);
  const blocked = await measure(true);
  const webOk = loaded.fonts.some((f) => /source serif/i.test(f));
  const dh = Math.abs(blocked.h - loaded.h) / loaded.h;
  const dc = loaded.cpl && blocked.cpl ? Math.abs(blocked.cpl - loaded.cpl) / loaded.cpl : 1;
  out.push([webOk && dh <= 0.02, `height loaded ${loaded.h.toFixed(1)} (${loaded.fonts.join(', ')}), blocked ${blocked.h.toFixed(1)}: ${(dh * 100).toFixed(2)}%`]);
  out.push([webOk && dc <= 0.03, `chars/line loaded ${loaded.cpl && loaded.cpl.toFixed(1)}, blocked ${blocked.cpl && blocked.cpl.toFixed(1)}: ${(dc * 100).toFixed(2)}%`]);
  out.push([blocked.fonts.some((f) => /georgia/i.test(f)), `blocked state renders in ${blocked.fonts.join(', ')}`]);
  return out;
}

// ---------- h2h-rtl ----------

// Which way the second breadcrumb separator points, read from rendered pixels:
// a chevron's middle row reaches further toward its point than its ends do.
async function separatorPoints(browser, file, rtl) {
  const p = await browser.newPage({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 4 });
  await p.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  if (rtl) await p.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; });
  const box = await p.evaluate(() => {
    const li = document.querySelectorAll('.crumbs li')[1];
    const lr = li.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(li);
    const tr = range.getBoundingClientRect();
    return lr.right - tr.right > tr.left - lr.left
      ? { x: tr.right, y: lr.top, width: lr.right - tr.right, height: lr.height }
      : { x: lr.left, y: lr.top, width: tr.left - lr.left, height: lr.height };
  });
  if (box.width < 1) { await p.close(); return 'missing'; }
  const png = (await p.screenshot({ clip: box })).toString('base64');
  const way = await p.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    [c.width, c.height] = [img.width, img.height];
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const rows = [];
    for (let y = 0; y < c.height; y++) {
      let lo = null;
      let hi = null;
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        // grey ink only, so a neighbouring link's colour cannot leak in
        if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 180 && Math.abs(d[i] - d[i + 2]) < 40) { if (lo === null) lo = x; hi = x; }
      }
      if (lo !== null) rows.push({ lo, hi });
    }
    if (rows.length < 3) return 'missing';
    const [top, mid, bot] = [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]];
    if (mid.lo < (top.lo + bot.lo) / 2 - 2) return 'left';
    if (mid.hi > (top.hi + bot.hi) / 2 + 2) return 'right';
    return 'unclear';
  }, png);
  await p.close();
  return way;
}

async function gradeRtl(browser, dir) {
  const file = path.join(dir, '__graded.html');
  if (!fs.existsSync(path.join(dir, 'help.rtl.css'))) return ASSERTIONS('h2h-rtl').map(() => [false, 'no help.rtl.css']);
  fs.writeFileSync(file, fs.readFileSync(path.join(dir, 'help.html'), 'utf8').replace('href="help.css"', 'href="help.rtl.css"'));
  const probe = async (rtl) => {
    const p = await open(browser, file, 1280, { rtl });
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const ol = q('.steps');
      const li = q('.steps li');
      const olR = ol.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(li);
      const rects = [...range.getClientRects()];
      const text = { left: Math.min(...rects.map((x) => x.left)), right: Math.max(...rects.map((x) => x.right)) };
      const sep = getComputedStyle(q('.crumbs li + li'), '::before');
      const arrow = getComputedStyle(q('.next'), '::after');
      const note = getComputedStyle(q('.note'));
      const tag = q('.tag').getBoundingClientRect();
      const title = q('.title').getBoundingClientRect();
      return {
        listRightOffset: olR.right - text.right, listLeftOffset: text.left - olR.left, olPadLeft: parseFloat(getComputedStyle(ol).paddingLeft),
        sepContent: sep.content, sepTransform: sep.transform,
        arrowContent: arrow.content, arrowTransform: arrow.transform,
        noteLeft: parseFloat(note.borderLeftWidth), noteRight: parseFloat(note.borderRightWidth),
        tagLeftGap: tag.left - title.left, tagRightGap: title.right - tag.right,
        h2Align: getComputedStyle(q('.title h2')).textAlign, dir: getComputedStyle(q('.title h2')).direction,
      };
    });
    await p.close();
    return r;
  };
  const r = await probe(true);
  const l = await probe(false);
  const flip = (t) => /^matrix\(-1,/.test(t.replace(/\s/g, '')) || /scaleX\(-1\)/.test(t);
  // Corrected after the h2h-1 runs: the frozen check read the ::before
  // content, which failed outputs that isolate the separator as LTR and set
  // U+2039 (they render correctly). The rendered pixels decide now.
  const sepR = await separatorPoints(browser, file, true);
  const sepL = await separatorPoints(browser, file, false);
  return [
    [r.listRightOffset > r.olPadLeft, `RTL: text ${r.listRightOffset.toFixed(1)}px from the right edge, left padding ${r.olPadLeft}px`],
    [sepR === 'left' && sepL === 'right', `separator renders pointing ${sepR} in RTL, ${sepL} in LTR (content ${r.sepContent}, transform ${r.sepTransform})`],
    [r.arrowContent.includes('←') || (r.arrowContent.includes('→') && flip(r.arrowTransform)), `RTL arrow ${r.arrowContent}, transform ${r.arrowTransform}`],
    [r.noteRight >= 3 && r.noteLeft < 1, `RTL note border left ${r.noteLeft}px, right ${r.noteRight}px`],
    [r.tagLeftGap <= 2, `RTL tag ${r.tagLeftGap.toFixed(1)}px from the title's left edge`],
    [r.h2Align === 'right' || (r.h2Align === 'start' && r.dir === 'rtl'), `RTL h2 text-align ${r.h2Align}, direction ${r.dir}`],
    [l.noteLeft >= 3 && l.noteRight < 1 && l.listLeftOffset > 1 && (l.h2Align === 'left' || l.h2Align === 'start') && l.tagRightGap <= 2,
      `LTR note border left ${l.noteLeft}/right ${l.noteRight}, list text ${l.listLeftOffset.toFixed(1)}px from the left, h2 ${l.h2Align}, tag ${l.tagRightGap.toFixed(1)}px from the right`],
  ];
}

// ---------- h2h-dashboard (spec 0003 N; written apart from page-audit.js) ----------

function fixedPage(dir, base) {
  const html = path.join(dir, `${base}.fixed.html`);
  if (fs.existsSync(html)) return html;
  const file = path.join(dir, '__graded.html');
  fs.writeFileSync(file, fs.readFileSync(path.join(dir, `${base}.html`), 'utf8').replace(`href="${base}.css"`, `href="${base}.fixed.css"`));
  return file;
}

async function gradeDashboard(browser, dir) {
  const file = fixedPage(dir, 'dashboard');
  const out = [];
  const p = await open(browser, file, 1280);
  const r = await p.evaluate(() => {
    const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const table = document.querySelector('table');
    const heads = table ? [...table.querySelectorAll('thead th, thead td, tr:first-child th')].map((h) => h.textContent.trim().toLowerCase()) : [];
    const rows = table ? [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.cells]) : [];
    const col = (re) => heads.findIndex((h) => re.test(h));
    const numCols = [/request/, /error/, /p95|latency/].map(col).filter((i) => i >= 0);
    const glyphs = numCols.map((c) => {
      const cell = rows[0] && rows[0][c];
      if (!cell) return { c, diff: null };
      const s = document.createElement('span');
      s.style.cssText = 'position: absolute; white-space: pre';
      cell.append(s);
      s.textContent = '1';
      const one = s.getBoundingClientRect().width;
      s.textContent = '0';
      const zero = s.getBoundingClientRect().width;
      s.remove();
      return { c, diff: Math.abs(one - zero) / zero };
    });
    const ltr = getComputedStyle(document.body).direction !== 'rtl';
    const aligned = numCols.map((c) => rows.map((cells) => cells[c] && getComputedStyle(cells[c]).textAlign));
    const caps = [];
    const small = [];
    for (const el of document.body.querySelectorAll('*')) {
      const text = own(el);
      if (!text || !visible(el)) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const letters = text.replace(/[^\p{L}]/gu, '');
      const upper = cs.textTransform === 'uppercase' || (letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase());
      const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
      if (upper && size < 20 && ls < 0.03 * size - 0.01) caps.push(`${el.tagName.toLowerCase()} "${text.slice(0, 20)}" ${ls}px at ${size}px`);
      if (size < 12) small.push(`${el.tagName.toLowerCase()} "${text.slice(0, 20)}" ${size}px`);
    }
    const statusCol = col(/status/);
    const statusWords = rows.map((cells) => {
      const cell = cells[statusCol];
      return cell ? (cell.innerText || '').replace(/[^\p{L}]/gu, '').length : 0;
    });
    return { heads, numCols, glyphs, ltr, aligned, caps, small, statusCol, statusWords };
  });
  out.push([r.numCols.length === 3 && r.glyphs.every((g) => g.diff !== null && g.diff <= 0.02),
    `columns ${r.numCols.join(', ')}: 1 against 0 ${r.glyphs.map((g) => (g.diff === null ? 'n/a' : `${(g.diff * 100).toFixed(1)}%`)).join(', ')}`]);
  const endOk = (a) => a === 'end' || a === (r.ltr ? 'right' : 'left');
  out.push([r.numCols.length === 3 && r.aligned.every((c) => c.every(endOk)), `alignments ${r.aligned.map((c) => [...new Set(c)].join('/')).join(', ')}`]);
  out.push([r.caps.length === 0, r.caps.length ? `untracked capitals: ${r.caps.join('; ')}` : 'no untracked capitals under 20px']);
  out.push([r.small.length === 0, r.small.length ? `under 12px: ${r.small.join('; ')}` : 'no text under 12px']);
  out.push([r.statusCol >= 0 && r.statusWords.length === 4 && r.statusWords.every((n) => n >= 2), `status column ${r.statusCol}, letters per row ${r.statusWords.join(', ')}`]);

  const texts = await p.evaluate(() => {
    const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const res = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (!(el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')) continue;
      const cs = getComputedStyle(el);
      let bg = null;
      for (let q = el; q; q = q.parentElement) {
        const v = parse(getComputedStyle(q).backgroundColor);
        if (v.length === 3 || (v.length === 4 && v[3] > 0)) { bg = v; break; }
      }
      res.push({ tag: el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ''), fg: parse(cs.color), bg: bg || [255, 255, 255], size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) });
    }
    return res;
  });
  const failing = texts.filter((t) => {
    const a = t.fg.length > 3 ? t.fg[3] : 1;
    const fg = [0, 1, 2].map((i) => t.fg[i] * a + t.bg[i] * (1 - a));
    const [l1, l2] = [luminance(fg), luminance(t.bg)].sort((x, y) => y - x);
    t.ratio = ((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
    return t.ratio < (t.size >= 24 || (t.size >= 18.66 && t.weight >= 700) ? 3 : 4.5);
  });
  out.push([failing.length === 0, failing.length ? `below ratio: ${failing.map((t) => `${t.tag} ${t.ratio}:1`).join(', ')}` : `all ${texts.length} text elements pass`]);
  await p.close();

  const kpi = async (w) => {
    const q = await open(browser, file, w);
    const s = await q.evaluate(() => [...document.querySelectorAll('.kpi-value, .kpi strong, .kpi dd, .kpi data')].map((e) => parseFloat(getComputedStyle(e).fontSize)));
    await q.close();
    return s;
  };
  const [k1, k5] = [await kpi(1280), await kpi(256)];
  const growth = k1.map((s, i) => (5 * k5[i]) / s);
  out.push([k1.length === 3 && growth.every((g) => g >= 1.99), `KPI values ${k1.join('/')}px at 1280, ${k5.join('/')}px at 256: ${growth.map((g) => g.toFixed(2)).join(', ')}× by 500% zoom`]);

  const cut = async (w) => {
    const q = await open(browser, file, w);
    const c = await q.evaluate(() => {
      const named = (e) => e && (e.title || e.getAttribute('aria-label') || e.getAttribute('aria-describedby'));
      return [...document.body.querySelectorAll('*')].filter((el) => {
        const cs = getComputedStyle(el);
        const hit = (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1);
        return hit && !named(el) && !named(el.parentElement) && !named(el.closest('a, button'));
      }).map((el) => el.textContent.trim().slice(0, 30));
    });
    await q.close();
    return c;
  };
  const [c1, c2] = [await cut(1280), await cut(640)];
  out.push([c1.length === 0 && c2.length === 0, `cut without full text: 1280 [${c1.join('; ')}], 640 [${c2.join('; ')}]`]);

  const p320 = await open(browser, file, 320);
  const sw = await p320.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await p320.close();
  out.push([sw.sw <= sw.cw + 1, `scrollWidth ${sw.sw} in a ${sw.cw}px viewport`]);
  return out;
}

// ---------- h2h-zoom-hero (spec 0007) ----------

async function gradeZoomHero(browser, dir) {
  const file = fixedPage(dir, 'hero');
  const size = async (width, zoomed) => {
    // Browser zoom on a 1280x900 window: the CSS viewport shrinks in both directions.
    const q = await open(browser, file, width, zoomed ? { height: Math.round((900 * width) / 1280) } : {});
    const s = await q.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize));
    await q.close();
    return s;
  };
  const [s1280, s640, s256, s360, s1440] = [await size(1280), await size(640, true), await size(256, true), await size(360), await size(1440)];
  const g200 = (2 * s640) / s1280;
  const g500 = (5 * s256) / s1280;
  return [
    [g500 >= 1.99, `growth ${g500.toFixed(2)}× by 500% zoom (h1 ${s1280}px at 1280, ${s256}px at 256)`],
    [g200 >= 1.6, `growth ${g200.toFixed(2)}× at 200% zoom (h1 ${s1280}px at 1280, ${s640}px at 640)`],
    [s360 >= 32 && s360 <= 48 && s1440 >= 60 && s1440 <= 84, `h1 ${s360}px at 360, ${s1440}px at 1440`],
  ];
}

// ---------- h2h-measure-ideal ----------

async function gradeMeasureIdeal(browser, dir) {
  const file = fixedPage(dir, 'post');
  const p = await open(browser, file, 1280);
  const r = await p.evaluate(() => {
    const ps = [...document.querySelectorAll('article p')];
    ps.forEach((e, i) => e.setAttribute('data-g', i));
    const m = ps.map((e, i) => measureLines(`[data-g="${i}"]`)).filter((x) => x.fullLines);
    return { m, sizes: ps.map((e) => parseFloat(getComputedStyle(e).fontSize)) };
  });
  await p.close();
  const lines = r.m.reduce((s, x) => s + x.fullLines, 0);
  const avg = lines ? r.m.reduce((s, x) => s + x.avgCharsPerLine * x.fullLines, 0) / lines : null;
  const p375 = await open(browser, file, 375);
  const sw = await p375.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await p375.close();
  return [
    [avg !== null && avg >= 60 && avg <= 72, `pooled ${avg && avg.toFixed(1)} characters per line over ${lines} full lines (per paragraph ${r.m.map((x) => x.avgCharsPerLine).join(', ')})`],
    [sw.sw <= sw.cw + 1, `scrollWidth ${sw.sw} in a ${sw.cw}px viewport`],
    [r.sizes.length > 0 && r.sizes.every((s) => s >= 16), `paragraph sizes ${[...new Set(r.sizes)].join(', ')}px`],
  ];
}

async function main() {
  const [name, outputs] = process.argv.slice(2);
  const graders = { 'h2h-page-audit': gradePageAudit, 'h2h-font-loading': gradeFontLoading, 'h2h-rtl': gradeRtl, 'h2h-dashboard': gradeDashboard, 'h2h-measure-ideal': gradeMeasureIdeal, 'h2h-zoom-hero': gradeZoomHero };
  if (!graders[name] || !outputs) {
    console.error(`usage: h2h-grade.js <${Object.keys(graders).join('|')}> <outputs-dir>`);
    process.exit(2);
  }
  const texts = ASSERTIONS(name);
  const browser = await chromium.launch();
  try {
    const results = await graders[name](browser, stage(outputs));
    const expectations = texts.map((text, i) => ({ text, passed: Boolean(results[i][0]), evidence: results[i][1] }));
    const passed = expectations.filter((e) => e.passed).length;
    console.log(JSON.stringify({ expectations, summary: { passed, failed: expectations.length - passed, total: expectations.length, pass_rate: Math.round((passed / expectations.length) * 1000) / 1000 } }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
