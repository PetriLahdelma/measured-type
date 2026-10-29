#!/usr/bin/env node
/**
 * Count rendered characters per line, instead of trusting `ch` or `em`.
 *
 * `1ch` is the advance of "0", which in most text faces is wider than the
 * average letter, so `66ch` often renders 75+ characters. This script lays
 * the text out in a real browser and counts what the reader actually gets.
 *
 * Three ways to use it:
 *
 *   1. A page you already have (URL or HTML file):
 *        node scripts/measure-line.js https://example.com/post ".prose p"
 *        node scripts/measure-line.js page.html "article p" --width 1280
 *
 *   2. A stylesheet on its own, with built-in sample prose:
 *        node scripts/measure-line.js --css prose.css
 *        node scripts/measure-line.js --css prose.css --class prose --lang fi
 *      Measures `.prose > p` by default. The sample is <article class="prose" lang="en"> with h2, h3, p, ul
 *      and blockquote; --class and --lang change the wrapper.
 *
 *   3. In a browser console: paste the measureLines function below and call
 *        measureLines('.prose p')
 *
 * Options:
 *   --width N    viewport width in CSS px (default 1280)
 *   --zoom N     device scale to emulate browser zoom: 2 = 200% (default 1).
 *                At zoom 2 the CSS viewport is width / 2, as in a real browser.
 *   --json       machine-readable output
 *
 * What counts:
 *   - Characters are grapheme clusters (Intl.Segmenter), spaces included, so
 *     "é" counts once whether it is stored precomposed or as e + U+0301.
 *   - Lines are found in reading order: a character starts a new line when its
 *     box no longer overlaps the current line on the block axis. Superscripts,
 *     smaller inline code and baseline shifts stay on their line; multi-column
 *     text gives one line per column line.
 *   - Vertical writing modes are measured along their own inline axis.
 *   - Only full lines count. The last line of each block, and a line ended by
 *     <br>, are usually short and are left out.
 *
 * Not counted: generated content (::before, ::after, list markers) and the
 * hyphens that `hyphens: auto` inserts, because neither is in the DOM.
 *
 * Requires Playwright for modes 1 and 2: npm install (see package.json), then
 * npx playwright install chromium. `npm test` runs the regression fixtures.
 * Exit code 0, or 2 on a usage error, a missing page or a selector that
 * matches nothing (spec 0005 R4).
 */

// Runs inside the page. Keep it self-contained so it can be pasted into a console.
function measureLines(selector) {
  const els = [...document.querySelectorAll(selector)];
  if (!els.length) return { error: `no element matches ${selector}` };
  const first = els[0];
  const cs = getComputedStyle(first);
  const vertical = /^(vertical|sideways)/.test(cs.writingMode);
  const [blockStart, blockEnd, inlineStart, inlineEnd, inlineExtent] = vertical
    ? ['left', 'right', 'top', 'bottom', 'height']
    : ['top', 'bottom', 'left', 'right', 'width'];
  const lang = first.closest('[lang]')?.lang || undefined;
  const segmenter = new Intl.Segmenter(lang, { granularity: 'grapheme' });
  const isInline = (el) => /^(inline|ruby|contents)$|^ruby/.test(getComputedStyle(el).display);
  const blockOf = (node) => {
    let el = node.parentElement;
    while (el && isInline(el)) el = el.parentElement;
    return el;
  };

  const full = [];
  let charsInFull = 0;
  let inkInFull = 0;
  let paragraphs = 0;
  const range = document.createRange();
  for (const el of els) {
    const lines = []; // { chars, start, end, inkStart, inkEnd, ended } in reading order
    let line = null;
    let block = null;
    const endLine = () => {
      if (line) line.ended = true;
      line = null;
    };
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') endLine();
        continue;
      }
      const nodeBlock = blockOf(node);
      if (nodeBlock !== block) {
        endLine(); // the previous block's last line
        block = nodeBlock;
      }
      for (const { index, segment } of segmenter.segment(node.textContent)) {
        range.setStart(node, index);
        range.setEnd(node, index + segment.length);
        const rect = [...range.getClientRects()].find((r) => r[inlineExtent] > 0);
        if (!rect) continue; // collapsed whitespace
        const start = rect[blockStart];
        const end = rect[blockEnd];
        if (line) {
          const overlap = Math.min(end, line.end) - Math.max(start, line.start);
          if (overlap < (end - start) / 2) line = null;
        }
        if (!line) {
          line = { chars: 0, start, end, inkStart: rect[inlineStart], inkEnd: rect[inlineEnd], ended: false };
          lines.push(line);
        }
        line.chars++;
        line.start = Math.min(line.start, start);
        line.end = Math.max(line.end, end);
        line.inkStart = Math.min(line.inkStart, rect[inlineStart]);
        line.inkEnd = Math.max(line.inkEnd, rect[inlineEnd]);
      }
    }
    endLine();
    let counted = false;
    for (const l of lines) {
      if (l.ended) continue; // last line of its block, or stopped at <br>
      full.push(l.chars);
      charsInFull += l.chars;
      inkInFull += l.inkEnd - l.inkStart;
      counted = true;
    }
    if (counted) paragraphs++;
  }

  const px = (prop) => parseFloat(cs[prop]) || 0;
  const box = first.getBoundingClientRect();
  const contentInline = vertical
    ? box.height - px('paddingTop') - px('paddingBottom') - px('borderTopWidth') - px('borderBottomWidth')
    : box.width - px('paddingLeft') - px('paddingRight') - px('borderLeftWidth') - px('borderRightWidth');
  // `1ch` is the advance of "0" without letter-spacing, so the probe drops it.
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;letter-spacing:0;word-spacing:0';
  probe.textContent = '0'.repeat(100);
  first.appendChild(probe);
  const ch = probe.getBoundingClientRect()[inlineExtent] / 100;
  probe.remove();
  const fontSize = parseFloat(cs.fontSize);
  const avg = full.length ? charsInFull / full.length : null;
  const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;
  return {
    selector,
    elements: els.length,
    paragraphsWithFullLines: paragraphs,
    fullLines: full.length,
    avgCharsPerLine: avg && round(avg, 1),
    minCharsPerLine: full.length ? Math.min(...full) : null,
    maxCharsPerLine: full.length ? Math.max(...full) : null,
    writingMode: cs.writingMode,
    multiColumn: cs.columnCount !== 'auto' || cs.columnWidth !== 'auto',
    fontFamily: cs.fontFamily,
    fontSizePx: fontSize,
    lineHeightPx: cs.lineHeight,
    letterSpacing: cs.letterSpacing,
    inlineSizePx: round(contentInline, 1),
    inlineSizeInCh: round(contentInline / ch, 1),
    inlineSizeInEm: round(contentInline / fontSize, 1),
    zeroWidthEm: round(ch / fontSize, 3),
    // From the set lines themselves, so it holds for columns and ragged text.
    avgCharWidthEm: charsInFull ? round(inkInFull / charsInFull / fontSize, 3) : null,
  };
}

const SAMPLE = `
<h2>Setting text for the reader</h2>
<p>Good type serves the text. A page is read before it is looked at, and the reader notices the type only when something goes wrong: a line too long to follow back to its start, a paragraph so tightly leaded that the lines blur, a heading that floats away from the text it introduces. Most of these failures come from defaults that nobody chose on purpose.</p>
<p>The measure is the length of a line. Somewhere between forty-five and seventy-five characters, with sixty-six as a comfortable middle, the eye can travel to the end of a line and return to the next without losing its place. Narrower lines break phrases apart and wider ones make the return sweep uncertain, especially when the leading is tight.</p>
<h3>Leading and rhythm</h3>
<p>Leading should grow with the measure. A long line needs more space between lines so the eye can find the start of the next one, while display sizes want much less. When every vertical gap on the page is a multiple of the body line, headings, lists and quotations sit on a shared interval and the page reads as one composed surface rather than a stack of unrelated boxes.</p>
<ul><li>Keep one convention for marking paragraphs and use it consistently throughout the whole document.</li><li>Space headings in whole or half lines so the text after them returns to the interval.</li></ul>
<blockquote><p>A quotation set inside the article keeps the body size and leading, indented from the start edge so its lines still land on the shared interval.</p></blockquote>
<p>None of this requires exotic tools. It requires measuring what the browser actually renders, because units that sound precise often are not: the width of a zero is not the width of an average letter, the root line is not the body line once the body size changes, and a margin that looks like half a line can collapse into something else entirely.</p>
`;

function sampleDocument(cssHref, className, lang) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${cssHref}"></head>
<body><article class="${className}" lang="${lang}">${SAMPLE}</article></body></html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    if (i === -1) return fallback;
    const value = args[i + 1];
    args.splice(i, 2);
    return value;
  };
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    if (i === -1) return false;
    args.splice(i, 1);
    return true;
  };
  const width = Number(opt('width', 1280));
  const zoom = Number(opt('zoom', 1));
  const css = opt('css', null);
  const className = opt('class', 'prose');
  const lang = opt('lang', 'en');
  const json = flag('json');
  const fail = (message) => {
    console.error(message);
    process.exit(2);
  };
  if (!Number.isFinite(width) || width <= 0) fail('--width needs a number of CSS px');
  if (!Number.isFinite(zoom) || zoom <= 0) fail('--zoom needs a number, for example 2 for 200%');

  if (!css && !args.length) {
    console.error('usage: measure-line.js <url|file.html> [selector] | --css file.css [--class prose]');
    process.exit(2);
  }

  let chromium;
  try {
    if (process.env.MT_NO_PLAYWRIGHT) throw new Error('MT_NO_PLAYWRIGHT is set');
    ({ chromium } = require('playwright'));
  } catch {
    console.error('Playwright is missing: npm install && npx playwright install chromium');
    console.error('Without a browser, node scripts/estimate-measure.js "<font-family>" <width> gives an estimate.');
    process.exit(2);
  }
  const path = require('node:path');
  const fs = require('node:fs');
  const os = require('node:os');
  const { pathToFileURL } = require('node:url');

  let target;
  let selector;
  if (css) {
    const cssPath = path.resolve(css);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'measure-line-'));
    const html = path.join(dir, 'sample.html');
    fs.writeFileSync(html, sampleDocument(pathToFileURL(cssPath).href, className, lang));
    target = pathToFileURL(html).href;
    selector = args[0] || `.${className} > p`;
  } else {
    const input = args[0];
    if (!/^[a-z]+:\/\//i.test(input) && !fs.existsSync(path.resolve(input))) fail(`no such file: ${input}`);
    target = /^[a-z]+:\/\//i.test(input) ? input : pathToFileURL(path.resolve(input)).href;
    selector = args[1] || 'p';
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: Math.round(width / zoom), height: 900 },
    deviceScaleFactor: zoom,
  });
  await page.goto(target, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(measureLines, selector);
  if (!result.error) result.renderedFonts = await renderedFonts(page, selector);
  await browser.close();

  result.viewport = { width, zoom, cssWidth: Math.round(width / zoom) };
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    if (result.error) process.exit(2);
    return;
  }
  if (result.error) {
    console.error(result.error);
    process.exit(2);
  }
  const verdict =
    result.avgCharsPerLine == null ? 'no full lines'
    : result.avgCharsPerLine < 45 ? 'short (under 45)'
    : result.avgCharsPerLine > 75 ? 'long (over 75)'
    : 'inside 45-75';
  console.log(`${result.selector} at ${width}px, zoom ${zoom}: ${result.avgCharsPerLine} chars/line (${verdict})`);
  console.log(`  range ${result.minCharsPerLine}-${result.maxCharsPerLine} over ${result.fullLines} full lines in ${result.paragraphsWithFullLines} paragraphs`);
  console.log(`  declared ${result.fontFamily} ${result.fontSizePx}px, line-height ${result.lineHeightPx}`);
  if (result.renderedFonts) {
    const fonts = result.renderedFonts
      .map((f) => `${f.familyName} (${f.isCustomFont ? 'web font' : 'system font'}, ${f.glyphCount} glyphs)`)
      .join(', ');
    console.log(`  rendered with ${fonts}`);
  }
  const note = result.multiColumn ? ' across all columns' : '';
  console.log(`  content box ${result.inlineSizePx}px = ${result.inlineSizeInCh}ch = ${result.inlineSizeInEm}em${note}`);
  if (result.writingMode !== 'horizontal-tb') console.log(`  measured along the inline axis of ${result.writingMode}`);
  console.log(`  zero ${result.zeroWidthEm}em vs average character ${result.avgCharWidthEm}em`);
}

// The faces Chromium actually used for the first match's text, which can differ
// from the declared stack when a web font fails or lacks a glyph.
async function renderedFonts(page, selector) {
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) return null;
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts.length ? fonts : null;
  } catch {
    return null;
  }
}

if (typeof module !== 'undefined' && require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(2);
  });
}

if (typeof module !== 'undefined') module.exports = { measureLines, sampleDocument };
