// Spec 0003 K1-K4: a lite mode that needs no browser, and a measure estimate
// checked against the rendered count in Chromium.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const SCRIPTS = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'audit');
const { estimate, FACES } = require(path.join(SCRIPTS, 'estimate-measure.js'));
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));
const { measureLines, sampleDocument } = require(path.join(SCRIPTS, 'measure-line.js'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-lite-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const noBrowser = { ...process.env, MT_NO_PLAYWRIGHT: '1' };

test('K3 estimate converts ch, em, rem and px widths for a known face', () => {
  const v = estimate({ family: 'Verdana, sans-serif', width: '66ch' });
  assert.equal(v.known, true);
  assert.equal(v.family, 'Verdana');
  assert.ok(Math.abs(v.cpl - 81) <= 3, JSON.stringify(v));
  assert.equal(estimate({ family: 'Georgia', width: '30em', size: 16 }).widthPx, 480);
  assert.equal(estimate({ family: 'Georgia', width: '30rem' }).widthPx, 480);
  assert.equal(estimate({ family: 'Georgia', width: '480px' }).widthPx, 480);
});

test('K3 an unknown face gets a labelled range instead of a single number', () => {
  const v = estimate({ family: '"Brand Grotesk", sans-serif', width: '66ch' });
  assert.equal(v.known, false);
  assert.ok(v.low < v.high, JSON.stringify(v));
  assert.ok(v.low >= 60 && v.high <= 110, JSON.stringify(v));
});

test('K3 estimates are within 6% of the rendered count at widths not used for calibration', async (t) => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  let checked = 0;
  const errors = [];
  for (const face of Object.keys(FACES)) {
    for (const width of ['28em', '36em', '60ch']) {
      const css = write('m.css', `body{margin:0}.prose{font-family:${face === 'system-ui' ? face : `"${face}"`};font-size:17px;line-height:1.5;max-inline-size:${width}}.prose p{margin:0 0 1em}`);
      const html = write('m.html', sampleDocument(pathToFileURL(css).href, 'prose', 'en'));
      await page.goto(pathToFileURL(html).href);
      await page.evaluate(() => document.fonts.ready);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.prose > p' });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      if (face !== 'system-ui' && fonts[0].familyName !== face) break; // not installed here
      const real = (await page.evaluate(measureLines, '.prose > p')).avgCharsPerLine;
      const est = estimate({ family: face, width, size: 17 }).cpl;
      const err = (est - real) / real;
      if (Math.abs(err) > 0.06) errors.push(`${face} ${width}: estimate ${est}, rendered ${real}`);
      checked++;
    }
  }
  await browser.close();
  assert.deepEqual(errors, []);
  // T3 (spec 0005): the calibration faces are macOS fonts; elsewhere too few render to test against.
  if (checked < 10) return t.skip(`only ${checked} face and width pairs rendered; the calibration faces are not installed here`);
  assert.ok(checked >= 30, `only ${checked} face and width pairs rendered`);
});

test('K4 MT-MEASURE-CH carries the estimate when the rule sets a known face', () => {
  const file = write('ch.css', 'p { font-family: Verdana, sans-serif; max-inline-size: 66ch; }\n');
  const hit = lint([file]).findings.filter((f) => f.rule === 'MT-MEASURE-CH');
  assert.equal(hit.length, 1);
  assert.match(hit[0].measured, /about 8\d characters per line in Verdana/);
});

test('K1 audit with lite: true lints the page and its local stylesheets and lists what it skipped', async () => {
  write('lite.css', 'html { font-size: 14px; }\n');
  const page = write('lite.html', '<!doctype html><html lang="en"><head><link rel="stylesheet" href="lite.css"><style>p { text-align: justify; }</style></head><body><p>Text.</p></body></html>');
  const r = await audit(page, { lite: true });
  assert.equal(r.mode, 'lite');
  assert.ok(r.findings.some((f) => f.rule === 'MT-ROOT-PX' && f.severity === 'MEDIUM'), JSON.stringify(r.findings));
  assert.ok(r.findings.some((f) => f.rule === 'MT-JUSTIFY'), JSON.stringify(r.findings));
  const skipped = r.notVerified.join(' ');
  for (const word of ['measure', 'contrast', 'reflow', 'zoom']) assert.match(skipped, new RegExp(word));
});

test('K1 without Playwright the CLI falls back to lite for a file and exits by the verdict', () => {
  const run = spawnSync(process.execPath, [path.join(SCRIPTS, 'page-audit.js'), path.join(FIX, 'justify.html')], { env: noBrowser, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /lite/i);
  assert.match(run.stdout, /MT-JUSTIFY/);
  assert.doesNotMatch(run.stderr, /at .*\.js:\d+/);
});

test('K1 without Playwright a URL exits 2 with the install command', () => {
  const run = spawnSync(process.execPath, [path.join(SCRIPTS, 'page-audit.js'), 'https://example.com/'], { env: noBrowser, encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /npx playwright install chromium/);
});

test('K2 measure-line without Playwright names the install command and the estimate script', () => {
  const run = spawnSync(process.execPath, [path.join(SCRIPTS, 'measure-line.js'), path.join(FIX, 'long.html')], { env: noBrowser, encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /npx playwright install chromium/);
  assert.match(run.stderr, /estimate-measure\.js/);
});

test('K3 the estimate CLI needs no dependencies and says it is an estimate', () => {
  const out = execFileSync(process.execPath, [path.join(SCRIPTS, 'estimate-measure.js'), 'Georgia', '66ch'], { env: noBrowser, encoding: 'utf8' });
  assert.match(out, /about 9\d characters per line/);
  assert.match(out, /estimate/i);
});
