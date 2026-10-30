#!/usr/bin/env node
/**
 * Rendered typography audit of a whole page, with the rule IDs and severities
 * of references/audit.md. Where lint-css.js reads the source, this script
 * loads the page in Chromium and measures what the reader gets.
 *
 *   node scripts/page-audit.js page.html
 *   node scripts/page-audit.js https://example.com/post --json
 *
 * Viewports: 1280px (desktop), 768px, 375px (phone), and the CSS widths a
 * 1280px window has at 200% (640px), 400% (320px) and 500% (256px) zoom.
 * Browser zoom scales rem and px together and narrows the CSS viewport, so a
 * narrower viewport with sizes multiplied by the zoom factor is the same
 * computation the browser does.
 *
 * Checks: reflow (1.4.10), measure, contrast (1.4.3), text spacing (1.4.12),
 * web-font fallback, reading size floor, zoom growth of headings (1.4.4),
 * justification without hyphenation, one-word heading lines, size count, and
 * the checks from Latin and Saltz in references/screen-and-ui.md (inline code
 * x-height and boxes, kerning, I and l, heading order and spacing, family
 * budget, x-height pairing, weight floor, dark hairlines, icon alignment) and
 * in references/product-ui.md (tabular figures and alignment in number
 * columns, tracked capitals, truncated text, interface text size).
 *
 * Exit code 1 when a HIGH finding remains (verdict Block), 0 otherwise.
 * Requires Playwright: npm install && npx playwright install chromium.
 * With --lite, or when Playwright is missing, it lints a local page and its
 * stylesheets instead and lists every rendered check under Not verified.
 */

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { measureLines } = require('./measure-line.js');
const { toMarkdown, lint } = require('./lint-css.js');
const { apcaLc } = require('./apca.js');
const { nearestPassing } = require('./contrast-fix.js');

const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong|-apple-system|blinkmacsystemfont)$/i;

// ---------- in-page helpers (serialized into the page) ----------

function pageHelpers() {
  window.__mt = {
    path(el) {
      const part = (e) => {
        let s = e.tagName.toLowerCase();
        if (e.id) return `${s}#${e.id}`;
        const cls = [...e.classList].filter((c) => !c.startsWith('mt-')).slice(0, 2);
        if (cls.length) s += `.${cls.join('.')}`;
        return s;
      };
      const parts = [part(el)];
      let p = el.parentElement;
      while (p && parts.length < 3 && p !== document.body && p !== document.documentElement) {
        parts.unshift(part(p));
        if (p.id) break;
        p = p.parentElement;
      }
      return parts.join(' > ');
    },
    visible(el) {
      const cs = getComputedStyle(el);
      if (!(el.getClientRects().length > 0 && cs.visibility !== 'hidden' && cs.display !== 'none')) return false;
      // Visually hidden text (a screen-reader-only class) is not on screen: clipped away, or a box
      // of 1px or less that hides its overflow.
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const s = p === el ? cs : getComputedStyle(p);
        if (/inset\(50%\)/.test(s.clipPath) || /rect\(0(px)?[, ]+0(px)?[, ]+0(px)?[, ]+0(px)?\)/.test(s.clip)) return false;
        const r = p.getBoundingClientRect();
        if (r.width <= 1 && r.height <= 1 && /hidden|clip/.test(s.overflow)) return false;
      }
      return true;
    },
    directText(el) {
      return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    },
    reading() {
      return [...document.querySelectorAll('p, li, dd, figcaption, blockquote')]
        .filter((el) => !(el.tagName === 'BLOCKQUOTE' && el.querySelector('p')))
        .filter((el) => window.__mt.visible(el) && el.textContent.trim().length >= 100);
    },
    // Any colour the browser computes (oklch, lab, color()) as rgba(), via a 1x1 canvas; null if unreadable.
    rgba(str) {
      const mt = window.__mt;
      const plain = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(str);
      if (plain) {
        const a = plain[4] === undefined ? 1 : plain[4].endsWith('%') ? parseFloat(plain[4]) / 100 : parseFloat(plain[4]);
        return `rgba(${plain[1]}, ${plain[2]}, ${plain[3]}, ${a})`; // exact; the canvas below rounds alpha to 1/255
      }
      if (!mt._cv) { mt._cv = document.createElement('canvas'); mt._cv.width = mt._cv.height = 1; mt._cx = mt._cv.getContext('2d', { willReadFrequently: true }); }
      const g = mt._cx;
      g.fillStyle = '#010203';
      g.fillStyle = str;
      if (g.fillStyle === '#010203' && !/^(#010203|rgb\(1, 2, 3\))$/i.test(str)) return null;
      g.clearRect(0, 0, 1, 1);
      g.fillRect(0, 0, 1, 1);
      const [r, gr, b, a] = g.getImageData(0, 0, 1, 1).data;
      return `rgba(${r}, ${gr}, ${b}, ${+(a / 255).toFixed(3)})`;
    },
    share(el, re) {
      const letters = (el.textContent.match(/\p{L}/gu) || []).length;
      return letters ? (el.textContent.match(re) || []).length / letters : 0;
    },
    cjk(el) { return window.__mt.share(el, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) > 0.5; },
    latin(el) { return window.__mt.share(el, /\p{Script=Latin}/gu) > 0.5; },
    // Text colours and their grounds for the contrast check. Disabled controls are exempt (WCAG 1.4.3).
    // Opacity below the first painted ground fades the text alone; opacity at or above it fades the
    // ground too, which the ratio cannot express, so that case is reported as not verified.
    colorSamples() {
      const mt = window.__mt;
      return mt.textElements().filter((el) => !el.closest(':disabled, [aria-disabled="true"]')).map((el) => {
        const cs = getComputedStyle(el);
        const grounds = [];
        let image = false;
        let fade = 1;
        let fadedGround = false;
        let found = false;
        for (let p = el; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          const op = parseFloat(s.opacity);
          if (s.backgroundImage !== 'none') { image = true; break; }
          const bg = mt.rgba(s.backgroundColor);
          const painted = bg && !/, 0\)$/.test(bg);
          if (!found && !painted) { fade *= op; continue; }
          if (op < 1) fadedGround = true;
          if (!painted) continue;
          found = true;
          grounds.push(bg);
          if (/, 1\)$/.test(bg)) break;
        }
        const fg = mt.rgba(cs.color);
        const color = fg && fg.replace(/, ([\d.]+)\)$/, (m, a) => `, ${+(parseFloat(a) * fade).toFixed(3)})`);
        return { path: mt.path(el), color, rawColor: cs.color, grounds, image, fadedGround, hidden: fade === 0, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) };
      });
    },
    textElements() {
      return [...document.body.querySelectorAll('*')].filter((el) => window.__mt.directText(el) && window.__mt.visible(el) && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName));
    },
  };
}

// Checks from Latin and Saltz (specs/0002-book-checks.md), run in the page at 1280px.
function bookChecks() {
  const mt = window.__mt;
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  const fontOf = (cs, px) => `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`;
  const ascent = (cs, ch) => { g.font = fontOf(cs, 100); return g.measureText(ch).actualBoundingBoxAscent / 100; };
  const xHeight = (cs) => {
    const adj = /([\d.]+)\s*$/.exec(cs.fontSizeAdjust || '');
    return (cs.fontSizeAdjust && cs.fontSizeAdjust !== 'none' && adj ? Number(adj[1]) : ascent(cs, 'x')) * parseFloat(cs.fontSize);
  };
  const first = (family) => family.split(',')[0].trim().replace(/^["']|["']$/g, '');
  const ground = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const b = getComputedStyle(p).backgroundColor;
      if (!/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)|transparent/.test(b)) return b;
    }
    return 'rgb(255, 255, 255)';
  };
  const lum = (s) => {
    const [r, gg, b] = (/rgba?\(([^)]+)\)/.exec(s) || [0, '0,0,0'])[1].split(/[\s,/]+/).map(Number);
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b);
  };
  // Ink of one glyph as a set of pixel keys, centred horizontally, drawn at 48px.
  const ink = (cs, ch) => {
    canvas.width = 96; canvas.height = 96;
    g.font = fontOf(cs, 48);
    g.fillText(ch, 24, 72);
    const d = g.getImageData(0, 0, 96, 96).data;
    const pts = [];
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (d[(y * 96 + x) * 4 + 3] > 127) pts.push([x, y]);
    g.clearRect(0, 0, 96, 96);
    const cx = pts.reduce((s, q) => s + q[0], 0) / (pts.length || 1);
    return new Set(pts.map(([x, y]) => `${Math.round(x - cx)},${y}`));
  };
  const overlap = (a, b) => { let i = 0; for (const k of a) if (b.has(k)) i++; return i / (a.size + b.size - i || 1); };
  // Thinnest stroke of "o" at the rendered size: its top at the centre column or its side at mid-height.
  const thinnest = (cs) => {
    const S = 8;
    const px = parseFloat(cs.fontSize) * S;
    canvas.width = Math.ceil(px * 2); canvas.height = Math.ceil(px * 2);
    g.font = fontOf(cs, px);
    g.fillText('o', px * 0.5, px * 1.5);
    const w = canvas.width;
    const d = g.getImageData(0, 0, w, canvas.height).data;
    const a = (x, y) => d[(y * w + x) * 4 + 3] / 255;
    let [x0, x1, y0, y1] = [w, 0, canvas.height, 0];
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < w; x++) if (a(x, y) > 0.5) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const cx = Math.round((x0 + x1) / 2);
    const cy = Math.round((y0 + y1) / 2);
    let top = 0;
    for (let y = Math.max(0, y0 - 2); y < cy; y++) top += a(cx, y);
    let side = 0;
    for (let x = Math.max(0, x0 - 2); x < cx; x++) side += a(x, cy);
    return Math.min(top, side) / S;
  };

  const reading = mt.reading();
  const seen = new Set();
  const once = (key) => (seen.has(key) ? false : (seen.add(key), true));
  const out = { code: [], boxes: [], kern: [], confusable: [], order: [], pair: [], space: [], thin: [], hairline: [], icons: [] };

  for (const block of reading) {
    const bcs = getComputedStyle(block);
    // G1 inline code x-height against the surrounding text
    for (const c of block.querySelectorAll('code, kbd, samp')) {
      if (c.closest('pre')) continue;
      const ccs = getComputedStyle(c);
      const pcs = getComputedStyle(c.parentElement);
      const xh = xHeight(ccs);
      const parentXh = xHeight(pcs);
      const ratio = xh / parentXh;
      if ((ratio < 0.9 || ratio > 1.1) && once(`code|${mt.path(c)}`)) {
        out.code.push({ path: mt.path(c), xh, parentXh, ratio, size: parseFloat(ccs.fontSize), parentSize: parseFloat(pcs.fontSize) });
      }
    }
    // G2 inline code boxes colliding across lines
    const rects = [];
    for (const c of block.querySelectorAll('code, kbd, samp')) {
      const ccs = getComputedStyle(c);
      const boxed = !/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)|transparent/.test(ccs.backgroundColor) || parseFloat(ccs.borderTopWidth) > 0;
      if (boxed && !c.closest('pre')) rects.push(...c.getClientRects());
    }
    let worst = 0;
    for (const a of rects) for (const b of rects) {
      if (b.top <= a.top + 1) continue;
      const v = a.bottom - b.top;
      const h = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      if (v > 0.5 && h > 0) worst = Math.max(worst, v);
    }
    if (worst && once(`box|${mt.path(block)}`)) out.boxes.push({ path: mt.path(block), overlap: worst });
    // G9 weight floor
    const wght = /["']wght["']\s+([\d.]+)/.exec(bcs.fontVariationSettings || '');
    const weight = wght ? Number(wght[1]) : parseInt(bcs.fontWeight, 10);
    if (weight < 400 && once(`thin|${mt.path(block)}`)) out.thin.push({ path: mt.path(block), weight, size: parseFloat(bcs.fontSize), color: bcs.color, bg: ground(block) });
    // G10 hairlines on a dark ground
    const size = parseFloat(bcs.fontSize);
    if (size < 18 && lum(bcs.color) > lum(ground(block))) {
      const stroke = thinnest(bcs);
      if (stroke < 0.45 && once(`hair|${mt.path(block)}`)) out.hairline.push({ path: mt.path(block), stroke, size });
    }
  }

  // G3 kerning switched off, G4 I and l alike: once per declared font stack
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(mt.visible);
  for (const el of [...reading, ...headings]) {
    const cs = getComputedStyle(el);
    if (once(`kern|${cs.fontFamily}|${cs.fontKerning}|${cs.fontFeatureSettings}`)) {
      const s = document.createElement('span');
      s.style.cssText = 'white-space: nowrap; letter-spacing: 0; word-spacing: 0';
      s.textContent = 'AVATAR Tyrol Wavy Yoke';
      el.append(s);
      const off = s.getBoundingClientRect().width;
      s.style.fontKerning = 'normal';
      s.style.fontFeatureSettings = cs.fontFeatureSettings === 'normal' ? 'normal' : cs.fontFeatureSettings.replace(/(["']kern["'])\s+(0|off)/, '$1 1');
      const on = s.getBoundingClientRect().width;
      s.remove();
      const diff = (off / on - 1) * 100;
      if (diff > 0.5) out.kern.push({ path: mt.path(el), diff });
    }
  }
  const readingStacks = new Map();
  for (const el of reading) {
    const cs = getComputedStyle(el);
    if (mt.latin(el) && !readingStacks.has(cs.fontFamily)) readingStacks.set(cs.fontFamily, { el, cs });
  }
  for (const [family, { el, cs }] of readingStacks) {
    const [I, l, one] = ['I', 'l', '1'].map((ch) => ink(cs, ch));
    const il = overlap(I, l);
    if (il >= 0.82) out.confusable.push({ path: mt.path(el), il, l1: overlap(l, one), family: first(family) });
  }

  // G5 heading order: each level present against the nearest higher level present
  const levels = [1, 2, 3, 4, 5, 6].map((n) => headings.find((h) => h.tagName === `H${n}`)).filter(Boolean);
  for (let i = 1; i < levels.length; i++) {
    const [up, h] = [getComputedStyle(levels[i - 1]), getComputedStyle(levels[i])];
    const size = parseFloat(h.fontSize);
    const upSize = parseFloat(up.fontSize);
    const weight = parseInt(h.fontWeight, 10);
    const upWeight = parseInt(up.fontWeight, 10);
    if (size >= upSize - 0.01 && weight >= upWeight) {
      out.order.push({ path: mt.path(levels[i]), tag: levels[i].tagName.toLowerCase(), size, weight, upTag: levels[i - 1].tagName.toLowerCase(), upSize, upWeight });
    }
  }

  // G7 pairing by x-height: headings' face against the text face
  if (reading.length && headings.length) {
    const body = getComputedStyle(reading[0]);
    const head = getComputedStyle(headings[0]);
    if (first(head.fontFamily) !== first(body.fontFamily)) {
      const [hx, bx] = [ascent(head, 'x'), ascent(body, 'x')];
      const diff = Math.abs(hx - bx) / Math.max(hx, bx);
      if (diff > 0.05 && diff < 0.15) out.pair.push({ path: mt.path(headings[0]), headFamily: first(head.fontFamily), bodyFamily: first(body.fontFamily), head: hx, body: bx, diff });
    }
  }

  // G8 space above a section heading against the space below it; an h1 often
  // sits under a kicker that belongs to it, so it is left out
  for (const h of headings.filter((x) => x.tagName !== 'H1')) {
    const prev = h.previousElementSibling;
    const next = h.nextElementSibling;
    if (!prev || !next || !mt.visible(prev) || !mt.visible(next)) continue;
    const r = h.getBoundingClientRect();
    const above = r.top - prev.getBoundingClientRect().bottom;
    const below = next.getBoundingClientRect().top - r.bottom;
    if (below > 0 && above < 2 * below - 0.5 && once(`space|${mt.path(h)}`)) out.space.push({ path: mt.path(h), above, below, size: parseFloat(getComputedStyle(h).fontSize) });
  }

  // G11 icons beside labels: the icon's centre against the middle of the capitals
  for (const icon of document.querySelectorAll('svg, img')) {
    const parent = icon.parentElement;
    if (!parent || parent.closest('svg') || !mt.visible(icon)) continue;
    let text = [...parent.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!text) {
      const label = [icon.nextElementSibling, icon.previousElementSibling].find((e) => e && !e.querySelector('svg, img') && e.textContent.trim());
      text = label && [...label.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    }
    if (!text) continue;
    const pcs = getComputedStyle(text.parentElement);
    const size = parseFloat(pcs.fontSize);
    const r = icon.getBoundingClientRect();
    if (r.height > 2 * size) continue;
    // Wrap the label so the probe sits on its baseline even when the parent is a flex or grid row,
    // where a bare probe would become a flex item of its own.
    const wrap = document.createElement('span');
    text.parentElement.insertBefore(wrap, text);
    wrap.append(text);
    const probe = document.createElement('span');
    probe.style.cssText = 'display: inline-block; width: 0; height: 0';
    wrap.insertBefore(probe, text);
    const baseline = probe.getBoundingClientRect().bottom;
    wrap.before(text);
    wrap.remove();
    const cap = ascent(pcs, 'H') * size;
    const offset = (r.top + r.bottom) / 2 - (baseline - cap / 2);
    if (Math.abs(offset) > 1 && once(`icon|${mt.path(icon)}`)) {
      out.icons.push({ path: mt.path(icon), offset, flex: /flex|grid/.test(pcs.display), va: (cap - r.height) / 2 / size });
    }
  }
  return out;
}

// Dense product UI (specs/0003, references/product-ui.md): number columns,
// tracked capitals and small interface text, run in the page at 1280px.
function productChecks() {
  const mt = window.__mt;
  const out = { tabular: [], align: [], caps: [], small: [] };
  const seen = new Set();
  const once = (key) => (seen.has(key) ? false : (seen.add(key), true));
  const NUM = /^[\s(+\-−–]*\p{Sc}?\s*\d[\d\s.,:'’  ]*(%|‰|\p{Sc}|[kKMB])?\s*(\p{L}{1,3}|%)?\s*\)?$/u;
  const rowsOf = (t) => (t.tagName === 'TABLE'
    ? [...t.tBodies].flatMap((b) => [...b.rows]).map((r) => [...r.cells])
    : [...t.querySelectorAll('[role=row]')].map((r) => [...r.querySelectorAll('[role=cell], [role=gridcell]')]).filter((c) => c.length));
  for (const t of [...document.querySelectorAll('table, [role=table], [role=grid]')].filter(mt.visible)) {
    const rows = rowsOf(t);
    const cols = Math.max(0, ...rows.map((r) => r.length));
    for (let c = 0; c < cols; c++) {
      const cells = rows.map((r) => r[c]).filter(Boolean);
      const nums = cells.filter((td) => NUM.test(td.textContent.trim()));
      if (nums.length < 2 || nums.length < cells.length * 0.6) continue;
      const where = `${mt.path(t)} column ${c + 1}`;
      // L1: draw single glyphs, so a kerning pair such as "11" cannot pass for proportional figures
      const holder = [...nums[0].querySelectorAll('*')].reverse().find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && /\d/.test(n.textContent))) || nums[0];
      holder.setAttribute('data-mt-num', String(out.tabular.length));
      const probe = document.createElement('span');
      probe.style.cssText = 'position: absolute; white-space: pre';
      holder.append(probe);
      const spread = () => {
        probe.textContent = '1';
        const one = probe.getBoundingClientRect().width;
        probe.textContent = '0';
        const zero = probe.getBoundingClientRect().width;
        return Math.abs(one - zero) / zero;
      };
      const diff = spread();
      let fixable = false;
      if (diff > 0.02) {
        probe.style.fontVariantNumeric = 'tabular-nums';
        fixable = spread() <= 0.02;
      }
      probe.remove();
      if (diff > 0.02) out.tabular.push({ path: where, diff: diff * 100, fixable, family: getComputedStyle(holder).fontFamily, num: holder.getAttribute('data-mt-num') });
      // L2: place values line up only when the numbers share an edge at the end
      const rtl = getComputedStyle(nums[0]).direction === 'rtl';
      const lengths = new Set(nums.map((td) => td.textContent.trim().length));
      const off = nums.filter((td) => {
        const a = getComputedStyle(td).textAlign;
        return !(a === 'end' || a === (rtl ? 'left' : 'right'));
      });
      if (lengths.size > 1 && off.length >= nums.length / 2) out.align.push({ path: where, align: getComputedStyle(off[0]).textAlign });
      else if (lengths.size > 1) {
        // Cells aligned at the end under a header that is not: the header should share the edge.
        const head = t.tagName === 'TABLE' && t.tHead && t.tHead.rows[0] && t.tHead.rows[0].cells[c];
        const ha = head && getComputedStyle(head).textAlign;
        if (head && head.textContent.trim() && !(ha === 'end' || ha === (rtl ? 'left' : 'right'))) out.align.push({ path: `${where} header`, align: ha, header: true });
      }
    }
  }
  const reading = new Set(mt.reading());
  const inReading = (el) => { for (let p = el; p; p = p.parentElement) if (reading.has(p)) return true; return false; };
  for (const el of mt.textElements()) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const letters = own.replace(/[^\p{L}]/gu, '');
    const allCaps = letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase() && !el.closest('p, li, dd, blockquote');
    const tracking = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const p = mt.path(el);
    const cased = letters.toUpperCase() !== letters.toLowerCase(); // Arabic, CJK and other caseless scripts have no capitals to track
    if ((cs.textTransform === 'uppercase' || allCaps) && cased && letters.length >= 2 && size < 20 && tracking < 0.03 * size - 0.01 && once(`caps|${p}`)) {
      out.caps.push({ path: p, size, tracking });
    }
    if (size < 12 && !inReading(el) && !['SUP', 'SUB'].includes(el.tagName) && !el.closest('[aria-hidden="true"]') && once(`small|${p}`)) {
      out.small.push({ path: p, size });
    }
  }
  return out;
}

// L4: text cut by an ellipsis or a line clamp that no title or accessible name carries in full.
// Only a recovery a sighted keyboard, touch or zoom user can reach counts: a <details> disclosure or
// an expand control in the same row. A title or an accessible name does not show the text.
function truncatedText() {
  const mt = window.__mt;
  const named = (e) => e && (e.title || e.getAttribute('aria-label') || e.getAttribute('aria-describedby'));
  const recoverable = (el) => {
    if (el.closest('details')) return true;
    const row = el.closest('tr, li, [role=row]') || el.parentElement;
    return Boolean(row && row.querySelector('[aria-expanded], [aria-controls]'));
  };
  // An icon-only control can overflow its box, but it has no text to lose.
  return [...document.body.querySelectorAll('*')].filter(mt.visible).filter((el) => el.textContent.trim()).filter((el) => {
    const cs = getComputedStyle(el);
    const over = el.scrollWidth > el.clientWidth + 1;
    const ellipsis = cs.textOverflow === 'ellipsis' && over;
    const clip = cs.textOverflow === 'clip' && over && /hidden|clip/.test(cs.overflowX) && /nowrap|pre/.test(cs.whiteSpace) && mt.directText(el);
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1;
    return (ellipsis || clip || clamp) && !recoverable(el);
  }).map((el) => ({
    path: mt.path(el),
    text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 48),
    titled: Boolean(named(el) || named(el.parentElement) || named(el.closest('a, button, [role=button], [role=link]'))),
  }));
}


function parseColor(s) {
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function luminance({ r, g, b }) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function over(fg, bg) {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}
function contrast(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---------- audit ----------

// ---------- lite mode: no browser ----------

const RENDERED = [
  'rendered measure (characters per line)', 'contrast', 'reflow at 320 and 375px', 'text spacing (WCAG 1.4.12)',
  'zoom growth of headings', 'web-font fallback', 'heading order and spacing', 'the checks in screen-and-ui.md and product-ui.md',
];

function loadPlaywright() {
  if (process.env.MT_NO_PLAYWRIGHT) throw new Error('MT_NO_PLAYWRIGHT is set');
  return require('playwright');
}

// Source checks only: the page's <style> blocks and the local stylesheets it links.
function liteAudit(target) {
  if (/^[a-z]+:\/\//i.test(target) && !/^file:/i.test(target)) {
    const err = new Error(`${target} needs a browser: npm install && npx playwright install chromium (lite mode reads local files only)`);
    err.code = 'NEEDS_BROWSER';
    throw err;
  }
  const file = /^file:/i.test(target) ? require('node:url').fileURLToPath(target) : path.resolve(target);
  const html = require('node:fs').readFileSync(file, 'utf8');
  const unread = [];
  const sheets = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => /rel=["']?stylesheet/i.test(tag))
    .map((tag) => (/href=["']([^"']+)["']/i.exec(tag) || [])[1])
    .filter(Boolean)
    .map((href) => {
      if (/^([a-z]+:)?\/\//i.test(href) || href.startsWith('/')) { unread.push(href); return null; }
      const p = path.resolve(path.dirname(file), href.split(/[?#]/)[0]);
      if (!require('node:fs').existsSync(p)) { unread.push(href); return null; }
      return p;
    })
    .filter(Boolean);
  const report = lint([file, ...sheets]);
  const skipped = unread.map((href) => `stylesheet ${href} (remote, root-relative or missing; lite mode reads local files only)`);
  return { ...report, target: file, mode: 'lite', notVerified: [...RENDERED.map((r) => `${r} (lite mode, no browser)`), ...skipped, ...report.notVerified.filter((n) => !/page-audit/.test(n))] };
}

// Scroll reveals (an IntersectionObserver that fades a section in) and running
// animations leave text at a passing state the reader never sees for long, or at
// opacity 0 the reader never sees at all. Scroll through once, return to the top
// and finish what is running, so every check reads the settled page.
async function revealAll(page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const step = Math.max(200, innerHeight * 0.8);
    for (let y = 0, n = 0; y < document.documentElement.scrollHeight && n < 60; y += step, n++) {
      scrollTo(0, y);
      await frame();
      await frame();
    }
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 50));
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.getComputedTiming();
      if (t && Number.isFinite(t.endTime)) try { a.finish(); } catch { /* an animation that cannot finish is left running */ }
    }
    // A fade a script runs frame by frame is no CSS animation: wait until no opacity changes
    // between two samples 100ms apart, for at most three seconds.
    const opacities = () => [...document.body.querySelectorAll('*')].map((el) => getComputedStyle(el).opacity).join();
    let last = opacities();
    for (let waited = 0; waited < 3000; waited += 100) {
      await new Promise((r) => setTimeout(r, 100));
      const now = opacities();
      if (now === last) break;
      last = now;
    }
    await frame();
  });
}

const needsInstall = (err) => /Cannot find module 'playwright'|MT_NO_PLAYWRIGHT|Executable doesn't exist|playwright install/i.test(String(err && err.message));

async function audit(target, opts = {}) {
  if (opts.lite) return liteAudit(target);
  const url = /^[a-z]+:\/\//i.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  const own = !opts.browser;
  const browser = opts.browser || (await loadPlaywright().chromium.launch());
  const findings = [];
  const notVerified = new Set(['Safari and Firefox rendering (Chromium only)']);
  const add = (rule, severity, location, measured, fix) => findings.push({ rule, severity, location, measured, fix });

  const open = async (width, extraCss, { height = 900, colorScheme } = {}) => {
    const page = await browser.newPage({ viewport: { width, height }, ...(colorScheme ? { colorScheme } : {}) });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await revealAll(page);
    if (extraCss) await page.addStyleTag({ content: extraCss });
    await page.evaluate(pageHelpers);
    await page.addScriptTag({ content: measureLines.toString() });
    return page;
  };

  try {
    // ---- desktop: measure, size floor, justify, contrast, size count, runts, fonts
    const page = await open(1280);
    const desk = await page.evaluate(() => {
      const mt = window.__mt;
      const reading = mt.reading().map((el, i) => {
        el.setAttribute('data-mt-r', i);
        const cs = getComputedStyle(el);
        const m = measureLines(`[data-mt-r="${i}"]`);
        return {
          i, path: mt.path(el), avg: m.avgCharsPerLine, min: m.minCharsPerLine, max: m.maxCharsPerLine, lines: m.fullLines,
          size: parseFloat(cs.fontSize), align: cs.textAlign, hyphens: cs.hyphens, family: cs.fontFamily, cjk: mt.cjk(el),
        };
      });
      const texts = mt.textElements();
      const colors = mt.colorSamples();
      const sizes = [...new Set(texts.map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 2) / 2))].sort((a, b) => a - b);
      const runts = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(mt.visible).map((h) => {
        const range = document.createRange();
        const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        const tops = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          for (const m of n.textContent.matchAll(/\S+/g)) {
            range.setStart(n, m.index);
            range.setEnd(n, m.index + m[0].length);
            const r = range.getClientRects()[0];
            if (r) tops.push(Math.round(r.top));
          }
        }
        const lines = [...new Set(tops)];
        const last = tops.filter((t) => t === lines[lines.length - 1]).length;
        return { path: mt.path(h), lines: lines.length, lastWords: last };
      });
      const fontTargets = [...mt.reading(), ...document.querySelectorAll('h1, h2, h3')].filter(mt.visible).slice(0, 24).map((el, i) => {
        el.setAttribute('data-mt-f', i);
        return { i, path: mt.path(el), family: getComputedStyle(el).fontFamily };
      });
      return { reading, colors, sizes, runts, fontTargets };
    });

    const groups = new Map();
    for (const r of desk.reading) {
      if (!groups.has(r.path)) groups.set(r.path, []);
      groups.get(r.path).push(r);
    }
    for (const [p, rs] of groups) {
      const measured = rs.filter((r) => r.lines > 0);
      if (measured.length) {
        const avg = measured.reduce((s, r) => s + r.avg * r.lines, 0) / measured.reduce((s, r) => s + r.lines, 0);
        const lo = Math.min(...measured.map((r) => r.min));
        const hi = Math.max(...measured.map((r) => r.max));
        const cjk = rs[0].cjk;
        if (avg > (cjk ? 40 : 75)) add('MT-MEASURE-LONG', 'MEDIUM', `${p} at 1280px`, `${avg.toFixed(1)} characters per line (range ${lo}-${hi})${cjk ? ', CJK (WCAG 1.4.8 caps it at 40)' : ''}`, cjk ? 'max-inline-size: 35ic' : 'max-inline-size in em: measure-line.js --solve 66 finds it in the browser (estimate-measure.js --target 66 without one)');
      }
      const r0 = rs[0];
      if (r0.size < 16) add('MT-SIZE-FLOOR', 'MEDIUM', `${p}`, `${r0.size}px reading text`, `font-size: 1rem or more`);
      if (r0.align === 'justify' && r0.hyphens !== 'auto') add('MT-JUSTIFY', 'MEDIUM', `${p}`, 'justified, hyphens: ' + r0.hyphens, 'text-align: start, or hyphens: auto with limits');
    }

    const invisible = new Set();
    const contrastFailures = (samples) => {
    const pairs = new Map();
    for (const c of samples) {
      if (c.image) { notVerified.add('contrast over background images'); continue; }
      // Text at opacity 0 after the scroll pass is not shown yet (a reveal that never fired);
      // its ratio would read 1:1 and its fix would lighten text that is fine once shown.
      if (c.hidden) { invisible.add(c.path); continue; }
      if (c.fadedGround) { notVerified.add('contrast where opacity fades the text and its ground together'); continue; }
      const fg = c.color && parseColor(c.color);
      const layers = c.grounds.map(parseColor);
      if (!fg || layers.some((l) => !l)) { notVerified.add(`contrast of a colour the audit could not read (${c.rawColor})`); continue; }
      const base = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 255, g: 255, b: 255, a: 1 };
      const bg = layers.reverse().reduce((under, layer) => over(layer, under), base);
      c.bg = `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`;
      const ratio = contrast(over(fg, bg), bg);
      const large = c.size >= 24 || (c.size >= 18.66 && c.weight >= 700);
      const need = large ? 3 : 4.5;
      if (ratio < need) {
        const key = `${c.path}|${c.color}|${c.bg}`;
        const text = over(fg, bg);
        if (!pairs.has(key)) pairs.set(key, { c, ratio, need, text: [text.r, text.g, text.b].map(Math.round), ground: [bg.r, bg.g, bg.b].map(Math.round) });
      }
    }
    return pairs;
    };
    // Spec 0013: the fix names the nearest passing text colour, same hue, from contrast-fix.js.
    const contrastFix = ({ text, ground, need }) => {
      const near = nearestPassing({ text, ground, ratio: need });
      if (near.color) return `color: ${near.color} reaches ${near.ratio}:1 here, the nearest text colour of the same hue (scripts/contrast-fix.js)`;
      return `no text colour of this hue reaches ${need}:1 on this ground (best ${near.best}:1): change the ground (scripts/contrast-fix.js --move ground)`;
    };
    const lightFails = contrastFailures(desk.colors);
    for (const f of lightFails.values()) {
      const { c, ratio, need } = f;
      add('MT-CONTRAST', 'HIGH', `${c.path}`, `${ratio.toFixed(2)}:1 (${c.rawColor} on ${c.bg}, needs ${need}:1)`, contrastFix(f));
    }
    // The same page with prefers-color-scheme: dark; report only what fails there and not here.
    const darkPage = await open(1280, null, { colorScheme: 'dark' });
    const darkFails = contrastFailures(await darkPage.evaluate(() => window.__mt.colorSamples()));
    await darkPage.close();
    const lightPaths = new Set([...lightFails.values()].map(({ c }) => c.path));
    for (const f of darkFails.values()) {
      const { c, ratio, need } = f;
      if (lightPaths.has(c.path)) continue;
      add('MT-CONTRAST', 'HIGH', `${c.path} (dark scheme)`, `${ratio.toFixed(2)}:1 (${c.rawColor} on ${c.bg}, needs ${need}:1)`, contrastFix(f));
    }
    if (invisible.size) notVerified.add(`contrast of ${invisible.size} text element${invisible.size === 1 ? '' : 's'} still at opacity 0 after scrolling the page (not shown yet, such as a reveal that never fired)`);
    if (desk.sizes.length > 8) add('MT-SIZE-COUNT', 'LOW', 'page at 1280px', `${desk.sizes.length} text sizes: ${desk.sizes.join(', ')}px`, 'a scale of 5 to 8 named sizes');
    for (const r of desk.runts) {
      if (r.lines >= 2 && r.lastWords === 1) add('MT-HEADING-RUNT', 'LOW', `${r.path} at 1280px`, `last of ${r.lines} lines is one word`, 'text-wrap: balance');
    }

    // Web fonts that fell back: compare the first declared family with the faces Chromium used.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const seen = new Set();
    for (const t of desk.fontTargets) {
      const first = t.family.split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (GENERIC.test(first)) continue;
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-mt-f="${t.i}"]` });
      if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      if (!fonts.length) continue;
      const norm = (s) => s.toLowerCase().replace(/[\s-]/g, '');
      const ok = fonts.some((f) => norm(f.familyName).startsWith(norm(first)) || norm(f.postScriptName || '').startsWith(norm(first)));
      if (!ok && !seen.has(first)) {
        seen.add(first);
        add('MT-FONT-FALLBACK', 'MEDIUM', t.path, `declared "${first}", rendered ${fonts.map((f) => f.familyName).join(', ')}`, 'check the @font-face src and that the file covers these glyphs');
      }
    }

    // Family budget (Saltz principle 43): typeface families actually rendered, code excluded.
    const textCount = await page.evaluate(() => window.__mt.textElements()
      .filter((el) => !el.closest('code, pre, kbd, samp, tt') && !/monospace/.test(getComputedStyle(el).fontFamily))
      .slice(0, 300).map((el, i) => el.setAttribute('data-mt-t', i)).length);
    const glyphs = new Map();
    const { root: root2 } = await cdp.send('DOM.getDocument', { depth: -1 });
    for (let i = 0; i < textCount; i++) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root2.nodeId, selector: `[data-mt-t="${i}"]` });
      if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      for (const f of fonts) {
        const fam = f.familyName.replace(/(\s+(Regular|Italic|Oblique|Light|Medium|Semibold|SemiBold|Bold|Black|Heavy|Thin))+$/i, '');
        glyphs.set(fam, (glyphs.get(fam) || 0) + f.glyphCount);
      }
    }
    const families = [...glyphs].filter(([, n]) => n >= 10).map(([f]) => f);
    if (families.length > 3) add('MT-FAMILY-COUNT', 'LOW', 'page at 1280px', `${families.length} families: ${families.join(', ')}`, 'three families at most, each with a job (text, display, interface); vary weight and width inside them');

    const book = await page.evaluate(bookChecks);
    for (const c of book.code) {
      const em = c.size / c.parentSize / c.ratio;
      add('MT-CODE-XHEIGHT', 'LOW', c.path, `x-height ${c.xh.toFixed(1)}px against ${c.parentXh.toFixed(1)}px in the text, ratio ${c.ratio.toFixed(2)}`, `font-size: ${em.toFixed(2)}em (or font-size-adjust: ex-height ${(c.parentXh / c.parentSize).toFixed(3)})`);
    }
    for (const c of book.boxes) add('MT-CODE-BOX', 'LOW', c.path, `inline code boxes overlap by ${c.overlap.toFixed(1)}px across lines`, 'raise the line-height, or trim the vertical padding of inline code');
    for (const k of book.kern) add('MT-KERN-OFF', 'LOW', k.path, `kerning pairs set ${k.diff.toFixed(1)}% wider than with kerning on`, 'font-kerning: normal and no "kern" 0 in font-feature-settings');
    for (const c of book.confusable) add('MT-CONFUSABLE', 'LOW', c.path, `I and l overlap ${c.il.toFixed(2)} (l and 1: ${c.l1.toFixed(2)}) in ${c.family}`, 'a reading face that distinguishes I, l and 1 (a serif, or a humanist sans with a tailed l)');
    for (const h of book.order) add('MT-HEADING-ORDER', 'MEDIUM', h.path, `${h.tag} ${h.size}px, weight ${h.weight}; ${h.upTag} above it ${h.upSize}px, weight ${h.upWeight}`, `make the ${h.tag} smaller or lighter than the ${h.upTag}`);
    for (const p of book.pair) add('MT-PAIR-XHEIGHT', 'LOW', p.path, `${p.headFamily} ${p.head.toFixed(3)}em against ${p.bodyFamily} ${p.body.toFixed(3)}em (${(p.diff * 100).toFixed(0)}% apart; match within 5% or contrast by 15%)`, 'pick a heading face whose x-height matches the text face closely or differs clearly');
    for (const s of book.space) add('MT-HEADING-SPACE', 'LOW', s.path, `${Math.round(s.above)}px above, ${Math.round(s.below)}px below`, `at least twice as much space above as below, for example margin-block: ${(2 * s.below / s.size).toFixed(2)}em ${(s.below / s.size).toFixed(2)}em`);
    for (const w of book.thin) {
      const fg = parseColor(w.color);
      const bg = parseColor(w.bg);
      const text = fg && bg ? over(fg, bg) : null;
      const ratio = text ? `${contrast(text, bg).toFixed(1)}:1` : 'contrast unknown';
      const lc = text ? ` APCA Lc ${apcaLc([text.r, text.g, text.b], [bg.r, bg.g, bg.b]).toFixed(0)} (advisory)` : '';
      add('MT-WEIGHT-THIN', 'MEDIUM', w.path, `weight ${w.weight} at ${w.size}px; WCAG ${ratio},${lc}`, 'font-weight: 400 or more for reading text');
    }
    for (const d of book.hairline) add('MT-DARK-HAIRLINE', 'LOW', d.path, `thinnest stroke ${d.stroke.toFixed(2)}px at ${d.size}px, light on dark`, 'a sturdier weight or a lower-contrast face below 18px, and letter-spacing of 0.01 to 0.02em');
    for (const i of book.icons) {
      const fix = i.flex ? `translate the icon by ${(-i.offset).toFixed(1)}px, or size it to the cap height` : `vertical-align: ${i.va.toFixed(3)}em`;
      add('MT-ICON-ALIGN', 'LOW', i.path, `${i.offset.toFixed(1)}px between the icon's centre and the middle of the capitals (${i.offset > 0 ? 'icon low' : 'icon high'})`, fix);
    }

    const product = await page.evaluate(productChecks);
    const renderedFace = async (selector) => {
      try {
        const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 });
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.nodeId, selector });
        if (!nodeId) return null;
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        return fonts.sort((a, b) => b.glyphCount - a.glyphCount)[0]?.familyName || null;
      } catch { return null; }
    };
    for (const t of product.tabular) {
      const face = (await renderedFace(`[data-mt-num="${t.num}"]`)) || t.family.split(',')[0].trim().replace(/^["']|["']$/g, '');
      const fix = t.fixable ? 'font-variant-numeric: lining-nums tabular-nums on the column' : `${face} has no tabular figures: set number columns in a face that has them (check tnum with font-features.py)`;
      add('MT-TABULAR', 'MEDIUM', t.path, `1 and 0 differ by ${t.diff.toFixed(1)}% in width, so digits do not line up`, fix);
    }
    for (const a of product.align) {
      if (a.header) add('MT-NUM-ALIGN', 'LOW', a.path, `the numbers are aligned at the end but their header is set text-align: ${a.align}`, 'text-align: end on the header too, so it sits over the place values');
      else add('MT-NUM-ALIGN', 'LOW', a.path, `numbers of different lengths set text-align: ${a.align}`, 'text-align: end on the number cells and their header, so place values line up');
    }
    for (const c of product.caps) add('MT-CAPS-TRACKING', 'LOW', c.path, `capitals at ${c.size}px with letter-spacing ${+c.tracking.toFixed(2)}px (under 0.03em)`, 'letter-spacing: 0.06em (5 to 10% of the size, Bringhurst §2.1.6)');
    for (const s of product.small) add('MT-UI-SIZE', 'LOW', s.path, `${s.size}px interface text (house floor 12px)`, 'font-size: 0.75rem or more');
    const cutAt1280 = await page.evaluate(truncatedText);
    for (const t of cutAt1280) {
      const why = t.titled ? '; its title or accessible name is not shown to sighted keyboard, touch or zoom users' : '';
      add('MT-TRUNCATE', 'LOW', t.path, `"${t.text}" cut at 1280px${why}`, 'let it wrap, or offer a visible way to read it (a disclosure or an expand control)');
    }
    await page.close();
    const zoomed = await open(640, null, { height: 450 });
    const known = new Set(cutAt1280.map((t) => t.path));
    for (const t of await zoomed.evaluate(truncatedText)) {
      if (!known.has(t.path)) add('MT-TRUNCATE', 'HIGH', t.path, `"${t.text}" fits at 1280px but is cut at 200% zoom: content lost to zoom (WCAG 1.4.4)`, 'let it wrap at narrow widths instead of truncating');
    }
    await zoomed.close();

    // ---- text spacing override (WCAG 1.4.12)
    const spacing = await open(1280);
    // The override goes on every element inline with !important, which beats an author !important rule,
    // as a reader's own stylesheet or bookmarklet would. A box that already clipped without the override
    // counts only if it clips more after it and is not a 1px or collapsed box (screen-reader text, a closed
    // panel, a spam trap), which hide their text by design.
    const spaced = await spacing.evaluate(() => {
      const mt = window.__mt;
      const boxes = [...document.body.querySelectorAll('*')].filter((el) => el.textContent.trim());
      const clip = (el) => {
        const cs = getComputedStyle(el);
        if (!/hidden|clip/.test(cs.overflowX + cs.overflowY)) return 0;
        return Math.max(el.scrollHeight - el.clientHeight, el.scrollWidth - el.clientWidth);
      };
      const spill = (el) => {
        const cs = getComputedStyle(el);
        if (/hidden|clip|auto|scroll/.test(cs.overflowY) || cs.display === 'inline') return 0;
        return el.scrollHeight - el.clientHeight;
      };
      const before = new Map(boxes.map((el) => [el, { clip: clip(el), spill: spill(el) }]));
      for (const el of document.querySelectorAll('*')) {
        el.style.setProperty('line-height', '1.5', 'important');
        el.style.setProperty('letter-spacing', '0.12em', 'important');
        el.style.setProperty('word-spacing', '0.16em', 'important');
        if (el.tagName === 'P') el.style.setProperty('margin-block-end', '2em', 'important');
      }
      const out = [];
      for (const el of boxes) {
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || el.closest('[aria-hidden="true"]')) continue;
        const was = before.get(el);
        const c = clip(el);
        // Text cut on purpose by an ellipsis or a line clamp is MT-TRUNCATE's finding, not this one's.
        const ecs = getComputedStyle(el);
        const truncated = was.clip > 1 && (ecs.textOverflow === 'ellipsis' || (ecs.webkitLineClamp && ecs.webkitLineClamp !== 'none'));
        if (c > 1 && c > was.clip + 1 && !truncated) out.push({ path: mt.path(el), over: c, kind: 'clip' });
        const sp = spill(el);
        const next = el.nextElementSibling;
        if (sp > 1 && sp > was.spill + 1 && next && mt.visible(next)) {
          const overlap = r.top + el.scrollHeight - next.getBoundingClientRect().top;
          if (overlap > 1) out.push({ path: mt.path(el), over: Math.round(overlap), kind: 'overlap' });
        }
      }
      return out;
    });
    for (const c of spaced) {
      if (c.kind === 'clip') add('MT-TEXT-SPACING', 'HIGH', `${c.path} under the 1.4.12 override`, `${c.over}px of text clipped`, 'remove the fixed height or overflow: hidden on text boxes');
      else add('MT-TEXT-SPACING', 'HIGH', `${c.path} under the 1.4.12 override`, `text spills out of its fixed height and overlaps the next block by ${c.over}px`, 'remove the fixed height, or use min-block-size');
    }
    await spacing.close();

    // ---- reflow and narrow measure
    for (const [width, label] of [[320, '320 CSS px (400% zoom of 1280)'], [375, '375px']]) {
      const p = await open(width);
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        if (sw <= vw + 1) {
          // overflow-x: hidden can keep the page from scrolling while text runs off the edge.
          const scrolls = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (/auto|scroll/.test(getComputedStyle(a).overflowX)) return true; return false; };
          const cut = window.__mt.textElements().filter((el) => {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width <= 1 || cs.textOverflow === 'ellipsis' || el.closest('[aria-hidden="true"], [inert]')) return false;
            return (rect.right > vw + 1 || rect.left < -1) && !scrolls(el);
          });
          if (!cut.length) return null;
          const past = Math.round(Math.max(...cut.map((el) => el.getBoundingClientRect().right - vw)));
          return { hidden: true, vw, past, culprits: cut.slice(0, 3).map((el) => window.__mt.path(el)) };
        }
        const wide = [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > vw + 1 && !(el.parentElement && el.parentElement !== document.body && el.parentElement.getBoundingClientRect().right > vw + 1));
        return { sw, vw, culprits: wide.slice(0, 3).map((el) => window.__mt.path(el)) };
      });
      if (r && r.hidden) add('MT-REFLOW', 'HIGH', `${r.culprits.join(', ')} at ${label}`, `text runs ${r.past}px past the ${r.vw}px viewport; hidden overflow keeps the page from scrolling, so it is cut off`, 'max-inline-size instead of fixed widths; let wide content scroll inside its own container');
      else if (r) add('MT-REFLOW', 'HIGH', `${r.culprits.join(', ') || 'page'} at ${label}`, `page is ${r.sw}px wide in a ${r.vw}px viewport`, 'max-inline-size instead of fixed widths; let tables scroll inside a wrapper');
      await p.close();
    }
    const tablet = await open(768);
    const short = await tablet.evaluate(() => window.__mt.reading().map((el, i) => {
      el.setAttribute('data-mt-s', i);
      const m = measureLines(`[data-mt-s="${i}"]`);
      return { path: window.__mt.path(el), avg: m.avgCharsPerLine, cjk: window.__mt.cjk(el) };
    }).filter((r) => r.avg && r.avg < (r.cjk ? 20 : 40)));
    for (const s of short) add('MT-MEASURE-SHORT', 'LOW', `${s.path} at 768px`, `${s.avg} characters per line`, 'widen the column or reduce the size');
    await tablet.close();

    // ---- zoom growth: size in device px at zoom z is z * size at width 1280 / z.
    // Every text element must reach 2× by 500% (MT-ZOOM-VW); headings also get the 1.6× house bar.
    // Elements are paired across the three loads by path and occurrence, not by
    // position: a page that adds or drops elements by width shifts every index.
    const textSizes = async (width) => {
      const p = await open(width, null, { height: Math.round((900 * width) / 1280) });
      const s = await p.evaluate(() => [...document.body.querySelectorAll('*')]
        .filter((el) => window.__mt.directText(el) && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName))
        .map((el) => ({ path: window.__mt.path(el), heading: /^H[1-6]$/.test(el.tagName), size: parseFloat(getComputedStyle(el).fontSize) })));
      await p.close();
      return s;
    };
    const keyed = (list) => {
      const seen = new Map();
      return new Map(list.map((t) => {
        const n = (seen.get(t.path) || 0) + 1;
        seen.set(t.path, n);
        return [`${t.path}#${n}`, t];
      }));
    };
    const [z1, z2, z5] = [keyed(await textSizes(1280)), keyed(await textSizes(640)), keyed(await textSizes(256))];
    const zoomSeen = new Set();
    let unmatched = 0;
    z1.forEach((t, key) => {
      if (!t.size || zoomSeen.has(t.path)) return;
      if (!z2.has(key) || !z5.has(key)) { unmatched++; return; }
      const g200 = (2 * z2.get(key).size) / t.size;
      const g500 = (5 * z5.get(key).size) / t.size;
      if (g500 < 1.99) {
        zoomSeen.add(t.path);
        add('MT-ZOOM-VW', 'HIGH', t.path, `${t.size}px grows ${g200.toFixed(2)}× at 200% and ${g500.toFixed(2)}× at 500% zoom`, 'clamp(min-rem, rem + vi, max-rem) with a range near 1.4×');
      } else if (t.heading && g200 < 1.6) {
        zoomSeen.add(t.path);
        add('MT-ZOOM-GROWTH', 'LOW', t.path, `${g200.toFixed(2)}× at 200% zoom on a 1280px window (house bar 1.6×)`, 'narrow the fluid range');
      }
    });
    if (unmatched) notVerified.add(`zoom growth of ${unmatched} text element${unmatched === 1 ? '' : 's'} the page shows only at some widths`);
  } finally {
    if (own) await browser.close();
  }

  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.rule.localeCompare(b.rule));
  const high = findings.filter((f) => f.severity === 'HIGH').length;
  return { mode: 'rendered', target: url, files: [url], findings, verdict: high ? `Block (${high} HIGH)` : 'Approve', notVerified: [...notVerified] };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const unknown = args.find((a) => a.startsWith('--') && !['--json', '--lite'].includes(a));
  if (unknown) {
    console.error(`unknown option ${unknown}; usage: page-audit.js <url|file.html> [--lite] [--json]`);
    process.exit(2);
  }
  const json = args.includes('--json');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('usage: page-audit.js <url|file.html> [--lite] [--json]');
    process.exit(2);
  }
  const print = (report) => {
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      if (report.mode === 'lite') console.log('Lite mode, no browser: source checks only. For the rendered checks: npm install && npx playwright install chromium\n');
      console.log(report.findings.length ? toMarkdown(report) : `No typography findings on ${report.target}.\n\nVerdict: ${report.verdict}\nNot verified: ${report.notVerified.join('; ')}\n`);
    }
    process.exit(report.findings.some((f) => f.severity === 'HIGH') ? 1 : 0);
  };
  const fail = (err) => {
    console.error(err.message);
    process.exit(2);
  };
  audit(target, { lite: args.includes('--lite') }).then(print).catch((err) => {
    if (!needsInstall(err)) return fail(err);
    try {
      print(liteAudit(target));
    } catch (liteErr) {
      fail(liteErr);
    }
  });
}

module.exports = { audit };
