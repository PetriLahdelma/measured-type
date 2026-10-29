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
 * justification without hyphenation, one-word heading lines, size count.
 *
 * Exit code 1 when a HIGH finding remains (verdict Block), 0 otherwise.
 * Requires Playwright: npm install && npx playwright install chromium.
 */

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { measureLines } = require('./measure-line.js');
const { toMarkdown } = require('./lint-css.js');

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
      return el.getClientRects().length > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    },
    directText(el) {
      return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    },
    reading() {
      return [...document.querySelectorAll('p, li, dd, figcaption, blockquote')]
        .filter((el) => !(el.tagName === 'BLOCKQUOTE' && el.querySelector('p')))
        .filter((el) => window.__mt.visible(el) && el.textContent.trim().length >= 100);
    },
    textElements() {
      return [...document.body.querySelectorAll('*')].filter((el) => window.__mt.directText(el) && window.__mt.visible(el) && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName));
    },
  };
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

async function audit(target, opts = {}) {
  const url = /^[a-z]+:\/\//i.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  const own = !opts.browser;
  const browser = opts.browser || (await require('playwright').chromium.launch());
  const findings = [];
  const notVerified = new Set(['Safari and Firefox rendering (Chromium only)']);
  const add = (rule, severity, location, measured, fix) => findings.push({ rule, severity, location, measured, fix });

  const open = async (width, extraCss) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
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
          size: parseFloat(cs.fontSize), align: cs.textAlign, hyphens: cs.hyphens, family: cs.fontFamily,
        };
      });
      const texts = mt.textElements();
      const colors = texts.map((el) => {
        const cs = getComputedStyle(el);
        let bg = null;
        let image = false;
        for (let p = el; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (s.backgroundImage !== 'none') { image = true; break; }
          if (!/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)|transparent/.test(s.backgroundColor)) { bg = s.backgroundColor; break; }
        }
        return { path: mt.path(el), color: cs.color, bg: bg || 'rgb(255, 255, 255)', image, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) };
      });
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
        if (avg > 75) add('MT-MEASURE-LONG', 'MEDIUM', `${p} at 1280px`, `${avg.toFixed(1)} characters per line (range ${lo}-${hi})`, 'max-inline-size in em, counted to about 66 with measure-line.js');
      }
      const r0 = rs[0];
      if (r0.size < 16) add('MT-SIZE-FLOOR', 'MEDIUM', `${p}`, `${r0.size}px reading text`, `font-size: 1rem or more`);
      if (r0.align === 'justify' && r0.hyphens !== 'auto') add('MT-JUSTIFY', 'MEDIUM', `${p}`, 'justified, hyphens: ' + r0.hyphens, 'text-align: start, or hyphens: auto with limits');
    }

    const pairs = new Map();
    for (const c of desk.colors) {
      if (c.image) { notVerified.add('contrast over background images'); continue; }
      const fg = parseColor(c.color);
      const bg = parseColor(c.bg);
      if (!fg || !bg) continue;
      const ratio = contrast(over(fg, bg), bg);
      const large = c.size >= 24 || (c.size >= 18.66 && c.weight >= 700);
      const need = large ? 3 : 4.5;
      if (ratio < need) {
        const key = `${c.path}|${c.color}|${c.bg}`;
        if (!pairs.has(key)) pairs.set(key, { c, ratio, need });
      }
    }
    for (const { c, ratio, need } of pairs.values()) {
      add('MT-CONTRAST', 'HIGH', `${c.path}`, `${ratio.toFixed(2)}:1 (${c.color} on ${c.bg}, needs ${need}:1)`, 'darken the text or lighten the ground to reach the ratio');
    }
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
    await page.close();

    // ---- text spacing override (WCAG 1.4.12)
    const spacing = await open(1280, '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }');
    const clipped = await spacing.evaluate(() => [...document.body.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      const hides = /hidden|clip/.test(cs.overflowX + cs.overflowY);
      return hides && el.textContent.trim() && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    }).map((el) => ({ path: window.__mt.path(el), over: Math.max(el.scrollHeight - el.clientHeight, el.scrollWidth - el.clientWidth) })));
    for (const c of clipped) add('MT-TEXT-SPACING', 'HIGH', `${c.path} under the 1.4.12 override`, `${c.over}px of text clipped`, 'remove the fixed height or overflow: hidden on text boxes');
    await spacing.close();

    // ---- reflow and narrow measure
    for (const [width, label] of [[320, '320 CSS px (400% zoom of 1280)'], [375, '375px']]) {
      const p = await open(width);
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        if (sw <= vw + 1) return null;
        const wide = [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > vw + 1 && !(el.parentElement && el.parentElement !== document.body && el.parentElement.getBoundingClientRect().right > vw + 1));
        return { sw, vw, culprits: wide.slice(0, 3).map((el) => window.__mt.path(el)) };
      });
      if (r) add('MT-REFLOW', 'HIGH', `${r.culprits.join(', ') || 'page'} at ${label}`, `page is ${r.sw}px wide in a ${r.vw}px viewport`, 'max-inline-size instead of fixed widths; let tables scroll inside a wrapper');
      await p.close();
    }
    const tablet = await open(768);
    const short = await tablet.evaluate(() => window.__mt.reading().map((el, i) => {
      el.setAttribute('data-mt-s', i);
      const m = measureLines(`[data-mt-s="${i}"]`);
      return { path: window.__mt.path(el), avg: m.avgCharsPerLine };
    }).filter((r) => r.avg && r.avg < 40));
    for (const s of short) add('MT-MEASURE-SHORT', 'LOW', `${s.path} at 768px`, `${s.avg} characters per line`, 'widen the column or reduce the size');
    await tablet.close();

    // ---- zoom growth of headings: size in device px at zoom z is z * size at width 1280 / z
    const headingSizes = async (width) => {
      const p = await open(width);
      const s = await p.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => ({ path: window.__mt.path(h), size: parseFloat(getComputedStyle(h).fontSize) })));
      await p.close();
      return s;
    };
    const [z1, z2, z5] = [await headingSizes(1280), await headingSizes(640), await headingSizes(256)];
    z1.forEach((h, i) => {
      const g200 = (2 * z2[i].size) / h.size;
      const g500 = (5 * z5[i].size) / h.size;
      if (g500 < 1.99) add('MT-ZOOM-VW', 'HIGH', h.path, `${h.size}px grows ${g200.toFixed(2)}× at 200% and ${g500.toFixed(2)}× at 500% zoom`, 'clamp(min-rem, rem + vi, max-rem) with a range near 1.4×');
      else if (g200 < 1.6) add('MT-ZOOM-GROWTH', 'LOW', h.path, `${g200.toFixed(2)}× at 200% zoom on a 1280px window (house bar 1.6×)`, 'narrow the fluid range');
    });
  } finally {
    if (own) await browser.close();
  }

  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.rule.localeCompare(b.rule));
  const high = findings.filter((f) => f.severity === 'HIGH').length;
  return { target: url, files: [url], findings, verdict: high ? `Block (${high} HIGH)` : 'Approve', notVerified: [...notVerified] };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('usage: page-audit.js <url|file.html> [--json]');
    process.exit(2);
  }
  audit(target).then((report) => {
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(report.findings.length ? toMarkdown(report) : `No typography findings on ${report.target}.\n\nVerdict: ${report.verdict}\nNot verified: ${report.notVerified.join('; ')}\n`);
    process.exit(report.findings.some((f) => f.severity === 'HIGH') ? 1 : 0);
  }).catch((err) => {
    console.error(err.message);
    process.exit(2);
  });
}

module.exports = { audit };
