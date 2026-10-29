// Spec 0005: standards alignment (S), robustness (R) and pinned behaviour (T).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const SKILL = path.join(__dirname, '..', '..');
const SCRIPTS = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'audit', 'p1');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));
const read = (p) => fs.readFileSync(path.join(SKILL, p), 'utf8');

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const cache = new Map();
const run = (name) => {
  if (!cache.has(name)) cache.set(name, audit(path.join(FIX, name), { browser }));
  return cache.get(name);
};
const find = (r, rule) => r.findings.filter((f) => f.rule === rule);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-p1-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const lintOne = (name, text, opts) => lint([write(name, text)], opts);
const node = (script, args) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], { encoding: 'utf8' });

// ---------- S: standards ----------

test('S1 a zoom-only cut is MT-TRUNCATE HIGH; a title no longer exempts a cut; clip counts; a disclosure does', async () => {
  const hits = find(await run('s1-trunc.html'), 'MT-TRUNCATE');
  const by = (re) => hits.filter((f) => re.test(f.location));
  assert.deepEqual(by(/zoom/).map((f) => f.severity), ['HIGH'], JSON.stringify(hits));
  assert.deepEqual(by(/titled/).map((f) => f.severity), ['LOW'], JSON.stringify(hits));
  assert.match(by(/titled/)[0].measured, /title/);
  assert.deepEqual(by(/clip/).map((f) => f.severity), ['LOW'], JSON.stringify(hits));
  assert.deepEqual(hits.filter((f) => /summary|details/.test(f.location)), [], JSON.stringify(hits));
});

test('S2 a px root size is MT-ROOT-PX MEDIUM, a convention rather than a WCAG failure', () => {
  const hit = lintOne('root.css', 'html { font-size: 14px; }\n').findings.filter((f) => f.rule === 'MT-ROOT-PX');
  assert.deepEqual(hit.map((f) => f.severity), ['MEDIUM']);
  assert.match(read('references/audit.md'), /\| MT-ROOT-PX \| MEDIUM \|/);
});

test('S3 APCA is described as advisory and printed as advisory', () => {
  assert.match(read('references/screen-and-ui.md'), /APCA[^.]*advisory/i);
  assert.match(read('references/screen-and-ui.md'), /WCAG 2[^.]*conformance/i);
  assert.match(read('scripts/page-audit.js'), /APCA Lc \$\{[^}]+\} \(advisory\)/);
});

test('S4 text-box trim is not offered as part of the line grid', () => {
  const row = read('SKILL.md').split('\n').find((l) => l.startsWith('| 2.2.2 |'));
  assert.doesNotMatch(row, /text-box/);
  assert.match(read('references/rules.md'), /text-box[^.]*alternatives|alternatives[^.]*text-box/i);
});

// ---------- R: robustness ----------

test('R1 an apostrophe in a block comment and an unquoted url(//...) do not corrupt Sass parsing', () => {
  const r = lintOne('c.scss', [
    "/* don't touch the rhythm here */",
    '// p { line-height: 1; }',
    '@font-face { font-family: X; src: url(//cdn.example.com/x.woff2); font-display: swap; }',
    'p { line-height: 1.1; }',
    '',
  ].join('\n'));
  assert.deepEqual(r.findings.map((f) => `${f.line} ${f.rule}`), ['4 MT-LH-TIGHT']);
});

test('R2 tracking set in a second rule for the same selector is seen; tracking-wide is not enough', () => {
  const css = lintOne('caps.css', '.eyebrow { text-transform: uppercase; }\n.eyebrow { letter-spacing: 0.06em; }\n.tag { text-transform: uppercase; }\n');
  assert.deepEqual(css.findings.filter((f) => f.rule === 'MT-CAPS-TRACKING').map((f) => f.line), [3]);
  const tw = lintOne('t.jsx', '<span className="uppercase tracking-wide">a</span>\n<span className="uppercase tracking-wider">b</span>\n');
  const hits = tw.findings.filter((f) => f.rule === 'MT-CAPS-TRACKING');
  assert.deepEqual(hits.map((f) => f.line), [1]);
  assert.match(hits[0].fix, /tracking-wider/);
});

test('R2 the rendered check flags capitals tracked under 0.03em, not only at 0', async () => {
  const hits = find(await run('r2-caps.html'), 'MT-CAPS-TRACKING');
  assert.deepEqual(hits.map((f) => f.location), ['p.thin']);
});

test('R3 --diff counts untracked files and multi-line declarations, and needs a ref', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-git-'));
  const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  fs.writeFileSync(path.join(repo, 'a.css'), 'h1 {\n  font-size: clamp(\n    1rem,\n    1vw,\n    2rem\n  );\n}\n');
  git('add', '.');
  git('commit', '-qm', 'base');
  fs.writeFileSync(path.join(repo, 'a.css'), 'h1 {\n  font-size: clamp(\n    1rem,\n    5vw,\n    9rem\n  );\n}\n');
  fs.writeFileSync(path.join(repo, 'new.css'), 'h2 { font-size: 5vw; }\n');
  const cwd = process.cwd();
  process.chdir(repo);
  try {
    const r = lint([repo], { diff: 'HEAD' });
    const files = r.findings.map((f) => path.basename(f.file)).sort();
    assert.ok(files.includes('new.css'), JSON.stringify(r.findings));
    assert.ok(files.includes('a.css'), JSON.stringify(r.findings));
  } finally {
    process.chdir(cwd);
  }
  const noRef = node('lint-css.js', [repo, '--diff']);
  assert.equal(noRef.status, 2, noRef.stdout + noRef.stderr);
});

test('R4 bad arguments exit 2 with a message instead of printing garbage', () => {
  for (const args of [['--steps', 'abc'], ['--ratio', 'abc'], ['--viewports', '360'], ['--base', '1rem:1.125'], ['--fluid-from', 'x']]) {
    const r = node('type-scale.js', args);
    assert.equal(r.status, 2, `type-scale ${args.join(' ')}: ${r.stdout}`);
    assert.doesNotMatch(r.stdout, /NaN|Infinity/);
  }
  const est = node('estimate-measure.js', ['Arial', '34em', '--size']);
  assert.equal(est.status, 2, est.stdout);
  const pa = node('page-audit.js', ['--width', '375', path.join(FIX, 'r2-caps.html')]);
  assert.equal(pa.status, 2, pa.stdout);
  assert.match(pa.stderr, /unknown option --width/);
  const missing = node('measure-line.js', [path.join(tmp, 'nope.html')]);
  assert.equal(missing.status, 2, missing.stderr);
  const nomatch = node('measure-line.js', [path.join(FIX, 'r2-caps.html'), '.nothing-here']);
  assert.equal(nomatch.status, 2, nomatch.stderr);
  const badWidth = node('measure-line.js', [path.join(FIX, 'r2-caps.html'), 'p', '--width', 'abc']);
  assert.equal(badWidth.status, 2, badWidth.stderr);
  assert.doesNotMatch(badWidth.stderr, /at .*\.js:\d+/);
});

// ---------- T: pinned behaviour ----------

test('T1 a number column whose 1 and 0 differ by about 10% is MT-TABULAR', async () => {
  const hit = find(await run('t1-tabular.html'), 'MT-TABULAR');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  const pct = Number(/differ by ([\d.]+)%/.exec(hit[0].measured)[1]);
  assert.ok(pct > 2 && pct < 20, hit[0].measured);
});

test('T2 MT-NUM-ALIGN fires when half or more of a column is off, not for one cell in three', async () => {
  const hits = find(await run('t2-align.html'), 'MT-NUM-ALIGN');
  assert.deepEqual(hits.map((f) => f.location), ['table.two column 2']);
});
