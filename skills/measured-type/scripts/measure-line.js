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
 * Only full lines count: the last line of each paragraph is usually short
 * and would drag the average down.
 *
 * Requires Playwright for modes 1 and 2: npm install (see package.json), then
 * npx playwright install chromium.
 */

// Runs inside the page. Keep it self-contained so it can be pasted into a console.
function measureLines(selector) {
  const els = [...document.querySelectorAll(selector)];
  if (!els.length) return { error: `no element matches ${selector}` };
  const full = [];
  let paragraphs = 0;
  for (const el of els) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = new Map(); // rounded top -> character count
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent;
      for (let i = 0; i < text.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = [...range.getClientRects()].find((r) => r.width > 0);
        if (!rect) continue; // collapsed whitespace
        const top = Math.round(rect.top);
        lines.set(top, (lines.get(top) || 0) + 1);
      }
    }
    const counts = [...lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
    if (counts.length > 1) {
      paragraphs++;
      full.push(...counts.slice(0, -1)); // drop the last, short line
    }
  }
  const first = els[0];
  const cs = getComputedStyle(first);
  const box = first.getBoundingClientRect();
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;letter-spacing:inherit';
  probe.textContent = '0'.repeat(100);
  first.appendChild(probe);
  const ch = probe.getBoundingClientRect().width / 100;
  probe.remove();
  const fontSize = parseFloat(cs.fontSize);
  const avg = full.length ? full.reduce((a, b) => a + b, 0) / full.length : null;
  return {
    selector,
    elements: els.length,
    paragraphsWithFullLines: paragraphs,
    fullLines: full.length,
    avgCharsPerLine: avg && Math.round(avg * 10) / 10,
    minCharsPerLine: full.length ? Math.min(...full) : null,
    maxCharsPerLine: full.length ? Math.max(...full) : null,
    fontFamily: cs.fontFamily,
    fontSizePx: fontSize,
    lineHeightPx: cs.lineHeight,
    inlineSizePx: Math.round(box.width * 10) / 10,
    inlineSizeInCh: Math.round((box.width / ch) * 10) / 10,
    inlineSizeInEm: Math.round((box.width / fontSize) * 10) / 10,
    zeroWidthEm: Math.round((ch / fontSize) * 1000) / 1000,
    avgCharWidthEm: avg ? Math.round((box.width / avg / fontSize) * 1000) / 1000 : null,
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

  if (!css && !args.length) {
    console.error('usage: measure-line.js <url|file.html> [selector] | --css file.css [--class prose]');
    process.exit(2);
  }

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('Playwright is missing: npm install && npx playwright install chromium');
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
  await browser.close();

  result.viewport = { width, zoom, cssWidth: Math.round(width / zoom) };
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  const verdict =
    result.avgCharsPerLine == null ? 'no full lines'
    : result.avgCharsPerLine < 45 ? 'short (under 45)'
    : result.avgCharsPerLine > 75 ? 'long (over 75)'
    : 'inside 45-75';
  console.log(`${result.selector} at ${width}px, zoom ${zoom}: ${result.avgCharsPerLine} chars/line (${verdict})`);
  console.log(`  range ${result.minCharsPerLine}-${result.maxCharsPerLine} over ${result.fullLines} full lines in ${result.paragraphsWithFullLines} paragraphs`);
  console.log(`  ${result.fontFamily} ${result.fontSizePx}px, line-height ${result.lineHeightPx}`);
  console.log(`  box ${result.inlineSizePx}px = ${result.inlineSizeInCh}ch = ${result.inlineSizeInEm}em`);
  console.log(`  zero ${result.zeroWidthEm}em vs average character ${result.avgCharWidthEm}em`);
}

if (typeof module !== 'undefined' && require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

if (typeof module !== 'undefined') module.exports = { measureLines, sampleDocument };
