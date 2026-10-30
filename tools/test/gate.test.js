// Spec 0011: tools/prose-check.js and tools/gate.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const TOOLS = path.join(ROOT, 'tools');
const { checkText } = require(path.join(TOOLS, 'prose-check.js'));
const rules = (text) => checkText(text).map((f) => f.rule);
const node = (script, args, opts = {}) => spawnSync(process.execPath, [path.join(TOOLS, script), ...args], { encoding: 'utf8', ...opts });

test('R1 an em dash is reported with its line', () => {
  const f = checkText('Fine line.\nThe measure — 66 characters — holds.\n');
  assert.equal(f.length, 2);
  assert.ok(f.every((x) => x.rule === 'em-dash' && x.line === 2), JSON.stringify(f));
});

test('R2 a middle dot is reported', () => {
  assert.deepEqual(rules('Install · Evidence · License\n'), ['middle-dot', 'middle-dot']);
});

test('R3 a serial comma is an error for short items, a note for long ones, never for a plain list or a clause comma', () => {
  assert.deepEqual(rules('Contrast, zoom, and reflow are checked.\n'), ['serial-comma']);
  assert.deepEqual(rules('Pick Arial, Georgia, or Verdana.\n'), ['serial-comma']);
  assert.ok(checkText('Pick Arial, Georgia, or Verdana.\n').every((f) => f.level === 'error'));
  assert.deepEqual(rules('Contrast, zoom and reflow are checked.\n'), []);
  assert.deepEqual(rules('Use this file when asked to review, audit or critique typography, and whenever a page ships.\n'), []);
  assert.deepEqual(rules('A dense, well-set product fixture triggers none of L1 to L5, and the audit stays clean.\n'), []);
  const long = checkText('It ran once, while other grading ran in parallel, it did not, and a run scored 3/5.\n');
  assert.ok(long.length === 0 || long.every((f) => f.level === 'note'), JSON.stringify(long));
});

test('R4 code, inline code, URLs and blockquotes are skipped', () => {
  const text = [
    '```css',
    '/* a — in code */ a, b, and c',
    '```',
    'Inline `a — b` stays and so does `x, y, and z`.',
    'See https://example.com/a,b,and-c for more.',
    '> A quote, kept verbatim, and untouched — here.',
    '',
  ].join('\n');
  assert.deepEqual(checkText(text), []);
});

test('R5 the repository passes, and agent outputs are out of scope', () => {
  const r = node('prose-check.js', [], { cwd: ROOT });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const { files } = require(path.join(TOOLS, 'prose-check.js'));
  const list = files(ROOT).map((f) => path.relative(ROOT, f));
  assert.ok(list.includes('README.md') && list.includes(path.join('skills', 'measured-type', 'SKILL.md')));
  assert.ok(list.every((f) => !f.includes('node_modules') && !/evals[\\/]results[\\/][^\\/]+[\\/]runs[\\/]/.test(f)), list.filter((f) => /runs/.test(f)).join(', '));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-prose-'));
  fs.writeFileSync(path.join(tmp, 'bad.md'), 'Zoom, contrast, and reflow — all three.\n');
  const bad = node('prose-check.js', [tmp]);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /bad\.md:1/);
  fs.writeFileSync(path.join(tmp, 'bad.md'), 'It ran once, while other grading ran in parallel, it did not, and a run scored 3/5.\n');
  assert.equal(node('prose-check.js', [tmp]).status, 0, 'a note must not fail the check');
});

test('R6 the gate runs both steps, fails when the tests fail and warns without MT_PYTHON', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-gate-'));
  const skill = path.join(tmp, 'skill');
  fs.mkdirSync(skill);
  fs.writeFileSync(path.join(skill, 'package.json'), JSON.stringify({ name: 'x', private: true, scripts: { test: 'node -e "process.exit(1)"' } }));
  const env = { ...process.env };
  delete env.MT_PYTHON;
  const r = node('gate.js', ['--skill-dir', skill], { cwd: ROOT, env });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /prose check: ok/);
  assert.match(r.stdout, /skill tests: fail/);
  assert.match(r.stdout + r.stderr, /MT_PYTHON/);
  fs.writeFileSync(path.join(skill, 'package.json'), JSON.stringify({ name: 'x', private: true, scripts: { test: 'node -e "process.exit(0)"' } }));
  const ok = node('gate.js', ['--skill-dir', skill], { cwd: ROOT, env: { ...env, MT_PYTHON: process.execPath } });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /skill tests: ok/);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.gate, 'node tools/gate.js');
});

test('R7 the pre-push hook runs the gate and CONTRIBUTING documents it', () => {
  const hook = fs.readFileSync(path.join(ROOT, '.githooks', 'pre-push'), 'utf8');
  assert.match(hook, /tools\/gate\.js/);
  assert.ok(fs.statSync(path.join(ROOT, '.githooks', 'pre-push')).mode & 0o111, 'hook is not executable');
  const doc = fs.readFileSync(path.join(ROOT, 'CONTRIBUTING.md'), 'utf8');
  assert.match(doc, /npm run gate/);
  assert.match(doc, /core\.hooksPath \.githooks/);
});
