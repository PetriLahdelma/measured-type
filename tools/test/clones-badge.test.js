// tools/clones-badge.js: a running total of git clones for the README badge.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { merge, badge, compact } = require(path.join(__dirname, '..', 'clones-badge.js'));

const day = (date, count, uniques = 1) => ({ timestamp: `${date}T00:00:00Z`, count, uniques });

test('C1 the first run keeps every day GitHub reports', () => {
  const data = merge({ days: {} }, { clones: [day('2026-10-28', 0), day('2026-10-29', 107, 39)] });
  assert.deepEqual(data.days, { '2026-10-28': 0, '2026-10-29': 107 });
  assert.equal(data.total, 107);
});

test('C2 a day seen twice is counted once, at its latest count', () => {
  // A day still in progress is reported again, higher, on the next run.
  const first = merge({ days: {} }, { clones: [day('2026-10-29', 107), day('2026-10-30', 4)] });
  const second = merge(first, { clones: [day('2026-10-30', 9), day('2026-10-31', 2)] });
  assert.deepEqual(second.days, { '2026-10-29': 107, '2026-10-30': 9, '2026-10-31': 2 });
  assert.equal(second.total, 118);
});

test('C3 days that fall out of the 14-day window are kept', () => {
  const old = { days: { '2026-09-01': 50 } };
  const data = merge(old, { clones: [day('2026-10-29', 7)] });
  assert.equal(data.days['2026-09-01'], 50);
  assert.equal(data.total, 57);
});

test('C4 a lower count for a day already stored never lowers the total', () => {
  const data = merge({ days: { '2026-10-29': 107 } }, { clones: [day('2026-10-29', 3)] });
  assert.equal(data.days['2026-10-29'], 107);
});

test('C5 the badge is a shields endpoint labelled clones', () => {
  const b = badge(118);
  assert.equal(b.schemaVersion, 1);
  assert.equal(b.label, 'clones');
  assert.equal(b.message, '118');
  assert.match(b.color, /^[0-9A-Fa-f]{6}$/);
});

test('C6 large totals are shortened the way shields shortens counts', () => {
  assert.equal(compact(999), '999');
  assert.equal(compact(1234), '1.2k');
  assert.equal(compact(12000), '12k');
  assert.equal(compact(1500000), '1.5M');
});
