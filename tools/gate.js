#!/usr/bin/env node
/**
 * The local gate (spec 0011): the prose check, then the skill's tests.
 *
 *   node tools/gate.js            # or: npm run gate
 *
 * Prints one summary line per step and exits non-zero when either fails.
 * There is no CI on pull requests; this is what the maintainer runs before a
 * merge and what .githooks/pre-push runs before a push.
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const at = args.indexOf('--skill-dir');
const skillDir = at === -1 ? path.join(ROOT, 'skills', 'measured-type') : path.resolve(args[at + 1]);

if (!process.env.MT_PYTHON) {
  console.warn('warning: MT_PYTHON is not set, so the font tests will skip. Point it at a Python that has fontTools (CONTRIBUTING.md, "Set up").');
}

const steps = [
  ['prose check', process.execPath, [path.join(__dirname, 'prose-check.js')], ROOT],
  ['tools tests', process.execPath, ['--test', path.join(__dirname, 'test', 'gate.test.js')], ROOT],
  ['skill tests', 'npm', ['test'], skillDir],
];
// The tools tests run the gate themselves; skip them there so it does not recurse.
if (process.env.MT_GATE_INNER) steps.splice(1, 1);

let failed = 0;
const results = [];
for (const [name, cmd, cmdArgs, cwd] of steps) {
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: 'inherit', shell: cmd === 'npm' && process.platform === 'win32', env: { ...process.env, MT_GATE_INNER: '1' } });
  const ok = r.status === 0;
  if (!ok) failed++;
  results.push(`${name}: ${ok ? 'ok' : 'fail'}`);
}
console.log(`\n${results.join('\n')}`);
process.exit(failed ? 1 : 0);
