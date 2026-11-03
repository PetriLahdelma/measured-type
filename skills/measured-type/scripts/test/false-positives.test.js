// Spec 0024: false positives in the rendered page audit. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const { audit } = require(path.join(__dirname, '..', 'page-audit.js'));
const FIX = path.join(__dirname, 'audit', 'fp');

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });

const run = (name) => audit(path.join(FIX, name), { browser });
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));

test('V1 screen-reader-only captions are not MT-TEXT-SPACING; a visible clipped box still is', async () => {
  const hits = find(await run('v1-sr-caption.html'), 'MT-TEXT-SPACING');
  assert.ok(!hits.some((f) => /caption/.test(f.location)), JSON.stringify(hits));
  assert.ok(hits.some((f) => f.severity === 'HIGH' && /p\.note/.test(f.location)), `the visible clipped note is not reported: ${JSON.stringify(hits)}`);
});

const reflowAmounts = (hits) => hits.map((f) => Number((/runs (-?\d+)px past/.exec(f.measured) || [])[1]));

test('V2 a skip link waiting off-screen on the start side is not MT-REFLOW; text past the end edge still is', async () => {
  const hits = find(await run('v2-skip-link.html'), 'MT-REFLOW');
  assert.ok(!hits.some((f) => /a\.skip|drawer/.test(f.location)), JSON.stringify(hits));
  const wide = hits.filter((f) => f.severity === 'HIGH' && /p\.wide/.test(f.location));
  assert.ok(wide.some((f) => /320/.test(f.location)), `the 600px paragraph is not reported at 320: ${JSON.stringify(hits)}`);
  for (const n of reflowAmounts(hits)) assert.ok(n > 0, `overflow must be positive, got ${n}: ${JSON.stringify(hits)}`);
});

test('V2 in a right-to-left page the end edge is the left one: text past it is MT-REFLOW, a skip link off the right is not', async () => {
  const hits = find(await run('v2-rtl.html'), 'MT-REFLOW');
  assert.ok(!hits.some((f) => /a\.skip/.test(f.location)), JSON.stringify(hits));
  assert.ok(hits.some((f) => f.severity === 'HIGH' && /p\.wide/.test(f.location) && /320/.test(f.location)), `the 600px paragraph is not reported: ${JSON.stringify(hits)}`);
  for (const n of reflowAmounts(hits)) assert.ok(n > 0, `overflow must be positive, got ${n}: ${JSON.stringify(hits)}`);
});
