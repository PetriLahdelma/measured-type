#!/usr/bin/env node
// Regression fixtures for measure-line.js. Run with `npm test` from the skill folder.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { measureLines } = require('../measure-line.js');

const script = path.join(__dirname, '..', 'measure-line.js');
const fixture = path.join(__dirname, 'lines.html');
let failed = 0;

function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n     ${detail}`}`);
  if (!ok) failed++;
}

const lineKeys = ['fullLines', 'avgCharsPerLine', 'minCharsPerLine', 'maxCharsPerLine'];
const same = (a, b, keys = lineKeys) => keys.every((k) => a[k] === b[k]);
const show = (r, keys = lineKeys) => keys.map((k) => `${k} ${r[k]}`).join(', ');

// Lines in a single LTR column, found independently: a word starts a new line
// when its box starts left of the previous word's box.
function wordLines(selector) {
  const el = document.querySelector(selector);
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let lines = 0;
  let lastLeft = Infinity;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const re = /\S+/g;
    for (let m = re.exec(node.textContent); m; m = re.exec(node.textContent)) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + 1);
      const left = range.getClientRects()[0].left;
      if (left < lastLeft) lines++;
      lastLeft = left;
    }
  }
  return lines;
}

function cli(args) {
  try {
    return { code: 0, out: execFileSync('node', [script, ...args], { encoding: 'utf8', stdio: 'pipe' }) };
  } catch (err) {
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(pathToFileURL(fixture).href);
  await page.evaluate(() => document.fonts.ready);
  const m = (sel) => page.evaluate(measureLines, sel);

  const plain = await m('#plain');
  check('plain paragraph has several full lines', plain.fullLines >= 4, show(plain));

  const shifted = await m('#shifted');
  check('raised words and superscripts stay on their line', same(plain, shifted),
    `plain: ${show(plain)}; shifted: ${show(shifted)}`);

  const code = await m('#code');
  const codeLines = await page.evaluate(wordLines, '#code');
  check('smaller inline code adds no phantom lines', code.fullLines === codeLines - 1,
    `counter found ${code.fullLines} full lines, word positions give ${codeLines - 1}`);

  const nfc = await m('#nfc');
  const nfd = await m('#nfd');
  check('decomposed accents count as one character', same(nfc, nfd),
    `NFC: ${show(nfc)}; NFD: ${show(nfd)}`);

  const cols = await m('#cols');
  const onecol = await m('#onecol');
  check('two columns measure like one column of the same width', same(cols, onecol),
    `columns: ${show(cols)}; one column: ${show(onecol)}`);
  check('multi-column layout is flagged', cols.multiColumn === true && onecol.multiColumn === false,
    `multiColumn ${cols.multiColumn} / ${onecol.multiColumn}`);

  const vert = await m('#vert');
  check('vertical-rl measures along its inline axis', same(plain, vert, [...lineKeys, 'inlineSizePx']),
    `horizontal: ${show(plain, [...lineKeys, 'inlineSizePx'])}; vertical: ${show(vert, [...lineKeys, 'inlineSizePx'])}`);

  const spaced = await m('#spaced');
  check('1ch ignores letter-spacing', spaced.zeroWidthEm === plain.zeroWidthEm,
    `zero ${spaced.zeroWidthEm}em with letter-spacing, ${plain.zeroWidthEm}em without`);

  const padded = await m('#padded');
  check('box size is the content box, not the border box',
    padded.inlineSizePx === plain.inlineSizePx && same(plain, padded),
    `padded ${padded.inlineSizePx}px, plain ${plain.inlineSizePx}px`);

  const br = await m('#br');
  const two = await m('#twoparas');
  check('a line ended by <br> is left out like a paragraph end', same(br, two),
    `br: ${show(br)}; two paragraphs: ${show(two)}`);

  await browser.close();

  const missingJson = cli([fixture, '#nope', '--json']);
  check('--json with no match exits 1', missingJson.code === 1 && /no element matches/.test(missingJson.out),
    `exit ${missingJson.code}: ${missingJson.out.trim()}`);
  const missingText = cli([fixture, '#nope']);
  check('text mode with no match exits 1', missingText.code === 1, `exit ${missingText.code}`);
  const sample = cli(['--css', path.join(__dirname, 'sample.css')]);
  check('--css mode measures the built-in sample', sample.code === 0 && /chars\/line/.test(sample.out),
    `exit ${sample.code}: ${sample.out.trim()}`);
  check('reports the font that rendered', /rendered with /.test(sample.out), sample.out.trim());

  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
