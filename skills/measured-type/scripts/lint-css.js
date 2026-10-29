#!/usr/bin/env node
/**
 * Static typography lint for CSS and HTML, with the rule IDs and severities of
 * references/audit.md. No dependencies, no browser.
 *
 *   node scripts/lint-css.js styles/ page.html
 *   node scripts/lint-css.js src --diff origin/main     only lines changed since that ref
 *   node scripts/lint-css.js site.css --rtl             physical sides become HIGH
 *   node scripts/lint-css.js site.css --json
 *
 * Directories are searched for .css, .scss, .less, .html, .vue, .svelte,
 * .astro, .jsx and .tsx files (node_modules, dist, build, coverage, vendor and
 * dot folders skipped). Sass and Less `//` comments are blanked; components
 * contribute their <style> blocks; Tailwind classes in class and className
 * attributes are checked for justify, vw sizes, physical sides, untracked
 * capitals, px tracking, ch measures and thin or tight reading text. Template
 * text in components and JSX is code and is not checked for quotes or dashes.
 * Fluid sizes are evaluated, not pattern-matched: each
 * font-size or size token that uses vw/vi is computed at 200% and 500% zoom on
 * windows from 320 to 2560px.
 *
 * Exit code 1 when a HIGH finding remains (verdict Block), 0 otherwise, 2 on a
 * usage error. Rendered checks need scripts/page-audit.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { estimate, describe } = require('./estimate-measure.js');

const ROOT_PX = 16;
const VIEW_ASPECT = 900 / 1280; // vh and vb are read against a 1280x900 window
const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// ---------- CSS ----------

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Blocks in source order: { prelude, line, decls: [{ prop, value, line }] }
function parseCss(source, lineOffset = 0) {
  const text = stripComments(source);
  const blocks = [];
  const stack = [];
  let buf = '';
  let bufLine = null;
  let line = 1 + lineOffset;
  let quote = null;
  const reset = () => { buf = ''; bufLine = null; };
  const flush = () => {
    const raw = buf.trim();
    const i = raw.indexOf(':');
    if (stack.length && i > 0) {
      const prop = raw.slice(0, i).trim().toLowerCase();
      if (/^(--[\w-]+|[-a-z]+)$/.test(prop)) {
        const value = raw.slice(i + 1).trim().replace(/\s*!important$/i, '');
        stack[stack.length - 1].decls.push({ prop, value, line: bufLine, endLine: line });
      }
    }
    reset();
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\n') line++;
      buf += c;
      if (c === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '{') {
      const block = { prelude: buf.trim(), line: bufLine ?? line, decls: [] };
      stack.push(block);
      blocks.push(block);
      reset();
    } else if (c === '}') {
      flush();
      stack.pop();
    } else if (c === ';') {
      if (stack.length) flush();
      else reset(); // @import, @charset
    } else {
      if (bufLine === null && !/\s/.test(c)) bufLine = line;
      buf += c;
    }
    if (c === '\n') line++;
  }
  return blocks;
}

// ---------- length expressions: value -> f(W) in CSS px ----------

function evaluator(value) {
  const src = value.toLowerCase();
  let pos = 0;
  const ws = () => { while (/\s/.test(src[pos] || '')) pos++; };
  const fail = () => { throw new Error(`cannot evaluate ${value}`); };
  function factor() {
    ws();
    if (src[pos] === '(') { pos++; const e = expr(); ws(); if (src[pos++] !== ')') fail(); return e; }
    const fn = /^(clamp|min|max|calc)\(/.exec(src.slice(pos));
    if (fn) {
      pos += fn[0].length;
      const args = [];
      for (;;) {
        args.push(expr());
        ws();
        if (src[pos] === ',') { pos++; continue; }
        if (src[pos] === ')') { pos++; break; }
        fail();
      }
      if (fn[1] === 'calc') return args[0];
      if (fn[1] === 'clamp') return (W) => Math.max(args[0](W), Math.min(args[1](W), args[2](W)));
      if (fn[1] === 'min') return (W) => Math.min(...args.map((a) => a(W)));
      return (W) => Math.max(...args.map((a) => a(W)));
    }
    const num = /^([+-]?(?:\d+\.?\d*|\.\d+))(rem|em|px|[dsl]?v[wihb]|vmin|vmax|%)?/.exec(src.slice(pos));
    if (!num) fail();
    pos += num[0].length;
    const n = parseFloat(num[1]);
    if (num[2] === 'rem' || num[2] === 'em') return () => n * ROOT_PX;
    if (num[2] === 'px') return () => n;
    if (num[2] === '%') return () => (n / 100) * ROOT_PX;
    if (num[2] && /v[hb]$/.test(num[2])) return (W) => (n * W * VIEW_ASPECT) / 100;
    if (num[2]) return (W) => (n * W) / 100;
    return () => n;
  }
  function binary(next, ops) {
    return () => {
      let left = next();
      for (;;) {
        ws();
        const op = src[pos];
        if (!ops.includes(op)) return left;
        pos++;
        const right = next();
        const l = left;
        left = op === '+' ? (W) => l(W) + right(W)
          : op === '-' ? (W) => l(W) - right(W)
          : op === '*' ? (W) => l(W) * right(W)
          : (W) => l(W) / right(W);
      }
    };
  }
  const term = binary(factor, '*/');
  const expr = binary(term, '+-');
  const f = expr();
  ws();
  if (pos !== src.length) fail();
  return f;
}

// Zoom z on a window w: the CSS viewport is w / z and 1rem stays 16 CSS px,
// so the size in device px is z * f(w / z).
function zoomProfile(f) {
  let min = Infinity;
  let max = -Infinity;
  let worst500 = Infinity;
  for (let w = 320; w <= 2560; w += 10) {
    const base = f(w);
    min = Math.min(min, base);
    max = Math.max(max, base);
    worst500 = Math.min(worst500, (5 * f(w / 5)) / base);
  }
  return { range: max / min, worst500, at1280: (2 * f(640)) / f(1280) };
}

// ---------- rules ----------

const HEADING = /(^|[\s,>+~(.#])h[1-6]\b|heading|title|display|hero|headline/i;
const READING = /(^|[\s,>+~(])(body|p|li|dd|blockquote|article|main)\b|prose|content|post|entry|doc|copy|reading/i;
const CONTAINER = /prose|article|main|content|container|wrap|page|body|doc|post|entry|column|(^|[\s,>+~(])p\b/i;
const SIZE_TOKEN = /size|font|text|fs\b|step|scale|display|hero|h[1-6]|heading|title|type/i;
const PHYSICAL = /^(margin|padding|border)-(left|right)(-|$)|^(left|right)$|^border-(top|bottom)-(left|right)-radius$/;

// A font size that uses vw/vi, evaluated at zoom: [rule, severity, measured, fix] or null.
function fluid(v, label) {
  if (!/\d([dsl]?v[wihb]|vmin|vmax)\b/.test(v) || /var\(/.test(v)) return null;
  let f = null;
  try { f = evaluator(v); } catch { return null; }
  const z = zoomProfile(f);
  if (z.worst500 < 2) {
    return ['MT-ZOOM-VW', 'HIGH', `${label} never reaches 2× zoom, even at 500% (${z.worst500.toFixed(2)}×)`, 'clamp(min-rem, rem + vi, max-rem) with a range near 1.4×'];
  }
  if (z.range > 1.4) {
    return ['MT-ZOOM-RANGE', z.range > 2.5 ? 'MEDIUM' : 'LOW', `${label}: range ${z.range.toFixed(2)}×, ${z.at1280.toFixed(2)}× at 200% zoom on 1280px`, 'narrow the range to about 1.4×'];
  }
  return null;
}

function lintCss(blocks, file, opts, out) {
  const decls = blocks.flatMap((b) => b.decls);
  const smallCapsSynthOff = decls.some((d) =>
    (d.prop === 'font-synthesis' && !/small-caps/.test(d.value)) ||
    (d.prop === 'font-synthesis-small-caps' && /none/.test(d.value)));
  // Selectors that get letter-spacing in any rule of this file, so tracking split across rules counts.
  const tracked = new Set(blocks.filter((b) => b.decls.some((x) => x.prop === 'letter-spacing')).map((b) => b.prelude.trim()));
  const add = (rule, severity, d, measured, fix) =>
    out.push({ rule, severity, file, line: d.line, endLine: d.endLine, measured, fix });

  for (const b of blocks) {
    const sel = b.prelude;
    if (/^@font-face/i.test(sel) && !b.decls.some((d) => d.prop === 'font-display')) {
      add('MT-FONT-DISPLAY', 'LOW', b, '@font-face without font-display', 'font-display: swap (or optional)');
    }
    const isRoot = /^(html|:root)$/i.test(sel);
    const hyphenated = b.decls.some((d) => /^(-webkit-)?hyphens$/.test(d.prop) && /auto/.test(d.value));
    // The same value on both physical sides reads the same in either direction.
    const symmetric = new Set();
    for (const d of b.decls) {
      const m = /^(.*?)(left|right)(.*)$/.exec(d.prop);
      if (!m || !PHYSICAL.test(d.prop)) continue;
      const twin = b.decls.find((t) => t.prop === `${m[1]}${m[2] === 'left' ? 'right' : 'left'}${m[3]}`);
      if (twin && twin.value.trim().toLowerCase() === d.value.trim().toLowerCase()) symmetric.add(d);
    }
    for (const d of b.decls) {
      const v = d.value.toLowerCase();
      const rule = `${sel} { ${d.prop}: ${d.value} }`;

      const sizeish = d.prop === 'font-size' || (d.prop.startsWith('--') && SIZE_TOKEN.test(d.prop));
      const fluidHit = sizeish && fluid(v, rule);
      if (sizeish && /\d(cq[wihb]|cqmin|cqmax)\b/.test(v)) opts.skipped?.push(`container units in ${path.basename(file)}:${d.line} (${d.prop}: ${d.value}) need the container's size; measure with page-audit.js`);
      if (fluidHit) add(fluidHit[0], fluidHit[1], d, fluidHit[2], fluidHit[3]);
      if (d.prop === 'font-size' && isRoot) {
        if (/^[\d.]+px$/.test(v)) add('MT-ROOT-PX', 'MEDIUM', d, `${rule} overrides the reader's default size`, 'font-size: 100% (or leave it unset)');
        else if (/^[\d.]+%$/.test(v) && parseFloat(v) < 100) add('MT-ROOT-PX', 'LOW', d, `${rule} makes 1rem ${(parseFloat(v) * 0.16).toFixed(1)}px`, 'font-size: 100% with rem tokens');
      }
      if (d.prop === 'font-size' && !isRoot && /^[\d.]+px$/.test(v) && READING.test(sel) && !HEADING.test(sel)) {
        add('MT-FONT-PX', 'MEDIUM', d, rule, `font-size: ${+(parseFloat(v) / 16).toFixed(4)}rem`);
      }
      if (d.prop === 'line-height' && !HEADING.test(sel) && !/var\(/.test(v)) {
        if (/\d(px|em|rem|%)$/.test(v)) {
          add('MT-LH-LENGTH', 'MEDIUM', d, `${rule} is inherited as a fixed length`, 'a unitless value, for example 1.5');
        } else if (/^[\d.]+$/.test(v) && parseFloat(v) < 1.3 && (READING.test(sel) || isRoot)) {
          add('MT-LH-TIGHT', 'MEDIUM', d, `${rule} on reading text`, 'about 1.4 to 1.6 for body text');
        }
      }
      if (d.prop === 'text-align' && v === 'justify' && !hyphenated) {
        add('MT-JUSTIFY', 'MEDIUM', d, `${rule} without hyphens: auto`, 'text-align: start, or hyphens: auto with limits on a wide measure');
      }
      if (d.prop === 'width' && /^\d+px$/.test(v) && parseInt(v, 10) >= 480 && CONTAINER.test(sel)) {
        add('MT-WIDTH-PX', 'MEDIUM', d, `${rule} cannot shrink at 320 CSS px`, 'max-inline-size in em, counted with measure-line.js');
      }
      if (/^(max-)?(width|inline-size)$/.test(d.prop) && /^[\d.]+ch$/.test(v) && parseFloat(v) >= 30) {
        const family = b.decls.find((x) => x.prop === 'font-family');
        const est = family && estimate({ family: family.value, width: v });
        const guess = est && est.known ? `; ${describe(est)} (estimate)` : '';
        add('MT-MEASURE-CH', 'LOW', d, `${rule}: 1ch is the width of the zero, not the average letter${guess}`, 'count it: node scripts/measure-line.js page.html "selector"');
      }
      if (/^font-variant(-caps)?$/.test(d.prop) && /small-caps|petite-caps|unicase/.test(v) && !smallCapsSynthOff) {
        add('MT-SMALLCAPS-SYNTH', 'MEDIUM', d, `${rule} with small-caps synthesis allowed`, 'font-synthesis-small-caps: none, after checking smcp/c2sc with font-features.py');
      }
      if (d.prop === 'font-feature-settings' && /["'](tnum|onum|lnum|pnum|smcp|c2sc|zero|frac|sups|subs|ordn)["']/.test(v)) {
        add('MT-FFS', 'LOW', d, rule, 'font-variant-numeric or font-variant-caps, which combine instead of replacing each other');
      }
      if ((d.prop === 'font-kerning' && v === 'none') || (d.prop === 'font-feature-settings' && /["']kern["']\s+(0|off)\b/.test(v))) {
        add('MT-KERN-OFF', 'LOW', d, `${rule} switches the font's kerning off`, 'font-kerning: normal (auto already kerns at every size in Chromium and WebKit)');
      }
      if (d.prop === 'text-transform' && v === 'uppercase' && !b.decls.some((x) => x.prop === 'letter-spacing') && !tracked.has(sel.trim())) {
        add('MT-CAPS-TRACKING', 'LOW', d, `${rule} without letter-spacing`, 'letter-spacing: 0.06em (5 to 10% of the size, Bringhurst §2.1.6)');
      }
      if (d.prop === 'letter-spacing' && /^-?[\d.]+px$/.test(v) && parseFloat(v) !== 0) {
        add('MT-LS-PX', 'LOW', d, rule, 'the same value in em');
      }
      // left/right: 50% pulled back by translate(-50%) centres the box, which
      // reads the same in either direction.
      const centred = /^(left|right)$/.test(d.prop) && v === '50%' && b.decls.some((t) =>
        (t.prop === 'transform' && /translate(x)?\(\s*-50%/i.test(t.value)) || (t.prop === 'translate' && /^-50%/.test(t.value)));
      if (!centred && !symmetric.has(d) && (PHYSICAL.test(d.prop) || (/^(text-align|float)$/.test(d.prop) && /^(left|right)$/.test(v)))) {
        add('MT-PHYSICAL', opts.rtl ? 'HIGH' : 'LOW', d, rule, 'the logical property (margin-inline-start, text-align: start, float: inline-start...)');
      }
      if (/^(widows|orphans)$/.test(d.prop) && v === '1') {
        add('MT-WIDOWS', 'LOW', d, `${d.prop}: 1 leaves a single line stranded (2 is the initial value)`, `${d.prop}: 2 or more`);
      }
    }
  }
}

// ---------- HTML ----------

function lintHtml(source, file, opts, out) {
  const lineAt = (index) => source.slice(0, index).split('\n').length;
  for (const m of source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    lintCss(parseCss(m[1], lineAt(m.index + m[0].indexOf('>') + 1) - 1), file, opts, out);
  }
  const meta = /<meta[^>]+name=["']viewport["'][^>]*>/i.exec(source);
  if (meta) {
    const content = (/content=["']([^"']*)["']/i.exec(meta[0]) || [])[1] || '';
    const max = /maximum-scale\s*=\s*([\d.]+)/i.exec(content);
    if (/user-scalable\s*=\s*(no|0)/i.test(content) || (max && parseFloat(max[1]) < 2)) {
      out.push({ rule: 'MT-VIEWPORT-ZOOM', severity: 'HIGH', file, line: lineAt(meta.index), measured: `viewport ${content}`, fix: 'width=device-width, initial-scale=1' });
    }
  }
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const text = source
    .replace(/<(script|style|code|pre|kbd|samp|textarea)\b[\s\S]*?<\/\1>/gi, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<[^>]*>/g, blank);
  const checks = [
    ['MT-MINUS', /(^|[\s( ])-\d/g, 'hyphen-minus before a number', 'U+2212 minus (&minus;)'],
    ['MT-RANGE', /\b\d{1,4}-\d{1,4}\b(?!-)/g, 'hyphen in a number range', 'en dash, U+2013 (&ndash;)'],
    ['MT-QUOTES', /"[^"\n]{1,200}"|\b\w'\w/g, 'straight quotes', 'typographic quotes and apostrophes for the language'],
  ];
  for (const [rule, re, what, fix] of checks) {
    for (const m of text.matchAll(re)) {
      if (rule === 'MT-RANGE' && /\d{4}-\d{2}-\d{2}/.test(text.slice(Math.max(0, m.index - 5), m.index + 12))) continue;
      out.push({ rule, severity: 'LOW', file, line: lineAt(m.index), measured: `${what}: ${m[0].trim()}`, fix });
    }
  }
}

// ---------- Sass, Less and single-file components ----------

// Sass and Less `//` comments, blanked so line numbers stay; `url(http://...)` and strings are kept.
// Sass and Less comments, blanked so line numbers stay. One pass handles block comments (which may
// hold apostrophes or //), line comments, strings and unquoted url(...) together.
function stripLineComments(text) {
  let out = '';
  let quote = null;
  let inUrl = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      out += c;
      if (c === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (inUrl) {
      out += c;
      if (c === ')') inUrl = false;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop - 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') { out += ' '; i++; }
      if (i < text.length) out += '\n';
      continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    if (/^url\(\s*[^\s"')]/i.test(text.slice(i, i + 6))) {
      inUrl = true;
      out += text.slice(i, i + 4);
      i += 3;
      continue;
    }
    out += c;
  }
  return out;
}

// .vue, .svelte and .astro: style blocks and classes only; template text is code, not prose.
function lintComponent(source, file, opts, out) {
  const lineAt = (index) => source.slice(0, index).split('\n').length;
  for (const m of source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)) {
    if (/lang=["']?(sass|stylus|styl)\b/i.test(m[1])) {
      opts.skipped?.push(`${path.basename(file)}: <style${m[1]}> is indented syntax this linter does not read`);
      continue;
    }
    const css = /lang=["']?(scss|less)/i.test(m[1]) ? stripLineComments(m[2]) : m[2];
    lintCss(parseCss(css, lineAt(m.index + m[0].indexOf('>') + 1) - 1), file, opts, out);
  }
  lintTailwind(source, file, opts, out);
}

// ---------- Tailwind classes ----------

const READING_TAG = /^(p|li|dd|blockquote|figcaption)$/;
const CORNER = { tl: 'ss', tr: 'se', bl: 'es', br: 'ee' };

function logicalClass(base) {
  let m = /^(-?)(m|p|scroll-m|scroll-p)([lr])-(.+)$/.exec(base);
  if (m) return `${m[1]}${m[2]}${m[3] === 'l' ? 's' : 'e'}-${m[4]}`;
  if ((m = /^(-?)(left|right)-(.+)$/.exec(base))) return `${m[1]}${m[2] === 'left' ? 'start' : 'end'}-${m[3]}`;
  if ((m = /^(text|float|clear)-(left|right)$/.exec(base))) return `${m[1]}-${m[2] === 'left' ? 'start' : 'end'}`;
  if ((m = /^(border|rounded)-([lr])(-.+)?$/.exec(base))) return `${m[1]}-${m[2] === 'l' ? 's' : 'e'}${m[3] || ''}`;
  if ((m = /^rounded-(tl|tr|bl|br)(-.+)?$/.exec(base))) return `rounded-${CORNER[m[1]]}${m[2] || ''}`;
  return null;
}

function lintTailwind(source, file, opts, out) {
  const lineAt = (index) => source.slice(0, index).split('\n').length;
  if (/class(?:Name)?=\{\s*(?!["'`]|\s)|class(?:Name)?=\{\s*`[^`]*\$\{|\s:class=|\bclass:[\w-]+=|\b(?:cn|clsx|classnames|classNames|cva|twMerge|twJoin)\(/.test(source)) {
    opts.skipped?.push(`${path.basename(file)}: class lists built by expressions (cn(), clsx(), template literals, :class, class:) are not read`);
  }
  const ATTR = /<([a-zA-Z][\w.-]*)\b[^<]*?\bclass(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)\s*\})/g;
  for (const m of source.matchAll(ATTR)) {
    const tag = m[1].toLowerCase();
    const raw = (m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? '').split(/\s+/).filter(Boolean);
    const base = raw.map((c) => c.split(':').pop().replace(/^!/, ''));
    const has = (c) => base.includes(c);
    const line = lineAt(m.index + m[0].search(/\bclass(Name)?\s*=/));
    const add = (rule, severity, measured, fix) => out.push({ rule, severity, file, line, measured, fix });
    const reading = READING_TAG.test(tag);
    // Physical utilities on both sides with the same value, or left-1/2 pulled back by -translate-x-1/2, read the same in either direction.
    const twinOf = (b) => b.replace(/(^-?(?:m|p|scroll-m|scroll-p))([lr])(-)/, (x, a, side, dash) => `${a}${side === 'l' ? 'r' : 'l'}${dash}`)
      .replace(/^(-?)(left|right)-/, (x, neg, side) => `${neg}${side === 'left' ? 'right' : 'left'}-`)
      .replace(/^(border|rounded)-([lr])(-|$)/, (x, a, side, rest) => `${a}-${side === 'l' ? 'r' : 'l'}${rest}`);
    const neutral = (b) => (twinOf(b) !== b && base.includes(twinOf(b))) || (/^(left|right)-1\/2$/.test(b) && base.some((t) => /^-translate-x-1\/2$/.test(t)));

    if (has('text-justify') && !has('hyphens-auto')) add('MT-JUSTIFY', 'MEDIUM', `<${tag}> class text-justify without hyphens-auto`, 'text-start, or hyphens-auto on a wide measure');
    base.forEach((b, i) => {
      const size = /^text-\[(.+)\]$/.exec(b);
      const hit = size && fluid(size[1].replace(/_/g, ' '), `<${tag}> class ${raw[i]}`);
      if (hit) add(...hit);
      const logical = logicalClass(b);
      if (logical && !neutral(b)) add('MT-PHYSICAL', opts.rtl ? 'HIGH' : 'LOW', `<${tag}> class ${raw[i]}`, `${raw[i].replace(b, logical)} (the logical utility)`);
      const ls = /^tracking-\[(-?[\d.]+)px\]$/.exec(b);
      if (ls && parseFloat(ls[1]) !== 0) add('MT-LS-PX', 'LOW', `<${tag}> class ${raw[i]}`, `tracking-[${+(parseFloat(ls[1]) / 16).toFixed(3)}em]`);
      const ch = /^max-w-\[([\d.]+)ch\]$/.exec(b);
      if (b === 'max-w-prose' || (ch && parseFloat(ch[1]) >= 30)) {
        add('MT-MEASURE-CH', 'LOW', `<${tag}> class ${raw[i]}${b === 'max-w-prose' ? ' (65ch)' : ''}: 1ch is the width of the zero, not the average letter`, 'count it: node scripts/measure-line.js page.html "selector"');
      }
      if (reading && /^font-(thin|extralight|light)$/.test(b)) add('MT-WEIGHT-THIN', 'MEDIUM', `<${tag}> class ${raw[i]} on reading text`, 'font-normal or heavier for reading text');
      if (reading && /^leading-(none|tight)$/.test(b)) add('MT-LH-TIGHT', 'MEDIUM', `<${tag}> class ${raw[i]} on reading text`, 'leading-relaxed (1.625) or leading-normal (1.5) for body text');
    });
    if (has('uppercase') && !base.some((b) => /^tracking-(wider|widest|\[|\()/.test(b))) {
      add('MT-CAPS-TRACKING', 'LOW', `<${tag}> class uppercase without enough tracking (tracking-wide is 0.025em, under 5%)`, 'tracking-wider (0.05em) or tracking-[0.06em]');
    }
  }
}

// ---------- files, diff, report ----------

const SOURCES = /\.(css|scss|sass|less|html?|vue|svelte|astro|jsx|tsx)$/i;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'vendor']);

function collect(target, files) {
  if (fs.statSync(target).isDirectory()) {
    for (const e of fs.readdirSync(target)) {
      if (!SKIP_DIRS.has(e) && !e.startsWith('.')) collect(path.join(target, e), files);
    }
  } else if (SOURCES.test(target)) files.push(target);
}

function lintFile(file, src, opts, out) {
  if (/\.sass$/i.test(file)) opts.skipped?.push(`${path.basename(file)}: indented Sass syntax is not read`);
  else if (/\.html?$/i.test(file)) {
    lintHtml(src, file, opts, out);
    lintTailwind(src, file, opts, out);
  } else if (/\.(vue|svelte|astro)$/i.test(file)) lintComponent(src, file, opts, out);
  else if (/\.(jsx|tsx)$/i.test(file)) lintTailwind(src, file, opts, out);
  else if (/\.(scss|less)$/i.test(file)) lintCss(parseCss(stripLineComments(src)), file, opts, out);
  else lintCss(parseCss(src), file, opts, out);
}

// Lines changed since ref, or null when git does not track the file (then all of it is new).
function changedLines(file, ref) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', file], { stdio: 'ignore' });
  } catch {
    return null;
  }
  const diff = execFileSync('git', ['diff', '-U0', ref, '--', file], { encoding: 'utf8' });
  const lines = new Set();
  for (const m of diff.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) lines.add(Number(m[1]) + i);
  }
  return lines;
}

function lint(targets, options = {}) {
  const opts = { ...options, skipped: [] };
  const files = [];
  for (const t of targets) collect(t, files);
  let findings = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const out = [];
    lintFile(file, src, opts, out);
    if (opts.diff) {
      const changed = changedLines(file, opts.diff);
      const touched = (f) => {
        for (let l = f.line; l <= (f.endLine || f.line); l++) if (changed.has(l)) return true;
        return false;
      };
      findings.push(...(changed ? out.filter(touched) : out));
    } else findings.push(...out);
  }
  findings = findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.line - b.line);
  const high = findings.filter((f) => f.severity === 'HIGH').length;
  return {
    files,
    findings,
    verdict: high ? `Block (${high} HIGH)` : 'Approve',
    notVerified: ['rendered measure, contrast, reflow and text spacing (run scripts/page-audit.js)', ...opts.skipped],
  };
}

function toMarkdown(report) {
  const tail = `\nVerdict: ${report.verdict}\nNot verified: ${report.notVerified.join('; ')}\n`;
  if (!report.findings.length) return `No typography findings in ${report.files.length} file(s).\n${tail}`;
  const rows = new Map();
  for (const f of report.findings) {
    const key = `${f.severity}|${f.rule}|${f.measured}`;
    if (!rows.has(key)) rows.set(key, { ...f, locations: [] });
    rows.get(key).locations.push(f.location ? `\`${f.location}\`` : `\`${path.relative(process.cwd(), f.file)}:${f.line}\``);
  }
  const cell = (s) => String(s).replace(/\|/g, '\\|');
  let md = '| Severity | Rule | Location | Measured | Fix |\n|---|---|---|---|---|\n';
  for (const r of rows.values()) {
    const loc = r.locations.length > 5 ? `${r.locations.slice(0, 5).join(', ')} and ${r.locations.length - 5} more` : r.locations.join(', ');
    md += `| ${r.severity} | ${r.rule} | ${loc} | ${cell(r.measured)} | ${cell(r.fix)} |\n`;
  }
  return md + tail;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = { json: false, rtl: false, diff: null };
  const targets = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') opts.json = true;
    else if (args[i] === '--rtl') opts.rtl = true;
    else if (args[i] === '--diff') {
      opts.diff = args[++i];
      if (!opts.diff || opts.diff.startsWith('--')) {
        console.error('--diff needs a git ref, for example --diff origin/main');
        process.exit(2);
      }
    }
    else targets.push(args[i]);
  }
  if (!targets.length) {
    console.error('usage: lint-css.js <file|dir>... [--diff <git-ref>] [--rtl] [--json]');
    process.exit(2);
  }
  let report;
  try {
    report = lint(targets, opts);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  console.log(opts.json ? JSON.stringify(report, null, 2) : toMarkdown(report));
  process.exit(report.findings.some((f) => f.severity === 'HIGH') ? 1 : 0);
}

module.exports = { parseCss, evaluator, zoomProfile, lint, toMarkdown };
