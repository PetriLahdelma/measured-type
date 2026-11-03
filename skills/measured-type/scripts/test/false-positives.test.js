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
