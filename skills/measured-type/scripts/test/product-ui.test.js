// Spec 0003 L1-L6: dense product UI checks in scripts/page-audit.js and lint-css.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const FIX = path.join(__dirname, 'audit');
const AFTER = path.join(__dirname, '..', '..', '..', '..', 'examples', 'editorial', 'after.html');
const { audit } = require(path.join(__dirname, '..', 'page-audit.js'));
const { lint } = require(path.join(__dirname, '..', 'lint-css.js'));
const NEW = ['MT-TABULAR', 'MT-NUM-ALIGN', 'MT-CAPS-TRACKING', 'MT-TRUNCATE', 'MT-UI-SIZE'];

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });

const cache = new Map();
const run = (file) => {
  if (!cache.has(file)) cache.set(file, audit(file, { browser }));
  return cache.get(file);
};
const fx = (name) => path.join(FIX, name);
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));

test('L1 a number column in proportional figures is MT-TABULAR MEDIUM with the width difference', async () => {
  const hit = find(await run(fx('product-bad.html')), 'MT-TABULAR', 'MEDIUM');
  assert.deepEqual(hit.map((f) => f.location), ['table column 2', 'table column 3']);
  assert.match(hit[0].measured, /1 and 0 differ by \d+(\.\d+)?%/);
  assert.match(hit[0].fix, /tabular-nums/);
});

test('L1 a face without tabular figures is told to change face, not to add tabular-nums', async () => {
  const hit = find(await run(fx('tabular-georgia.html')), 'MT-TABULAR', 'MEDIUM');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].fix, /no tabular figures/);
});

test('L2 a start-aligned number column of mixed lengths is MT-NUM-ALIGN LOW', async () => {
  const hit = find(await run(fx('product-bad.html')), 'MT-NUM-ALIGN', 'LOW');
  assert.equal(hit.length, 2, JSON.stringify(hit));
  assert.match(hit[0].fix, /text-align: end/);
});

test('L3 an 11px uppercase label with no tracking is MT-CAPS-TRACKING LOW', async () => {
  const hit = find(await run(fx('product-bad.html')), 'MT-CAPS-TRACKING', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].location, /label/);
  assert.match(hit[0].fix, /letter-spacing: 0\.0[5-8]em/);
});

test('L3 the linter flags text-transform: uppercase without letter-spacing in the same rule', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-caps-'));
  const file = path.join(dir, 'caps.css');
  fs.writeFileSync(file, '.eyebrow { text-transform: uppercase; }\n.tag { text-transform: uppercase; letter-spacing: 0.06em; }\n');
  const hit = lint([file]).findings.filter((f) => f.rule === 'MT-CAPS-TRACKING');
  assert.deepEqual(hit.map((f) => f.line), [1]);
});

test('L4 a cell cut by an ellipsis with no title is MT-TRUNCATE LOW', async () => {
  const hit = find(await run(fx('product-bad.html')), 'MT-TRUNCATE');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.equal(hit[0].severity, 'LOW');
  assert.match(hit[0].measured, /Authentication gateway/);
});

test('L4 text that fits at 1280px and is cut only at 200% zoom is MT-TRUNCATE MEDIUM', async () => {
  const hit = find(await run(fx('product-zoom.html')), 'MT-TRUNCATE');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.equal(hit[0].severity, 'MEDIUM');
  assert.match(hit[0].measured, /200% zoom/);
});

test('L5 interface text under 12px is MT-UI-SIZE LOW with the size', async () => {
  const hit = find(await run(fx('product-bad.html')), 'MT-UI-SIZE', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].measured, /11px/);
});

test('L7 a fluid KPI value that is not a heading is MT-ZOOM-VW HIGH; a rem size is not', async () => {
  const r = await run(fx('zoom-text.html'));
  const hit = find(r, 'MT-ZOOM-VW', 'HIGH');
  assert.equal(hit.length, 1, JSON.stringify(r.findings));
  assert.match(hit[0].location, /kpi/);
});

test('L6 a well-set product page triggers none of the product checks', async () => {
  const r = await run(fx('product-good.html'));
  assert.deepEqual(r.findings.filter((f) => NEW.includes(f.rule)), []);
});

test('L6 the clean and editorial fixtures trigger none of the product checks', async () => {
  const files = [fx('clean.html'), ...(fs.existsSync(AFTER) ? [AFTER] : [])];
  for (const file of files) {
    const r = await run(file);
    assert.deepEqual(r.findings.filter((f) => NEW.includes(f.rule)), [], file);
  }
});
