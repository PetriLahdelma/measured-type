// Spec 0012: estimate-measure.js --target and measure-line.js --solve.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPTS = path.join(__dirname, '..');
const SKILL = path.join(SCRIPTS, '..');
const FIX = path.join(__dirname, 'solve');
const run = (script, args) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], { encoding: 'utf8' });
const { estimate } = require(path.join(SCRIPTS, 'estimate-measure.js'));

test('M1 --target gives the em width whose estimate is the target', () => {
  const r = run('estimate-measure.js', ['Verdana', '--target', '66', '--size', '17', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.target, 66);
  assert.match(String(out.em), /^\d+(\.\d)?$/);
  assert.ok(Math.abs(out.px - out.em * 17) < 0.6, JSON.stringify(out));
  const back = estimate({ family: 'Verdana', width: `${out.em}em`, size: 17 });
  assert.ok(Math.abs(back.cpl - 66) <= 1, `${out.em}em estimates ${back.cpl}`);
  assert.match(run('estimate-measure.js', ['Georgia', '--target', '66']).stdout, /em/);
});

test('M2 an unknown family gives a range and the fallback width', () => {
  const r = run('estimate-measure.js', ['Brand Sans, Georgia, serif', '--target', '66', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.known, false);
  assert.ok(out.low < out.high, JSON.stringify(out));
  assert.equal(out.fallback, 'Georgia');
  assert.ok(out.fallbackEm > out.low && out.fallbackEm < out.high, JSON.stringify(out));
  assert.equal(out.em, undefined);
});

const rendersVerdana = () => {
  const probe = run('measure-line.js', ['--css', path.join(FIX, 'verdana.css'), '--json']);
  if (probe.status !== 0) return false;
  const fonts = JSON.parse(probe.stdout).renderedFonts || [];
  return fonts.some((f) => /verdana/i.test(f.familyName));
};

test('M3 --solve finds the rendered width for 66 characters in Verdana', (t) => {
  if (!rendersVerdana()) return t.skip('Verdana is not installed here');
  const r = run('measure-line.js', ['--css', path.join(FIX, 'verdana.css'), '--solve', '66', '--json']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const out = JSON.parse(r.stdout);
  assert.ok(out.solve, r.stdout);
  assert.match(String(out.solve.em), /^\d+(\.\d)?$/);
  assert.ok(out.solve.em > 30 && out.solve.em < 40, JSON.stringify(out.solve));
  assert.ok(Math.abs(out.solve.avgCharsPerLine - 66) <= 1.5, JSON.stringify(out.solve));
  assert.equal(out.solve.limitedByContainer, false);
  const text = run('measure-line.js', ['--css', path.join(FIX, 'verdana.css'), '--solve', '66']).stdout;
  assert.match(text, /max-inline-size: \d+(\.\d)?em/);
});

test('M4 a container narrower than the solved width is reported', () => {
  const r = run('measure-line.js', [path.join(FIX, 'narrow.html'), 'main p', '--solve', '66', '--json']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const out = JSON.parse(r.stdout);
  assert.equal(out.solve.limitedByContainer, true, JSON.stringify(out.solve));
  assert.ok(Math.abs(out.solve.containerPx - 300) <= 1, JSON.stringify(out.solve));
});

test('M5 malformed --target and --solve values exit 2', () => {
  for (const bad of ['', 'sixty', '-4', '0']) {
    const a = run('estimate-measure.js', ['Verdana', '--target', bad]);
    assert.equal(a.status, 2, `--target ${bad}: ${a.stdout}`);
    assert.match(a.stderr, /--target/, `--target ${bad}: ${a.stderr}`);
    const b = run('measure-line.js', ['--css', path.join(FIX, 'verdana.css'), '--solve', bad]);
    assert.equal(b.status, 2, `--solve ${bad}: ${b.stdout}`);
    assert.match(b.stderr, /--solve/, `--solve ${bad}: ${b.stderr}`);
  }
});

test('M6 the measure finding and SKILL.md name both solvers', () => {
  const audit = fs.readFileSync(path.join(SCRIPTS, 'page-audit.js'), 'utf8');
  const fix = /'MT-MEASURE-LONG'[^\n]*/.exec(audit)[0];
  assert.match(fix, /--solve/);
  const skill = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
  assert.match(skill, /measure-line\.js[^\n]*--solve/);
  assert.match(skill, /estimate-measure\.js[^\n]*--target/);
});
