// Spec 0028: the corpus study's frozen list and its analysis, tested before any run.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const corpus = require(path.join(ROOT, 'evals', '0028', 'corpus.json'));
const { growthOf, lowestGrowth, summarize, spotSample } = require(path.join(ROOT, 'evals', '0028', 'analyze.js'));

const finding = (rule, severity, measured, location = 'p') => ({ rule, severity, measured, location, fix: '' });
const page = (url, category, findings, avg = 66, fullLines = 10) => ({
  url,
  category,
  status: 'ok',
  audit: { verdict: findings.some((f) => f.severity === 'HIGH') ? 'Block (1 HIGH)' : findings.some((f) => f.severity === 'MEDIUM') ? 'Approve, 1 to fix' : 'Approve', findings, notVerified: [] },
  lines: { fullLines, avgCharsPerLine: avg },
});

test('Z1 the frozen corpus holds 25 primary and 5 reserve pages in each of four categories, every URL once', () => {
  assert.deepEqual(Object.keys(corpus.categories).sort(), ['design-system', 'developer-docs', 'reading', 'template']);
  const all = [];
  for (const c of Object.values(corpus.categories)) {
    assert.equal(c.primary.length, 25);
    assert.equal(c.reserve.length, 5);
    all.push(...c.primary, ...c.reserve);
  }
  assert.equal(new Set(all).size, 120);
  for (const url of all) assert.match(url, /^https:\/\//);
  assert.ok(!all.some((u) => /digitaltableteur/.test(u)), "the author's own site is not in the corpus");
});

test('Z2 growth at 200% zoom is read from both zoom rules and the lowest on a page wins', () => {
  assert.equal(growthOf(finding('MT-ZOOM-GROWTH', 'LOW', '1.29× at 200% zoom on a 1280px window (house bar 1.6×)')), 1.29);
  assert.equal(growthOf(finding('MT-ZOOM-VW', 'HIGH', '140.8px grows 1.00× at 200% and 1.32× at 500% zoom')), 1);
  assert.equal(growthOf(finding('MT-CONTRAST', 'HIGH', '2.85:1')), null);
  const p = page('https://a.example/', 'reading', [finding('MT-ZOOM-GROWTH', 'LOW', '1.5× at 200% zoom'), finding('MT-ZOOM-VW', 'HIGH', '40px grows 1.10× at 200% and 1.3× at 500% zoom')]);
  assert.equal(lowestGrowth(p), 1.1);
  assert.equal(lowestGrowth(page('https://b.example/', 'reading', [])), null);
});

test('Z3 the summary counts line length only on pages with three full lines, and failed pages count nowhere', () => {
  const s = summarize([
    page('https://a.example/', 'reading', [finding('MT-CONTRAST', 'HIGH', '2.85:1')], 60),
    page('https://b.example/', 'reading', [finding('MT-MEASURE-LONG', 'MEDIUM', '90 characters')], 90),
    page('https://c.example/', 'template', [], 40),
    page('https://d.example/', 'template', [], 200, 2),
    { url: 'https://e.example/', category: 'template', status: 'failed', error: 'timeout' },
  ]);
  assert.equal(s.pages, 4);
  assert.equal(s.failed, 1);
  assert.equal(s.lines.measured, 3);
  assert.equal(s.lines.noText, 1);
  assert.equal(s.lines.median, 60);
  assert.equal(s.lines.in45to75, 1);
  assert.equal(s.lines.over75, 1);
  assert.equal(s.lines.under45, 1);
  assert.deepEqual(s.verdicts, { block: 1, approveToFix: 1, approve: 2 });
  assert.equal(s.rules['MT-CONTRAST'].pages, 1);
  assert.equal(s.byCategory.reading.pages, 2);
});

test('Z3 a rule counts each page once however many findings it has', () => {
  const s = summarize([page('https://a.example/', 'reading', [finding('MT-CONTRAST', 'HIGH', '2:1', 'p'), finding('MT-CONTRAST', 'HIGH', '3:1', 'h2')])]);
  assert.equal(s.rules['MT-CONTRAST'].pages, 1);
});

test('Z4 the spot-check sample is fixed by a hash, capped and independent of input order', () => {
  const pages = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((h) => page(`https://${h}.example/`, 'reading', [finding('MT-REFLOW', 'HIGH', 'x', 'z'), finding('MT-REFLOW', 'HIGH', 'y', 'a')]));
  const one = spotSample(pages, 'MT-REFLOW', 5);
  assert.equal(one.length, 5);
  assert.deepEqual(one, spotSample([...pages].reverse(), 'MT-REFLOW', 5));
  assert.equal(one[0].location, 'a', 'the first finding by location');
  assert.equal(spotSample(pages, 'MT-CONTRAST', 5).length, 0);
});
