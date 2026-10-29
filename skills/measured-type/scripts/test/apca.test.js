// Spec 0002 H3: scripts/apca.js reproduces the APCA-W3 reference values.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { apcaLc } = require(path.join(__dirname, '..', 'apca.js'));

test('H3 #888 text on #fff is Lc 63.06', () => {
  assert.equal(apcaLc([136, 136, 136], [255, 255, 255]).toFixed(2), '63.06');
});

test('H3 #fff text on #888 is Lc -68.54', () => {
  assert.equal(apcaLc([255, 255, 255], [136, 136, 136]).toFixed(2), '-68.54');
});

test('H3 black on white and white on black', () => {
  assert.equal(apcaLc([0, 0, 0], [255, 255, 255]).toFixed(1), '106.0');
  assert.equal(apcaLc([255, 255, 255], [0, 0, 0]).toFixed(1), '-107.9');
});
