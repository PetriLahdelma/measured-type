// Shared test helpers (spec 0025 R9). Probes and paths the test files used to copy.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PY = process.env.MT_PYTHON || 'python3';

// The OFL test fonts and the examples live in the repository, four directories up from here;
// an installed copy of the skill has neither, so tests that need them skip.
const FONTS = path.join(__dirname, '..', '..', '..', '..', 'evals', 'ofl-feature-check', 'files', 'fonts');
const EXAMPLES = path.join(__dirname, '..', '..', '..', '..', 'examples');
const GEORGIA = ['/System/Library/Fonts/Supplemental/Georgia.ttf', '/usr/share/fonts/truetype/msttcorefonts/Georgia.ttf'].find((f) => fs.existsSync(f));

// Probe what the scripts import, not the package name: an empty `fontTools/` directory in
// site-packages is a namespace package, so `import fontTools` succeeds while
// `from fontTools.ttLib import TTFont` fails, and the scripts fail with it.
function fontToolsReady(py = PY, env = process.env) {
  return spawnSync(py, ['-c', 'from fontTools.ttLib import TTFont'], { encoding: 'utf8', env }).status === 0;
}

const NO_FONTTOOLS = `fontTools missing for ${PY} (set MT_PYTHON)`;
const NO_TEST_FONTS = 'test fonts missing';

module.exports = { PY, FONTS, EXAMPLES, GEORGIA, fontToolsReady, NO_FONTTOOLS, NO_TEST_FONTS };
