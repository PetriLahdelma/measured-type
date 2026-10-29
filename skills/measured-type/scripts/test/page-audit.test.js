// Spec 0001 part C: scripts/page-audit.js. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const SCRIPT = path.join(__dirname, '..', 'page-audit.js');
const FIX = path.join(__dirname, 'audit');
const EXAMPLES = path.join(__dirname, '..', '..', '..', '..', 'examples', 'editorial');
// examples/ lives in the repository; an installed copy of the skill does not ship it.
const noExamples = !fs.existsSync(EXAMPLES) && 'examples/ is not shipped with an installed skill';
const { audit } = require(SCRIPT);

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });

const run = (name, dir = FIX) => audit(path.join(dir, name), { browser });
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));

test('C1 a 960px fixed container is MT-REFLOW HIGH at 320 CSS px', async () => {
  const r = await run('reflow.html');
  const hit = find(r, 'MT-REFLOW', 'HIGH');
  assert.ok(hit.length, JSON.stringify(r.findings));
  assert.ok(hit.some((f) => /320/.test(f.location)), 'reported at 320 CSS px');
});

test('C2 a full-width paragraph is MT-MEASURE-LONG MEDIUM with the measured count', async () => {
  const r = await run('long.html');
  const hit = find(r, 'MT-MEASURE-LONG', 'MEDIUM');
  assert.ok(hit.length);
  const n = Number((/(\d+(\.\d+)?) characters per line/.exec(hit[0].measured) || [])[1]);
  assert.ok(n > 75, `measured ${hit[0].measured}`);
});

test('C3 #999 on white is MT-CONTRAST HIGH with the ratio; #333 is not', async () => {
  const r = await run('contrast.html');
  const hit = find(r, 'MT-CONTRAST', 'HIGH');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].location, /\.low/);
  assert.match(hit[0].measured, /2\.8\d:1/);
});

test('C4 text clipped under the 1.4.12 spacing override is MT-TEXT-SPACING HIGH', async () => {
  const r = await run('spacing.html');
  assert.ok(find(r, 'MT-TEXT-SPACING', 'HIGH').length, JSON.stringify(r.findings));
});

test('C4b text already clipped without the override (screen-reader text, closed panel, spam trap) is not MT-TEXT-SPACING', async () => {
  const r = await run('spacing-hidden.html');
  assert.equal(find(r, 'MT-TEXT-SPACING').length, 0, JSON.stringify(find(r, 'MT-TEXT-SPACING')));
});

test('C3b a translucent ground is laid over the page before the ratio is taken', async () => {
  const r = await run('contrast-alpha.html');
  const hit = find(r, 'MT-CONTRAST', 'HIGH');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].location, /\.low/);
  assert.match(hit[0].measured, /^2\.1\d:1 \(rgb\(119, 119, 119\) on rgb\(179, 179, 179\)/);
});

test('C5 a missing web font is MT-FONT-FALLBACK MEDIUM naming the face that rendered', async () => {
  const r = await run('fallback.html');
  const hit = find(r, 'MT-FONT-FALLBACK', 'MEDIUM');
  assert.ok(hit.length);
  assert.match(hit[0].measured, /Missing Serif/);
  assert.match(hit[0].measured, /Georgia|Times|serif/i);
});

test('C6 a 14px paragraph is MT-SIZE-FLOOR MEDIUM', async () => {
  const r = await run('small.html');
  assert.ok(find(r, 'MT-SIZE-FLOOR', 'MEDIUM').length);
});

test('C7 pure vw heading is MT-ZOOM-VW HIGH; a 1.58x fluid heading is MT-ZOOM-GROWTH LOW', async () => {
  const r = await run('zoom.html');
  assert.ok(find(r, 'MT-ZOOM-VW', 'HIGH').some((f) => /h1/.test(f.location)), JSON.stringify(r.findings));
  const growth = find(r, 'MT-ZOOM-GROWTH', 'LOW').find((f) => /h2/.test(f.location));
  assert.ok(growth, 'h2 growth finding');
  assert.match(growth.measured, /1\.5\d×/);
});

test('C8 a heading with a one-word last line is MT-HEADING-RUNT LOW', async () => {
  const r = await run('runt.html');
  assert.ok(find(r, 'MT-HEADING-RUNT', 'LOW').length, JSON.stringify(r.findings));
});

test('C9 rendered justify without hyphenation is MT-JUSTIFY MEDIUM', async () => {
  const r = await run('justify.html');
  assert.ok(find(r, 'MT-JUSTIFY', 'MEDIUM').length);
});

test('C10 more than 8 distinct text sizes is MT-SIZE-COUNT LOW', async () => {
  const r = await run('sizes.html');
  assert.ok(find(r, 'MT-SIZE-COUNT', 'LOW').length);
});

test('C11 no HIGH or MEDIUM findings on clean pages', async () => {
  const pages = [['clean.html', FIX], ...(noExamples ? [] : [['after.html', EXAMPLES]])];
  for (const [name, dir] of pages) {
    const r = await run(name, dir);
    const serious = r.findings.filter((f) => f.severity !== 'LOW');
    assert.deepEqual(serious, [], `${name}: ${JSON.stringify(serious)}`);
  }
});

test('C12 the known bad example yields its expected rules', { skip: noExamples }, async () => {
  const r = await run('before.html', EXAMPLES);
  for (const rule of ['MT-MEASURE-LONG', 'MT-ZOOM-VW', 'MT-JUSTIFY', 'MT-CONTRAST']) {
    assert.ok(find(r, rule).length, `expected ${rule}`);
  }
});

test('C13 CLI prints the report table, verdict and exit code', () => {
  const bad = spawnSync('node', [SCRIPT, path.join(FIX, 'contrast.html')], { encoding: 'utf8' });
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stdout, /\| HIGH \| MT-CONTRAST \|/);
  assert.match(bad.stdout, /Verdict: Block/);
  assert.match(bad.stdout, /Not verified:/);
  const ok = spawnSync('node', [SCRIPT, path.join(FIX, 'clean.html')], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout);
  assert.match(ok.stdout, /Verdict: Approve/);
});
