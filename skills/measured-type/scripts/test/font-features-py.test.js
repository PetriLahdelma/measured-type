// Spec 0025 R11: the Python checks for font-features.py run inside npm test, under MT_PYTHON.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { PY, fontToolsReady, NO_FONTTOOLS } = require('./helpers.js');

test('R11 the Python checks for font-features.py run under MT_PYTHON', { skip: !fontToolsReady() && NO_FONTTOOLS }, () => {
  const r = spawnSync(PY, [path.join(__dirname, 'test_font_features.py')], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
});
