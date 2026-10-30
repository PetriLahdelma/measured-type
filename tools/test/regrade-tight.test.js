// Spec 0018: evals/regrade-tight.js re-grades committed runs under tighter bands.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const { tight, BANDS } = require(path.join(ROOT, 'evals', 'regrade-tight.js'));
const e = (passed, evidence) => ({ passed, evidence });

test('G1 the measure case passes only at 64 to 68 characters', () => {
  const run = (chars) => [e(true, `pooled ${chars} characters per line over 27 full lines (per paragraph 62.8)`), e(true, 'scrollWidth 375'), e(true, 'paragraph sizes 17px')];
  assert.equal(tight('h2h-measure-ideal', run('66.2')).band, true);
  assert.equal(tight('h2h-measure-ideal', run('63.7')).band, false);
  assert.equal(tight('h2h-measure-ideal', run('68.0')).band, true);
  assert.equal(tight('h2h-measure-ideal', run('66.2')).all, true);
});

test('G2 the zoom cases pass only within 5% of both requested sizes', () => {
  const run = (small, large) => [e(true, 'growth 3.13×'), e(true, 'growth 1.61×'), e(true, `h1 ${small}px at 360, ${large}px at 1440`)];
  assert.equal(tight('h2h-zoom-title', run('48', '80')).band, true);
  assert.equal(tight('h2h-zoom-title', run('48', '70.4')).band, false);
  assert.equal(tight('h2h-zoom-hero', run('41', '68')).band, false);
  assert.equal(tight('h2h-zoom-hero', run('40', '72')).band, true);
  assert.deepEqual(BANDS['h2h-zoom-title'].small, [45.6, 50.4]);
});

test('G3 a run that failed another grader still fails all graders', () => {
  const run = [e(true, 'growth 3.13×'), e(false, 'growth 1.50×'), e(true, 'h1 40px at 360, 72px at 1440')];
  assert.deepEqual(tight('h2h-zoom-hero', run), { band: true, all: false });
});

test('G4 evidence without numbers fails the band', () => {
  assert.equal(tight('h2h-measure-ideal', [e(false, 'pooled null characters per line over 0 full lines'), e(true, ''), e(true, '')]).band, false);
});
