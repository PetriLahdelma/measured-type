#!/usr/bin/env node
/**
 * Rendered typography audit of a whole page, with the rule IDs and severities
 * of references/audit.md. Where lint-css.js reads the source, this script
 * loads the page in Chromium and measures what the reader gets.
 *
 *   node scripts/page-audit.js page.html
 *   node scripts/page-audit.js https://example.com/post --json
 *   node scripts/page-audit.js page.html --baseline --u --baseline-scope .prose   # also a strict baseline grid
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
 * columns, tracked capitals, truncated text, interface text size). With
 * --baseline <px|rem|--custom-property>, also baseline drift from a strict
 * grid at 1280, 768 and 375px (spec 0020).
 *
 * Exit code 1 when a HIGH finding remains (verdict Block), 0 otherwise.
 * Requires Playwright: npm install && npx playwright install chromium.
 * With --lite, or when Playwright is missing, it lints a local page and its
 * stylesheets instead and lists every rendered check under Not verified.
 */

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { measureLines, leadingFloor } = require('./measure-line.js');
const { toMarkdown, lint, verdictOf, textFindings, isLanguageTag, languageTagFix } = require('./lint-css.js');
const { apcaLc } = require('./apca.js');
const { nearestPassing } = require('./contrast-fix.js');

const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong|-apple-system|blinkmacsystemfont)$/i;

// ---------- in-page helpers (serialized into the page) ----------

function pageHelpers() {
  // Text that is code or a form field, never checked as prose (spec 0022 P1).
  window.__mtExempt = 'code, kbd, samp, pre, tt, textarea, script, style, noscript, template';
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
        if (window.__mt.clippedAway(s)) return false;
        const r = p.getBoundingClientRect();
        if (r.width <= 1 && r.height <= 1 && /hidden|clip/.test(s.overflow)) return false;
      }
      return true;
    },
    // clip-path: inset(50%) or more, or a clip: rect() of zero area, leaves nothing of the box on screen
    // (the screen-reader-only patterns, spec 0024 V1).
    clippedAway(s) {
      const inset = /^inset\(([^)]*)\)/.exec(s.clipPath);
      if (inset) {
        const v = inset[1].split(/\s+round\s+/)[0].trim().split(/\s+/).map((x) => (/%$/.test(x) ? parseFloat(x) : NaN));
        const [t, r = t, b = t, l = r] = v;
        if (t + b >= 100 || l + r >= 100) return true;
      }
      const rect = /^rect\(([^)]*)\)/.exec(s.clip);
      if (rect) {
        const [t, r, b, l] = rect[1].split(/[\s,]+/).map((x) => (x === 'auto' ? NaN : parseFloat(x)));
        if (b <= t || r <= l) return true;
      }
      return false;
    },
    directText(el) {
      return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    },
    // Spec 0031: navigation, menus, dialogs and consent banners are interface, not running text.
    chrome(el) {
      return !!el.closest('nav, [role=navigation], [role=menu], [role=menubar], [role=dialog], dialog, [aria-modal=true]')
        || [...ancestors(el)].some((a) => /cookie|consent|gdpr/i.test(`${a.id} ${typeof a.className === 'string' ? a.className : ''}`));
      function* ancestors(n) { for (let p = n; p && p !== document.body; p = p.parentElement) yield p; }
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
      const startY = scrollY;
      // Spec 0029 U8: one probe stylesheet for the whole pass. Inserting it per element forced a style
      // recalculation of the page twice for every text element.
      const probe = document.createElement('style');
      probe.textContent = '* { pointer-events: auto !important; }';
      document.head.appendChild(probe);
      const samples = mt.textElements().filter((el) => !el.closest(':disabled, [aria-disabled="true"]')).map((el) => {
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
        // Spec 0025 R3: with nothing painted above it, the text sits on the browser's canvas for the
        // page's colour scheme, not on an assumed white.
        if (!found) grounds.push(mt.canvas());
        // Spec 0029 U5: the ground is what is painted under the text where it sits, which may be a layer that
        // is not an ancestor (a positioned sibling drawing a bar's colour). Elements under the text in paint
        // order, from the text down, give it; the ancestor chain above stands in where the text is not hit.
        const stack = mt.stackUnder(el);
        if (stack) {
          grounds.length = 0;
          image = false;
          for (const s of stack) {
            const st = getComputedStyle(s);
            // Spec 0029 U7: a ::after or ::before layer that covers its element paints between the element's
            // background and its content; elementsFromPoint never returns it, so it is read here.
            let covered = false;
            for (const layer of mt.pseudoLayers(s)) {
              if (layer.image) { image = true; covered = true; break; }
              grounds.push(layer.bg);
              if (/, 1\)$/.test(layer.bg)) { covered = true; break; }
            }
            if (covered) break;
            if (st.backgroundImage !== 'none') { image = true; break; }
            const bg = mt.rgba(st.backgroundColor);
            if (!bg || /, 0\)$/.test(bg)) continue;
            const own = s.contains(el) ? 1 : parseFloat(st.opacity);
            grounds.push(own < 1 ? bg.replace(/, ([\d.]+)\)$/, (m, a) => `, ${+(parseFloat(a) * own).toFixed(3)})`) : bg);
            if (/, 1\)$/.test(grounds[grounds.length - 1])) break;
          }
          if (!grounds.length || !/, 1\)$/.test(grounds[grounds.length - 1])) grounds.push(mt.canvas());
        }
        const fg = mt.rgba(cs.color);
        const color = fg && fg.replace(/, ([\d.]+)\)$/, (m, a) => `, ${+(parseFloat(a) * fade).toFixed(3)})`);
        return { path: mt.path(el), color, rawColor: cs.color, faded: fade < 1 ? +fade.toFixed(2) : null, grounds, image, fadedGround, hidden: fade === 0, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) };
      });
      probe.remove();
      window.scrollTo(0, startY);
      return samples;
    },
    // Spec 0025 R3: the colour the browser paints under an unpainted page for the colour scheme in
    // force (white, or rgb(18, 18, 18) for a dark scheme in Chromium): the Canvas system colour,
    // resolved under the root element.
    // Spec 0029 U5: the elements painted under the element at a point of its first line box, the element
    // itself and what lies below it, in paint order; null where the point is not on the element. Pointer
    // events are switched on for the probe, so decorative layers with pointer-events: none are seen.
    stackUnder(el, retried = false) {
      const box = [...el.getClientRects()].find((x) => x.width > 0 && x.height > 0);
      if (!box) return null;
      const y = box.top + box.height / 2;
      if (y < 0 || y > innerHeight) {
        if (retried) return null;
        window.scrollBy(0, y - innerHeight / 2);
        return window.__mt.stackUnder(el, true);
      }
      const x = box.left + Math.min(box.width / 2, 8);
      const stack = document.elementsFromPoint(x, y);
      const at = stack.findIndex((s) => s === el || el.contains(s));
      return at === -1 ? null : stack.slice(at).filter((s) => s === el || !el.contains(s));
    },
    // Spec 0029 U7: the ::after and ::before layers of an element that cover its box, as painted grounds
    // ({ bg } or { image: true }), topmost first.
    pseudoLayers(el) {
      const out = [];
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      for (const which of ['::after', '::before']) {
        const ps = getComputedStyle(el, which);
        if (ps.content === 'none' || ps.content === 'normal' || !/absolute|fixed/.test(ps.position)) continue;
        if (!(parseFloat(ps.width) >= w - 1 && parseFloat(ps.height) >= h - 1)) continue;
        if (ps.backgroundImage !== 'none') { out.push({ image: true }); continue; }
        const bg = window.__mt.rgba(ps.backgroundColor);
        if (bg && !/, 0\)$/.test(bg)) out.push({ bg });
      }
      return out;
    },
    canvas() {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;background-color:Canvas';
      document.documentElement.appendChild(probe);
      const c = window.__mt.rgba(getComputedStyle(probe).backgroundColor);
      probe.remove();
      return c || 'rgba(255, 255, 255, 1)';
    },
    textElements() {
      // Text inside video, audio, canvas, object and iframe is fallback content a browser that
      // supports the element never draws.
      return [...document.body.querySelectorAll('*')].filter((el) => window.__mt.directText(el) && window.__mt.visible(el) && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'VIDEO', 'AUDIO', 'CANVAS', 'OBJECT', 'IFRAME'].includes(el.tagName));
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
    return mt.canvas(); // spec 0025 R3: the browser's canvas for the page's colour scheme
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
  const out = { code: [], boxes: [], kern: [], confusable: [], order: [], pair: [], space: [], thin: [], hairline: [], icons: [], links: [], colourLinks: 0, xfloor: [] };

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
    // Spec 0031 Y4, Y5: a link in running text that only its colour tells apart (WCAG 1.4.1, F73, G183).
    for (const a of block.querySelectorAll('a[href]')) {
      const text = a.textContent.trim();
      if (!text || text === block.textContent.trim() || !mt.visible(a) || mt.chrome(a)) continue; // the whole block is a link, or interface
      // Running text: the nearest ancestor that holds 20 or more letters outside links (a list of links has none).
      let running = false;
      for (let p = a.parentElement; p && !running; p = p === block ? null : p.parentElement) {
        let own = p.textContent;
        for (const other of p.querySelectorAll('a')) own = own.replace(other.textContent, '');
        running = (own.match(/\p{L}/gu) || []).length >= 20;
      }
      if (!running) continue;
      const around = getComputedStyle(a.parentElement);
      const visibleLine = (cs) => /underline|overline/.test(cs.textDecorationLine) && !/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)|transparent/.test(cs.textDecorationColor);
      const cue = [a, ...a.querySelectorAll('*')].some((el) => {
        const cs = getComputedStyle(el);
        return visibleLine(cs)
          || (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none')
          || cs.backgroundImage !== 'none'
          || !/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)|transparent/.test(cs.backgroundColor)
          || Math.abs(parseInt(cs.fontWeight, 10) - parseInt(around.fontWeight, 10)) >= 300
          || cs.fontStyle !== around.fontStyle
          || cs.fontFamily !== around.fontFamily
          || /super|sub/.test(cs.verticalAlign)
          || (cs.boxShadow !== 'none')
          || ['::before', '::after'].some((pe) => !/^(none|normal)$/.test(getComputedStyle(el, pe).content));
      });
      if (cue) continue;
      const l1 = lum(getComputedStyle(a).color);
      const l2 = lum(around.color);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 3) {
        // One finding per style: a page styles its links once, and a long page has thousands.
        const key = `${getComputedStyle(a).color}|${around.color}`;
        const known = out.links.find((l) => l.key === key);
        if (known) known.count++;
        else out.links.push({ key, path: mt.path(a), ratio, color: getComputedStyle(a).color, text: around.color, count: 1 });
      } else out.colourLinks++;
    }
    // Spec 0031 Y6: 16px and over, but an x-height under 7px reads smaller than its size says.
    const blockSize = parseFloat(bcs.fontSize);
    if (blockSize >= 16 - 0.01 && mt.latin(block)) {
      const xh = xHeight(bcs);
      if (xh < 7 - 0.005 && once(`xfloor|${mt.path(block)}`)) out.xfloor.push({ path: mt.path(block), size: blockSize, xh, ratio: xh / blockSize });
    }
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

  // G5 heading order: each heading against the nearest higher-level heading before it in the document,
  // once per combination of sizes and weights so a run of cards reports one row.
  const orderSeen = new Set();
  headings.forEach((el, i) => {
    const level = +el.tagName[1];
    let upEl = null;
    for (let j = i - 1; j >= 0 && !upEl; j--) if (+headings[j].tagName[1] < level) upEl = headings[j];
    if (!upEl) return;
    const [up, h] = [getComputedStyle(upEl), getComputedStyle(el)];
    const size = parseFloat(h.fontSize);
    const upSize = parseFloat(up.fontSize);
    const weight = parseInt(h.fontWeight, 10);
    const upWeight = parseInt(up.fontWeight, 10);
    const key = [el.tagName, upEl.tagName, size, weight, upSize, upWeight].join('|');
    if (size >= upSize - 0.01 && weight >= upWeight && !orderSeen.has(key)) {
      orderSeen.add(key);
      out.order.push({ path: mt.path(el), tag: el.tagName.toLowerCase(), size, weight, upTag: upEl.tagName.toLowerCase(), upSize, upWeight });
    }
  });

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
  const out = { tabular: [], align: [], caps: [], capsText: [], small: [] };
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
    // Only cased letters can be capitals: Arabic, Hebrew, CJK and other caseless scripts have none, so
    // a Latin code inside Arabic text is not text set in capitals.
    const cased = [...letters].filter((ch) => ch.toUpperCase() !== ch.toLowerCase()).join('');
    const mostlyCased = cased.length >= 2 && cased.length >= letters.length / 2;
    const typedCaps = mostlyCased && cased === cased.toUpperCase();
    const transformed = cs.textTransform === 'uppercase' && mostlyCased;
    const code = el.closest('code, kbd, samp, pre, tt');
    // One word of five or fewer capitals, typed that way, is an acronym (DACH, USB-C), not a label.
    const acronym = typedCaps && cs.textTransform !== 'uppercase' && cased.length <= 5 && !/\s/.test(own);
    const tracking = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const p = mt.path(el);
    if (!code && (transformed || typedCaps) && cased.length > 60 && once(`capstext|${p}`)) {
      out.capsText.push({ path: p, letters: cased.length });
    } else if (!code && !acronym && (transformed || (typedCaps && cased.length >= 4 && !el.closest('p, li, dd, blockquote'))) && size < 20 && tracking < 0.03 * size - 0.01 && once(`caps|${p}`)) {
      out.caps.push({ path: p, size, tracking });
    }
    if (size < 12 - 0.01 && !inReading(el) && !['SUP', 'SUB'].includes(el.tagName) && !el.closest('[aria-hidden="true"]') && once(`small|${p}`)) {
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


// Spec 0022, run in the page. Text as the reader gets it: the visible text nodes of each block,
// with the block's lang, code and form fields left out as in the linter.
function pageText() {
  const mt = window.__mt;
  const blockOf = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) if (!/^(inline|contents)/.test(getComputedStyle(p).display)) return p;
    return document.body;
  };
  const exempt = window.__mtExempt;
  const blocks = new Map();
  const scopes = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const groups = {
    Latin: /\p{Script=Latin}/gu, Cyrillic: /\p{Script=Cyrillic}/gu, Greek: /\p{Script=Greek}/gu, Arabic: /\p{Script=Arabic}/gu,
    Hebrew: /\p{Script=Hebrew}/gu, CJK: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    Thai: /\p{Script=Thai}/gu, Devanagari: /\p{Script=Devanagari}/gu,
  };
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    if (!parent || !n.textContent.trim() || parent.closest(exempt) || !mt.visible(parent)) continue;
    const block = blockOf(parent);
    if (!blocks.has(block)) blocks.set(block, { path: mt.path(block), lang: (block.closest('[lang]')?.getAttribute('lang') || '').trim(), text: '' });
    blocks.get(block).text += n.textContent;
    const scope = parent.closest('[lang]') || document.documentElement;
    if (!scopes.has(scope)) scopes.set(scope, { path: mt.path(scope), lang: (scope.getAttribute('lang') || '').trim(), counts: {} });
    const c = scopes.get(scope).counts;
    for (const [g, re] of Object.entries(groups)) c[g] = (c[g] || 0) + (n.textContent.match(re) || []).length;
  }
  const tags = [...document.querySelectorAll('[lang]')].filter((el) => el !== document.documentElement && !/^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName))
    .map((el) => ({ path: mt.path(el), tag: el.tagName.toLowerCase(), value: el.getAttribute('lang').trim() })).filter((t) => t.value);
  return { html: (document.documentElement.getAttribute('lang') || '').trim(), tags, blocks: [...blocks.values()], scopes: [...scopes.values()] };
}

// U1: a price, a quantity and its unit or a price and its period that the layout breaks across lines.
function numberBreaks() {
  const mt = window.__mt;
  const codes = 'EUR|USD|GBP|SEK|NOK|DKK|ISK|CHF|JPY|CNY|INR|AUD|CAD|NZD|PLN|CZK|HUF';
  const units = '%|‰|°C|°F|km/h|km|cm|mm|m²|m³|m|kg|mg|g|ml|dl|cl|l|L|ms|min|s|h|kWh|kW|MW|W|V|mAh|Hz|kHz|MHz|GHz|kB|KB|MB|GB|TB|Gt|Tt|kbps|Mbps|Gbps|px|pt|mph|fps|dpi|ppi|ft|lb|oz|kr|kpl|st';
  const period = String.raw`(?:\s?\/\s?(?:mo|month|yr|year|day|week|night|user|seat|person|kk|kuukausi|vuosi|v|mån|månad|år|h|hr|hour))?`;
  const num = String.raw`\d+(?:[.,]\d+)*(?:[ \u00A0\u202F]\d{3})*(?:[.,]\d+)?`;
  const re = new RegExp(String.raw`(?:\p{Sc}|\b(?:${codes})\b)\s*${num}${period}|${num}\s*(?:\p{Sc}|(?:${codes}|${units})(?![\p{L}\d]))${period}`, 'gu');
  const range = document.createRange();
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    if (!parent || !/\d/.test(n.textContent) || parent.closest(window.__mtExempt) || !mt.visible(parent)) continue;
    const size = parseFloat(getComputedStyle(parent).fontSize);
    for (const m of n.textContent.matchAll(re)) {
      range.setStart(n, m.index);
      range.setEnd(n, m.index + m[0].length);
      const tops = [...range.getClientRects()].filter((r) => r.width > 0).map((r) => r.top);
      if (tops.length > 1 && Math.max(...tops) - Math.min(...tops) > size / 2) out.push({ path: mt.path(parent), token: m[0] });
    }
  }
  return out;
}

// S1, S2: elements that ask for bold or italic with synthesis allowed, one per font and style.
function styleCombos() {
  const mt = window.__mt;
  const combos = new Map();
  for (const el of mt.textElements()) {
    if (el.closest(window.__mtExempt)) continue;
    const cs = getComputedStyle(el);
    const weight = parseInt(cs.fontWeight, 10);
    const axes = [];
    if (weight >= 600 && cs.fontSynthesisWeight !== 'none') axes.push('weight');
    if (cs.fontStyle !== 'normal' && cs.fontSynthesisStyle !== 'none') axes.push('style');
    const sample = [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join('').trim().slice(0, 24);
    if (!/\p{L}/u.test(sample)) continue;
    for (const axis of axes) {
      const key = [axis, cs.fontFamily, weight, cs.fontStyle, cs.fontStretch].join('|');
      if (!combos.has(key)) combos.set(key, { axis, family: cs.fontFamily, weight, style: cs.fontStyle, stretch: cs.fontStretch, sample, lang: el.closest('[lang]')?.getAttribute('lang') || '', cjk: mt.cjk(el), paths: [] });
      combos.get(key).paths.push(mt.path(el));
    }
  }
  return [...combos.values()].slice(0, 24);
}

// F2: font-optical-sizing: none where the rendered face has an opsz axis, found by drawing a sample at
// two optical sizes; a face without the axis ignores the setting and draws the same width.
function opticalSizing() {
  const mt = window.__mt;
  const seen = new Set();
  const out = [];
  for (const el of mt.textElements()) {
    const cs = getComputedStyle(el);
    if (cs.fontOpticalSizing !== 'none' || /["']opsz["']/.test(cs.fontVariationSettings) || seen.has(cs.fontFamily)) continue;
    seen.add(cs.fontFamily);
    const s = document.createElement('span');
    s.style.cssText = 'position: absolute; white-space: nowrap; letter-spacing: 0';
    s.textContent = 'Hamburgefonstiv 0123';
    el.append(s);
    s.style.fontVariationSettings = '"opsz" 8';
    const small = s.getBoundingClientRect().width;
    s.style.fontVariationSettings = '"opsz" 72';
    const large = s.getBoundingClientRect().width;
    s.remove();
    if (Math.abs(small - large) / large > 0.005) out.push({ path: mt.path(el), family: cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''), size: parseFloat(cs.fontSize) });
  }
  return out;
}

// F1: @font-face rules from the stylesheets the page can read; cross-origin sheets cannot be read.
function fontFaceRules() {
  const faces = [];
  const unread = [];
  const walk = (rules, where) => {
    for (const r of rules) {
      if (r instanceof CSSFontFaceRule) {
        const src = r.style.getPropertyValue('src');
        const display = r.style.getPropertyValue('font-display').trim();
        if (/url\(/i.test(src)) faces.push({ family: r.style.getPropertyValue('font-family').replace(/^["']|["']$/g, ''), display, where });
      } else if (r instanceof CSSImportRule) {
        // Spec 0030 X8: a stylesheet brought in by @import is not in document.styleSheets of its own.
        const sheet = r.styleSheet;
        const name = (r.href || '').split(/[?#]/)[0].split('/').pop() || where;
        try { if (sheet) walk(sheet.cssRules, name); } catch { unread.push(sheet && sheet.href ? sheet.href : r.href); }
      } else if (r.cssRules) walk(r.cssRules, where);
    }
  };
  for (const sheet of document.styleSheets) {
    const where = sheet.href ? sheet.href.split(/[?#]/)[0].split('/').pop() : 'inline <style>';
    try { walk(sheet.cssRules, where); } catch { unread.push(sheet.href); }
  }
  return { faces, unread };
}

// F3: text blocks with their boxes in page px, to compare the fallback load with the loaded one: the
// width the text sets (the sum of its line boxes) and the height of a line are what a metric-matched
// fallback reproduces.
function blockBoxes() {
  const mt = window.__mt;
  const errored = [...document.fonts].filter((f) => f.status === 'error');
  const range = document.createRange();
  return {
    screen: innerHeight,
    errored: errored.length,
    optional: errored.length > 0 && errored.every((f) => f.display === 'optional'),
    blocks: [...document.querySelectorAll('p, li, dt, dd, figcaption, blockquote, h1, h2, h3, h4, h5, h6')].filter((el) => mt.visible(el) && mt.directText(el)).map((el) => {
      const r = el.getBoundingClientRect();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((x) => x.width > 0);
      const lines = new Set(rects.map((x) => Math.round(x.top))).size || 1;
      return { path: mt.path(el), top: r.top + scrollY, bottom: r.bottom + scrollY, advance: rects.reduce((sum, x) => sum + x.width, 0), line: r.height / lines };
    }),
  };
}

// First and last baseline of every text block in the region, in page px,
// found with a zero-size inline-block that sits on the baseline. The markers
// are removed at once, so later checks see the page unchanged. A unit named
// as a custom property is resolved on the region, as the page computes it.
function baselines({ unit, scope }) {
  const mt = window.__mt;
  let root;
  try {
    root = scope ? document.querySelector(scope) : document.querySelector('main') || document.body;
  } catch {
    return { error: `--baseline-scope ${scope} is not a selector the browser can parse` };
  }
  if (!root) return { why: `--baseline-scope ${scope} matches nothing` };
  let px;
  if (unit.startsWith('--')) {
    const probe = document.createElement('div');
    probe.style.cssText = `position: absolute; visibility: hidden; inline-size: 0; block-size: var(${unit})`;
    root.append(probe);
    px = probe.getBoundingClientRect().height;
    probe.remove();
    if (!(px > 0)) return { why: `${unit} does not resolve to a length on ${scope || mt.path(root)}` };
  } else {
    px = unit.endsWith('rem') ? parseFloat(unit) * parseFloat(getComputedStyle(document.documentElement).fontSize) : parseFloat(unit);
  }
  const blocks = [...root.querySelectorAll('p, li, dt, dd, figcaption, blockquote, h1, h2, h3, h4, h5, h6')]
    .filter((el) => mt.visible(el) && mt.directText(el));
  const at = (el, end) => {
    const m = document.createElement('span');
    m.style.cssText = 'display: inline-block; inline-size: 0; block-size: 0; margin: 0; padding: 0; border: 0; vertical-align: baseline';
    if (end) el.append(m); else el.prepend(m);
    const y = m.getBoundingClientRect().bottom + window.scrollY;
    m.remove();
    return y;
  };
  return { px, blocks: blocks.map((el) => ({ path: mt.path(el), first: at(el, false), last: at(el, true), lineHeight: getComputedStyle(el).lineHeight })) };
}

// Spec 0020. The origin is the offset most first baselines share; distances
// wrap around the grid, so -0.5px and 7.5px on an 8px grid are the same place.
function gridDrift({ px, blocks }, tolerance = 1) {
  const mod = (y) => ((y % px) + px) % px;
  const dist = (a, b) => { const d = Math.abs(a - b); return Math.min(d, px - d); };
  const firsts = blocks.map((b) => mod(b.first));
  let origin = 0;
  let best = [-1, Infinity];
  for (const c of firsts) {
    const near = firsts.filter((f) => dist(f, c) <= tolerance);
    const score = [near.length, near.reduce((s, f) => s + dist(f, c), 0)];
    if (score[0] > best[0] || (score[0] === best[0] && score[1] < best[1])) { best = score; origin = c; }
  }
  return blocks.map((b) => ({ ...b, firstOff: dist(mod(b.first), origin), lastOff: dist(mod(b.last), origin), multiLine: b.last - b.first > 1 }))
    .filter((b) => b.firstOff > tolerance || (b.multiLine && b.lastOff > tolerance));
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

// ---------- spec 0022: language, punctuation, synthesized styles, font swap ----------

const SCRIPT_GROUP = { Latn: 'Latin', Cyrl: 'Cyrillic', Grek: 'Greek', Arab: 'Arabic', Hebr: 'Hebrew', Jpan: 'CJK', Hans: 'CJK', Hant: 'CJK', Hani: 'CJK', Kore: 'CJK', Thai: 'Thai', Deva: 'Devanagari' };
const SCRIPT_HINT = { Latin: 'the Latin-script language it is in', Cyrillic: 'ru, uk, bg or sr', Greek: 'el', Arabic: 'ar, fa or ur', Hebrew: 'he', CJK: 'ja, zh or ko', Thai: 'th', Devanagari: 'hi, mr or ne' };
// Languages written in more than one script: the script cannot say whether lang is wrong.
const TWO_SCRIPTS = new Set(['sr', 'bs', 'uz', 'az', 'kk', 'ku', 'mn', 'pa', 'sd']);
const NO_LANG = '<html> has no lang: no hyphenation dictionary, quotes, locl forms or screen-reader voice';
// Marks that open a quotation in each language judged (P3). ’ is left out: it is also the apostrophe.
const OPENERS = {
  en: { marks: '“‘', name: 'English', use: '“ ” and ‘ ’' },
  fi: { marks: '”»', name: 'Finnish', use: '” ” and ’ ’ (or » »)' },
  sv: { marks: '”»', name: 'Swedish', use: '” ” and ’ ’ (or » »)' },
  de: { marks: '„‚»›', name: 'German', use: '„ “ and ‚ ‘ (or » «)' },
  fr: { marks: '«“‹‘', name: 'French', use: '« » with narrow no-break spaces, and “ ” inside' },
};

const scriptOf = (lang) => {
  try {
    return SCRIPT_GROUP[new Intl.Locale(Intl.getCanonicalLocales(lang)[0]).maximize().script];
  } catch {
    return undefined;
  }
};
const listed = (paths) => (paths.length > 3 ? `${paths.slice(0, 3).join(', ')} and ${paths.length - 3} more` : paths.join(', '));

// L1 to L3 and P1 to P3, from the text the reader gets at 1280px.
async function language(page, add, notVerified) {
  const t = await page.evaluate(pageText);
  if (!t.html) add('MT-LANG', 'MEDIUM', 'html', NO_LANG, '<html lang="en"> (the language of the page), and lang on every passage in another language');
  else if (!isLanguageTag(t.html)) add('MT-LANG', 'MEDIUM', 'html', `lang="${t.html}" on <html> is not a language tag`, languageTagFix(t.html));
  for (const tag of t.tags) if (!isLanguageTag(tag.value)) add('MT-LANG', 'MEDIUM', tag.path, `lang="${tag.value}" on <${tag.tag}> is not a language tag`, languageTagFix(tag.value));
  for (const s of t.scopes) {
    const lang = s.lang;
    const expected = lang && isLanguageTag(lang) && scriptOf(lang);
    const total = Object.values(s.counts).reduce((a, b) => a + b, 0);
    const [group, n] = Object.entries(s.counts).sort((a, b) => b[1] - a[1])[0] || [];
    if (!expected || TWO_SCRIPTS.has(new Intl.Locale(lang).language) || total < 20 || group === expected || n / total <= 0.6) continue;
    add('MT-LANG', 'MEDIUM', s.path, `lang="${lang}" (${expected} script), but ${Math.round((100 * n) / total)}% of its ${total} letters are ${group}${group === 'CJK' ? ' (Han, kana or Hangul)' : ''}`, `lang set to the language the text is in (${SCRIPT_HINT[group]}) on the element that holds it`);
  }
  notVerified.add('whether lang names the language of text written in its own script (Finnish declared English): only the script is checked');

  const kinds = new Map();
  const note = (rule, what, shown, path, fix) => {
    const key = `${rule}|${what}`;
    if (!kinds.has(key)) kinds.set(key, { rule, what, fix, shown: [], paths: [], count: 0 });
    const k = kinds.get(key);
    k.count++;
    if (!k.shown.includes(shown)) k.shown.push(shown);
    if (!k.paths.includes(path)) k.paths.push(path);
  };
  for (const b of t.blocks) {
    for (const f of textFindings(b.text)) {
      const [what, shown] = f.measured.split(/: (.*)/s);
      note(f.rule, what, shown, b.path, f.fix);
    }
    const primary = b.lang && isLanguageTag(b.lang) ? new Intl.Locale(b.lang) : null;
    const own = primary && OPENERS[primary.language];
    if (!own) continue;
    const marks = own.marks + (primary.language === 'de' && /^(CH|LI)$/.test(primary.region || '') ? '«‹' : '');
    for (const m of b.text.matchAll(/(?<=^|[\s(\[\/])([“”„‘‚«»‹›])(?=[^\s])/gu)) {
      if (marks.includes(m[1])) continue;
      const shown = b.text.slice(m.index, m.index + 24).split(/\s/).slice(0, 2).join(' ');
      note('MT-QUOTES', `${m[1]} opens a quote in ${own.name} (${b.lang}) text, which uses ${own.use}`, shown, b.path, `the quotation marks of the language: ${own.use} (or <q> with quotes: auto under the right lang)`);
    }
  }
  for (const k of kinds.values()) {
    const examples = k.shown.slice(0, 3).join(', ') + (k.shown.length > 3 ? ' ...' : '');
    add(k.rule, 'LOW', listed(k.paths), `${k.what}: ${examples} (${k.count} in ${k.paths.length} block${k.paths.length === 1 ? '' : 's'})`, k.fix);
  }
}

// S1, S2: a sample of each bold or italic combination drawn at 48px with synthesis allowed and with it
// off. A real face draws the same ink both times; a synthesized one does not.
async function synthesized(page, add) {
  for (const c of await page.evaluate(styleCombos)) {
    const ink = async (off) => {
      await page.evaluate(({ c, off }) => {
        const d = document.createElement('div');
        d.id = 'mt-synth';
        if (c.lang) d.lang = c.lang;
        d.textContent = c.sample;
        d.style.cssText = 'position: fixed; inset-block-start: 0; inset-inline-start: 0; z-index: 2147483647; background: #fff; color: #000; font-size: 48px; line-height: 1.2; padding: 4px; white-space: nowrap; letter-spacing: 0; font-synthesis: weight style';
        Object.assign(d.style, { fontFamily: c.family, fontWeight: String(c.weight), fontStyle: c.style, fontStretch: c.stretch });
        if (off) d.style[c.axis === 'weight' ? 'fontSynthesisWeight' : 'fontSynthesisStyle'] = 'none';
        document.body.append(d);
      }, { c, off });
      const png = await page.locator('#mt-synth').screenshot();
      await page.evaluate(() => document.getElementById('mt-synth').remove());
      return png;
    };
    if ((await ink(false)).equals(await ink(true))) continue;
    const family = c.family.split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (c.axis === 'weight') add('MT-BOLD-SYNTH', 'MEDIUM', listed(c.paths), `weight ${c.weight} in ${family} is synthesized: no face of that weight is loaded, so the browser thickens a lighter one`, 'load the bold face (a variable file with font-weight: 100 900 in its @font-face covers every weight), then font-synthesis-weight: none');
    else add('MT-ITALIC-SYNTH', 'MEDIUM', listed(c.paths), `${c.style} in ${family} is synthesized: no italic face is loaded, so the browser slants the roman`, c.cjk ? 'no italic: CJK has none; use weight or emphasis marks (text-emphasis) instead' : 'load the italic face, then font-synthesis-style: none (a slanted roman is not an italic)');
  }
}

// F3: the page again with every font request refused, at 1280 and 375px, text blocks in the first
// screen paired by path and occurrence. Reported when text moves more than 4px and the fallback is not
// matched: it sets the text more than 2.5% wider or narrower, or its lines more than 1px taller or
// shorter. A matched fallback can still rewrap a line that sits on a break; that is chance, not a
// missing fallback, and the fix would not remove it.
async function fontSwap(open, loaded, add) {
  const keyed = (blocks) => {
    const seen = new Map();
    return new Map(blocks.map((b) => { const n = (seen.get(b.path) || 0) + 1; seen.set(b.path, n); return [`${b.path}#${n}`, b]; }));
  };
  const moves = [];
  for (const width of [1280, 375]) {
    if (!loaded[width]) continue;
    const p = await open(width, null, { noFonts: true });
    const fallback = await p.evaluate(blockBoxes);
    await p.close();
    if (!fallback.errored || fallback.optional) return;
    const before = keyed(fallback.blocks);
    let worst = { move: 0 };
    let [web, fb, line] = [0, 0, 0];
    keyed(loaded[width].blocks).forEach((b, key) => {
      const f = before.get(key);
      if (!f || b.top >= loaded[width].screen) return;
      web += b.advance;
      fb += f.advance;
      line = Math.max(line, Math.abs(f.line - b.line));
      const move = Math.max(Math.abs(b.top - f.top), Math.abs(b.bottom - f.bottom));
      if (move > worst.move) worst = { move, path: b.path };
    });
    const wider = web ? fb / web - 1 : 0;
    if (worst.move > 4 && (Math.abs(wider) > 0.025 || line > 1)) moves.push({ ...worst, width, wider, line });
  }
  if (!moves.length) return;
  const top = moves.reduce((a, b) => (b.move > a.move ? b : a));
  const how = (m) => [Math.abs(m.wider) > 0.025 && `${(Math.abs(m.wider) * 100).toFixed(1)}% ${m.wider > 0 ? 'wider' : 'narrower'}`, m.line > 1 && `lines ${m.line.toFixed(1)}px apart in height`].filter(Boolean).join(', ');
  add('MT-FONT-SWAP', 'MEDIUM', top.path, `the fallback sets the text ${moves.map((m) => `${how(m)} at ${m.width}px`).join(' and ')} than the web fonts, so text in the first screen moves up to ${Math.round(top.move)}px when they arrive`, 'a metric-matched fallback: scripts/fallback-metrics.py prints its @font-face (size-adjust and the ascent, descent and line-gap overrides); or font-display: optional');
}

// ---------- audit ----------

// ---------- lite mode: no browser ----------

const RENDERED = [
  'rendered measure (characters per line)', 'contrast', 'reflow at 320 and 375px', 'text spacing (WCAG 1.4.12)',
  'zoom growth of headings', 'web-font fallback', 'heading order and spacing', 'the checks in screen-and-ui.md and product-ui.md',
  'script of the text against its lang', 'punctuation in text a script inserts', 'numbers and units broken across lines',
  'synthesized bold and italic', 'optical sizing', 'text moving when the web fonts arrive',
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
  if (opts.baseline !== undefined && !((/^(\d*\.?\d+)(px|rem)$/.test(opts.baseline) && parseFloat(opts.baseline) > 0) || /^--[\w-]+$/.test(opts.baseline))) {
    throw new Error(`--baseline must be a positive length in px or rem, or a custom property such as --u; got ${opts.baseline}`);
  }
  if (opts.baselineTolerance !== undefined && !(/^(\d*\.?\d+)px$/.test(opts.baselineTolerance) && parseFloat(opts.baselineTolerance) > 0)) {
    throw new Error(`--baseline-tolerance must be a positive length in px, such as 0.5px; got ${opts.baselineTolerance}`);
  }
  if (opts.lite) return liteAudit(target);
  const url = /^[a-z]+:\/\//i.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  const own = !opts.browser;
  const browser = opts.browser || (await loadPlaywright().chromium.launch());
  const findings = [];
  const notVerified = new Set(['Safari and Firefox rendering (Chromium only)']);
  const add = (rule, severity, location, measured, fix) => findings.push({ rule, severity, location, measured, fix });

  const open = async (width, extraCss, { height = 900, colorScheme, noFonts } = {}) => {
    // Spec 0024 V3: the audit injects its helpers as a script tag and its overrides as style tags,
    // which a strict Content-Security-Policy blocks. Bypassing it changes nothing the reader sees.
    // Every page the audit opens comes through here, each in its own context.
    const page = await browser.newPage({ viewport: { width, height }, bypassCSP: true, ...(colorScheme ? { colorScheme } : {}) });
    // Spec 0022 F3: with every font request refused, the page shows its fallback for good.
    if (noFonts) await page.route('**/*', (r) => (r.request().resourceType() === 'font' ? r.abort() : r.continue()));
    const response = await page.goto(url, { waitUntil: 'load' });
    // Spec 0025 R2: an error response is not the page asked for; auditing it would approve nothing.
    if (response && response.status() >= 400) {
      await page.close();
      throw new Error(`${url} answered ${response.status()}: nothing was audited (an error response, not the page asked for)`);
    }
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
          i, path: mt.path(el), avg: m.avgCharsPerLine, min: m.minCharsPerLine, max: m.maxCharsPerLine, lines: m.fullLines, leading: m.leading, chrome: mt.chrome(el),
          size: parseFloat(cs.fontSize), align: cs.textAlign, hyphens: cs.hyphens, family: cs.fontFamily, cjk: mt.cjk(el),
          lang: (el.closest('[lang]')?.getAttribute('lang') || '').trim(),
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
          if (n.parentElement.closest('rt, rp')) continue; // ruby annotations sit above the line, not on one
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
        const family = getComputedStyle(el).fontFamily;
        const firstName = family.split(',')[0].trim().replace(/^["']|["']$/g, '');
        // A web font may load under a name its file does not carry; document.fonts knows it loaded.
        const loaded = [...document.fonts].some((f) => f.family.replace(/^["']|["']$/g, '') === firstName && f.status === 'loaded');
        return { i, path: mt.path(el), family, loaded, latin: mt.latin(el) };
      });
      return { reading, colors, sizes, runts, fontTargets };
    });

    // Spec 0031 Y3: the body size is the size that sets the most measured lines; a lead paragraph
    // set 15% or more above it is display-like and sets tighter, so the leading floor skips it.
    const linesAtSize = new Map();
    for (const r of desk.reading) if (r.lines > 0) linesAtSize.set(r.size, (linesAtSize.get(r.size) || 0) + r.lines);
    const bodySize = [...linesAtSize].sort((a, b) => b[1] - a[1])[0]?.[0];
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
        // Spec 0031 Y3: leading under the house floor for the measured line length. CJK text is set
        // to other conventions; the source lint keeps its flat 1.3 floor, as it cannot see the length.
        const floor = leadingFloor(avg);
        const leading = rs[0].leading;
        const lead = bodySize && rs[0].size >= bodySize * 1.15 - 0.01;
        // Running text only: three or more full lines, outside navigation and banners.
        // Running text: a block of three lines or more, at least 30 characters wide (narrower is a card or a sidebar).
        const running = !rs[0].chrome && avg >= 30 && measured.some((r) => r.lines >= 2);
        if (!cjk && !lead && running && leading != null && leading < floor - 0.005) {
          const fix = Math.ceil((floor + 0.1) * 20 - 1e-9) / 20;
          add('MT-LH-TIGHT', 'MEDIUM', `${p} at 1280px`, `line-height ${leading} at ${avg.toFixed(1)} characters per line (house floor ${floor.toFixed(2)} for this length)`, `line-height: ${fix} (unitless), or a shorter measure`);
        }
      }
      const r0 = rs[0];
      if (r0.size < 16 - 0.01) add('MT-SIZE-FLOOR', 'MEDIUM', `${p}`, `${r0.size}px reading text`, `font-size: 1rem or more`);
      // CJK is set solid to the full measure and needs no hyphens. hyphens: auto without a lang has no
      // dictionary, so the browser hyphenates nothing.
      if (r0.align === 'justify' && !r0.cjk && r0.hyphens !== 'auto') add('MT-JUSTIFY', 'MEDIUM', `${p}`, 'justified, hyphens: ' + r0.hyphens, 'text-align: start, or hyphens: auto with limits');
      else if (r0.align === 'justify' && !r0.cjk && !r0.lang) add('MT-JUSTIFY', 'MEDIUM', `${p}`, 'justified, hyphens: auto with no lang (no dictionary, so nothing is hyphenated)', 'lang on the html element or the block, or text-align: start');
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
    // Spec 0029 U4: print the colour the reader sees (transparency and opacity applied), so the pair gives
    // the ratio; name the colour as written when it differs.
    const contrastMeasured = ({ c, ratio, need, text }) => {
      const seen = `rgb(${text.join(', ')})`;
      const written = c.faded ? `; written ${c.rawColor}, faded by opacity ${c.faded}` : c.rawColor.replace(/\s+/g, '') !== seen.replace(/\s+/g, '') ? `; written ${c.rawColor}` : '';
      return `${ratio.toFixed(2)}:1 (${seen} on ${c.bg}, needs ${need}:1${written})`;
    };
    const lightFails = contrastFailures(desk.colors);
    for (const f of lightFails.values()) {
      const { c, ratio, need } = f;
      add('MT-CONTRAST', 'HIGH', `${c.path}`, contrastMeasured(f), contrastFix(f));
    }
    // The same page with prefers-color-scheme: dark; report only what fails there and not here.
    const darkPage = await open(1280, null, { colorScheme: 'dark' });
    const darkFails = contrastFailures(await darkPage.evaluate(() => window.__mt.colorSamples()));
    await darkPage.close();
    const lightPaths = new Set([...lightFails.values()].map(({ c }) => c.path));
    for (const f of darkFails.values()) {
      const { c, ratio, need } = f;
      if (lightPaths.has(c.path)) continue;
      add('MT-CONTRAST', 'HIGH', `${c.path} (dark scheme)`, contrastMeasured(f), contrastFix(f));
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
      const named = (name) => fonts.some((f) => norm(f.familyName).startsWith(norm(name)) || norm(f.postScriptName || '').startsWith(norm(name)));
      const stack = t.family.split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter((x) => !GENERIC.test(x));
      // Text in another script drawn by a later family of the same stack is the stack working as meant.
      const inStack = !t.latin && fonts.every((f) => stack.some((x) => norm(f.familyName).startsWith(norm(x)) || norm(f.postScriptName || '').startsWith(norm(x))));
      const ok = named(first) || (t.loaded && fonts.some((f) => f.isCustomFont)) || inStack;
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
    for (const l of book.links) add('MT-LINK-COLOUR', 'HIGH', l.path, `link ${l.color} is ${l.ratio.toFixed(2)}:1 against the text ${l.text}, with no underline or other cue${l.count > 1 ? ` (${l.count} links styled alike)` : ''}`, 'text-decoration: underline (with text-underline-offset), or a colour 3:1 from the text plus an underline on hover and focus (WCAG 1.4.1, G183)');
    if (book.colourLinks) notVerified.add(`hover and focus cue for ${book.colourLinks} link(s) told apart by colour alone (WCAG G183 asks for one; the audit does not hover)`);
    for (const x of book.xfloor) add('MT-SIZE-FLOOR', 'MEDIUM', x.path, `${x.size}px reading text, x-height ${x.xh.toFixed(1)}px (ratio ${x.ratio.toFixed(2)}; house floor 7px)`, `font-size: ${+(8 / x.ratio / 16).toFixed(3)}rem (an 8px x-height), or font-size-adjust: ex-height 0.5`);
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
    for (const c of product.capsText) add('MT-CAPS-TEXT', 'MEDIUM', c.path, `${c.letters} letters of running text in capitals`, 'lower case: capitals are for labels of a few words, not sentences');
    for (const s of product.small) add('MT-UI-SIZE', 'LOW', s.path, `${s.size}px interface text (house floor 12px)`, 'font-size: 0.75rem or more');
    await language(page, add, notVerified);
    // Spec 0030 X9: text in shadow roots and frames is outside every check; say so rather than pass it.
    const unseen = await page.evaluate(() => ({
      shadows: [...document.querySelectorAll('*')].filter((el) => el.shadowRoot && el.shadowRoot.textContent.trim()).length,
      frames: document.querySelectorAll('iframe, frame').length,
    }));
    if (unseen.shadows) notVerified.add(`text in ${unseen.shadows} shadow root${unseen.shadows === 1 ? '' : 's'} (open shadow DOM is not audited)`);
    if (unseen.frames) notVerified.add(`text in ${unseen.frames} iframe${unseen.frames === 1 ? '' : 's'} (audit the framed page on its own)`);
    const breaks = new Map();
    const noteBreaks = (width, list) => {
      for (const b of list) {
        const key = `${b.path}|${b.token}`;
        if (!breaks.has(key)) breaks.set(key, { ...b, widths: [] });
        breaks.get(key).widths.push(width);
      }
    };
    noteBreaks(1280, await page.evaluate(numberBreaks));
    await synthesized(page, add);
    for (const o of await page.evaluate(opticalSizing)) {
      add('MT-OPSZ-OFF', 'LOW', o.path, `font-optical-sizing: none on ${o.family} at ${o.size}px, a face with an opsz axis: every size gets one optical size`, 'font-optical-sizing: auto (the initial value), so the opsz axis follows the size');
    }
    const rules = await page.evaluate(fontFaceRules);
    for (const f of rules.faces) {
      if (!f.display) add('MT-FONT-DISPLAY', 'LOW', `@font-face "${f.family}" (${f.where})`, '@font-face without font-display', 'font-display: swap (or optional)');
      else if (/^(block|auto)$/.test(f.display)) add('MT-FONT-DISPLAY', 'LOW', `@font-face "${f.family}" (${f.where})`, `font-display: ${f.display} hides the text for up to 3 seconds while the font loads`, 'font-display: swap (or optional)');
    }
    if (rules.unread.length) notVerified.add(`font-display in stylesheets the page cannot read (cross-origin): ${rules.unread.join(', ')}`);
    const loadedBoxes = { 1280: await page.evaluate(blockBoxes) };
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

    // ---- strict baseline grid (spec 0020), only when asked
    if (opts.baseline) {
      const tolerance = opts.baselineTolerance ? parseFloat(opts.baselineTolerance) : 1;
      const off = new Map();
      for (const width of [1280, 768, 375]) {
        const p = await open(width);
        const grid = await p.evaluate(baselines, { unit: opts.baseline, scope: opts.baselineScope });
        await p.close();
        if (grid.error) throw new Error(grid.error);
        if (grid.why) { notVerified.add(`baseline grid at ${width}px: ${grid.why}`); continue; }
        for (const b of gridDrift(grid, tolerance)) {
          if (!off.has(b.path)) off.set(b.path, []);
          off.get(b.path).push({ ...b, width, px: grid.px });
        }
      }
      for (const [p, bs] of off) {
        const widths = [...new Set(bs.map((b) => b.width))];
        const units = [...new Set(bs.map((b) => `${+b.px.toFixed(2)}px`))];
        const where = `at ${widths.map((w) => `${w}px`).join(', ')}`;
        const worst = Math.max(...bs.map((b) => Math.max(b.firstOff, b.multiLine ? b.lastOff : 0)));
        const count = new Set(bs.map((b) => b.first)).size > 1 ? ` (${bs.length} block measurements)` : '';
        const broken = bs.find((b) => {
          const lh = parseFloat(b.lineHeight);
          return !(Number.isFinite(lh) && Math.abs(lh / b.px - Math.round(lh / b.px)) < 0.05);
        });
        if (broken) {
          add('MT-BASELINE-DRIFT', 'MEDIUM', p, `baselines up to ${worst.toFixed(1)}px off the ${units.join(' or ')} grid ${where}: line-height ${broken.lineHeight} is not a whole number of grid units${count}`, `line-height: calc(N * ${opts.baseline.startsWith('--') ? `var(${opts.baseline})` : opts.baseline}) on this element, with the cap shift (references/rules.md 2.2.2, strict baseline grid)`);
        } else {
          add('MT-BASELINE-DRIFT', 'MEDIUM', p, `baselines up to ${worst.toFixed(1)}px off the ${units.join(' or ')} grid ${where}${count}`, 'padding-block-start: calc((line-height - 1cap) / 2) and a bottom margin that completes the grid unit, or fix the block above that pushes it off (references/rules.md 2.2.2, strict baseline grid)');
        }
      }
      notVerified.add('baseline grid past images or embeds of unknown height');
    }

    // ---- text spacing override (WCAG 1.4.12)
    const spacing = await open(1280);
    // The override goes on every element inline with !important, which beats an author !important rule,
    // as a reader's own stylesheet or bookmarklet would. A box that already clipped without the override
    // counts only if it clips more after it and is not a 1px or collapsed box (screen-reader text, a closed
    // panel, a spam trap), which hide their text by design.
    const spaced = await spacing.evaluate(() => {
      const mt = window.__mt;
      const boxes = [...document.body.querySelectorAll('*')].filter((el) => el.textContent.trim());
      // Spec 0025 R8: per axis, because an axis that scrolls (auto, scroll) loses nothing: a pane with
      // overflow-y: auto and overflow-x: hidden clips only what runs past its inline edge.
      const clip = (el) => {
        const cs = getComputedStyle(el);
        const x = /hidden|clip/.test(cs.overflowX) ? el.scrollWidth - el.clientWidth : 0;
        const y = /hidden|clip/.test(cs.overflowY) ? el.scrollHeight - el.clientHeight : 0;
        return Math.max(x, y);
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
        // Visually hidden text (spec 0024 V1) is clipped on purpose, override or not.
        if (r.width <= 1 || r.height <= 1 || el.closest('[aria-hidden="true"]') || !mt.visible(el)) continue;
        const was = before.get(el);
        const c = clip(el);
        // Text cut on purpose by an ellipsis or a line clamp is MT-TRUNCATE's finding, not this one's.
        const ecs = getComputedStyle(el);
        const truncated = was.clip > 1 && (ecs.textOverflow === 'ellipsis' || (ecs.webkitLineClamp && ecs.webkitLineClamp !== 'none'));
        if (c > 1 && c > was.clip + 1 && !truncated) out.push({ path: mt.path(el), over: c, kind: 'clip' });
        const sp = spill(el);
        const next = el.nextElementSibling;
        if (sp > 1 && sp > was.spill + 1 && next && mt.visible(next)) {
          // Spec 0029 U3: only text that runs past the box's bottom edge and meets the next block's text
          // overlaps it; a neighbour standing beside the box is not under it.
          const rects = (node) => {
            const out2 = [];
            const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let t = walk.nextNode(); t; t = walk.nextNode()) {
              if (!t.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(t);
              for (const x of range.getClientRects()) if (x.width > 0 && x.height > 0) out2.push(x);
            }
            return out2;
          };
          const spilled = rects(el).filter((t) => t.bottom > r.bottom + 1);
          const theirs = spilled.length ? rects(next) : [];
          const met = spilled.filter((t) => theirs.some((x) => x.left < t.right - 1 && x.right > t.left + 1 && x.top < t.bottom - 1 && x.bottom > t.top + 1));
          if (met.length) out.push({ path: mt.path(el), over: Math.round(Math.max(...met.map((t) => t.bottom)) - r.bottom), kind: 'overlap' });
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
          const placed = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) if (/absolute|fixed/.test(getComputedStyle(a).position)) return true; return false; };
          // Spec 0024 V2: only text past the inline-end edge (the right in ltr, the left in rtl) is cut off.
          // Text wholly beyond the start edge, or placed wholly off-screen with absolute or fixed
          // positioning (a skip link that waits there until it takes focus), is hidden on purpose.
          const cut = [];
          for (const el of window.__mt.textElements()) {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width <= 1 || cs.textOverflow === 'ellipsis' || el.closest('[aria-hidden="true"], [inert]')) continue;
            const pastEnd = cs.direction === 'rtl' ? -rect.left : rect.right - vw;
            if (pastEnd <= 1) continue;
            if ((rect.right <= 0 || rect.left >= vw) && placed(el)) continue;
            if (!scrolls(el)) cut.push({ el, pastEnd });
          }
          if (!cut.length) return null;
          const past = Math.round(Math.max(...cut.map((c) => c.pastEnd)));
          return { hidden: true, vw, past, culprits: cut.slice(0, 3).map((c) => window.__mt.path(c.el)) };
        }
        const wide = [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > vw + 1 && !(el.parentElement && el.parentElement !== document.body && el.parentElement.getBoundingClientRect().right > vw + 1));
        return { sw, vw, culprits: wide.slice(0, 3).map((el) => window.__mt.path(el)) };
      });
      noteBreaks(width, await p.evaluate(numberBreaks));
      if (width === 375) loadedBoxes[375] = await p.evaluate(blockBoxes);
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
    noteBreaks(768, await tablet.evaluate(numberBreaks));
    await tablet.close();
    for (const b of breaks.values()) {
      const widths = [...new Set(b.widths)].sort((x, y) => y - x);
      add('MT-NUM-BREAK', 'MEDIUM', b.path, `"${b.token}" breaks across lines at ${widths.map((w) => `${w}px`).join(', ')}`, 'a no-break space between the number and its unit or currency: U+00A0 (&nbsp;), or U+202F (narrow) before a unit; or white-space: nowrap on the token');
    }
    await fontSwap(open, loadedBoxes, add);

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
      // Spec 0029 U1: text that reaches 2x at any zoom level checked meets WCAG 1.4.4.
      if (Math.max(g200, g500) < 1.99) {
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
  return { mode: 'rendered', target: url, files: [url], findings, verdict: verdictOf(findings), notVerified: [...notVerified] };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const usage = 'usage: page-audit.js <url|file.html> [--baseline 8px|0.5rem|--u] [--baseline-scope .prose] [--baseline-tolerance 0.5px] [--lite] [--json]';
  const valued = { '--baseline': 'baseline', '--baseline-scope': 'baselineScope', '--baseline-tolerance': 'baselineTolerance' };
  const opts = { lite: false };
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const [flag, inline] = args[i].split(/=(.*)/s);
    if (valued[flag]) opts[valued[flag]] = inline !== undefined ? inline : args[++i];
    else if (flag === '--lite') opts.lite = true;
    else if (flag !== '--json' && flag.startsWith('--')) {
      console.error(`unknown option ${flag}; ${usage}`);
      process.exit(2);
    } else rest.push(args[i]);
  }
  const json = args.includes('--json');
  const target = rest.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error(usage);
    process.exit(2);
  }
  const print = (report, stoodIn = false) => {
    let text;
    if (json) text = JSON.stringify(report, null, 2);
    else {
      text = report.mode === 'lite' ? 'Lite mode, no browser: source checks only. For the rendered checks: npm install && npx playwright install chromium\n\n' : '';
      text += report.findings.length ? toMarkdown(report) : `No typography findings on ${report.target}.\n\nVerdict: ${report.verdict}\nNot verified: ${report.notVerified.join('; ')}\n`;
    }
    const high = report.findings.some((f) => f.severity === 'HIGH');
    // Spec 0025 R5: a lite report that stood in for the rendered audit is not a verdict a gate may pass on.
    if (stoodIn && !high) console.error('exit 3: the rendered checks did not run, because Playwright or its browser is missing (npm install && npx playwright install chromium); the lite report above stood in. Ask for --lite to accept source checks only.');
    // Spec 0029 U2: exit only once the report has drained, or a piped report larger than the buffer is cut.
    process.stdout.write(`${text}\n`, () => process.exit(stoodIn && !high ? 3 : high ? 1 : 0));
  };
  const fail = (err) => {
    console.error(err.message);
    process.exit(2);
  };
  audit(target, opts).then((report) => print(report)).catch((err) => {
    if (!needsInstall(err)) return fail(err);
    try {
      print(liteAudit(target), true);
    } catch (liteErr) {
      fail(liteErr);
    }
  });
}

module.exports = { audit, gridDrift };
