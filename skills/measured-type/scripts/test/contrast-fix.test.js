// Spec 0013: scripts/contrast-fix.js, the nearest colour that reaches a ratio.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPTS = path.join(__dirname, '..');
const SKILL = path.join(SCRIPTS, '..');
const run = (args) => spawnSync(process.execPath, [path.join(SCRIPTS, 'contrast-fix.js'), ...args], { encoding: 'utf8' });
const fixJson = (args) => {
  const r = run([...args, '--json']);
  return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, stderr: r.stderr };
};
const cf = () => require(path.join(SCRIPTS, 'contrast-fix.js'));

test('C1 the nearest passing colour reaches 4.5:1 and is minimal', () => {
  const { status, out } = fixJson(['#888', '#fff']);
  assert.equal(status, 0);
  assert.match(out.color, /^#[0-9a-f]{6}$/);
  assert.ok(out.ratio >= 4.5, JSON.stringify(out));
  assert.equal(typeof out.apcaLc, 'number');
  const { parse, toOklch, fromOklch, ratio } = cf();
  const [L, C, h] = toOklch(parse(out.color));
  const [L0] = toOklch(parse('#888'));
  const back = fromOklch([L + 0.01 * Math.sign(L0 - L), C, h]);
  assert.ok(ratio(back, parse('#fff')) < 4.5, 'a colour 0.01 closer to the original still passes, so the result is not minimal');
});

test('C2 the hue is kept and chroma lowered only when needed', () => {
  const { parse, toOklch } = cf();
  for (const [text, ground] of [['#ff7a00', '#ffffff'], ['#3d7bff', '#ffffff'], ['#e0457b', '#ffffff']]) {
    const { status, out } = fixJson([text, ground]);
    assert.equal(status, 0, `${text}: ${JSON.stringify(out)}`);
    const [, C0, h0] = toOklch(parse(text));
    const [, C1, h1] = toOklch(parse(out.color));
    const dh = Math.abs(((h1 - h0 + 540) % 360) - 180);
    assert.ok(dh <= 3, `${text} -> ${out.color}: hue moved ${dh.toFixed(1)} degrees`);
    assert.ok(C1 <= C0 + 0.002, `${text}: chroma rose`);
  }
});

test('C3 on a dark ground the text moves lighter', () => {
  const { parse, toOklch } = cf();
  const { status, out } = fixJson(['#555', '#111']);
  assert.equal(status, 0);
  assert.ok(toOklch(parse(out.color))[0] > toOklch(parse('#555'))[0], JSON.stringify(out));
  assert.ok(out.ratio >= 4.5);
});

test('C4 --large, --ratio and --move ground', () => {
  const large = fixJson(['#999', '#fff', '--large']).out;
  assert.ok(large.ratio >= 3 && large.ratio < 4.5, JSON.stringify(large));
  const seven = fixJson(['#777', '#fff', '--ratio', '7']).out;
  assert.ok(seven.ratio >= 7, JSON.stringify(seven));
  const ground = fixJson(['#fff', '#999', '--move', 'ground']).out;
  assert.equal(ground.moved, 'ground');
  assert.ok(ground.ratio >= 4.5, JSON.stringify(ground));
});

test('C5 an unreachable ratio is reported with the best one and exits 1', () => {
  const r = fixJson(['#777', '#808080', '--ratio', '7']);
  assert.equal(r.status, 1);
  assert.equal(r.out.color, null);
  assert.ok(r.out.best > 1 && r.out.best < 7, JSON.stringify(r.out));
});

test('C6 hex, rgb() and oklch() are read, and a malformed colour exits 2', () => {
  for (const text of ['#888888', 'rgb(136, 136, 136)', 'oklch(0.6 0 0)']) assert.equal(run([text, '#fff']).status, 0, text);
  for (const bad of ['#88', 'grey-ish', 'rgb(1,2)']) {
    const r = run([bad, '#fff']);
    assert.equal(r.status, 2, bad);
    assert.ok(r.stderr.length > 0, bad);
  }
});

test('C7 MT-CONTRAST findings name the nearest passing colour', async () => {
  const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
  const r = await audit(path.join(__dirname, 'audit', 'contrast.html'));
  const hits = r.findings.filter((f) => f.rule === 'MT-CONTRAST');
  assert.ok(hits.length >= 1);
  const { nearestPassing, parse } = cf();
  const want = nearestPassing({ text: parse('#999'), ground: parse('#fff'), ratio: 4.5 }).color;
  assert.ok(hits.some((f) => f.fix.includes(want)), `${want} not in ${hits.map((f) => f.fix).join(' | ')}`);
});

test('C8 SKILL.md names contrast-fix.js', () => {
  assert.match(fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8'), /contrast-fix\.js/);
});
