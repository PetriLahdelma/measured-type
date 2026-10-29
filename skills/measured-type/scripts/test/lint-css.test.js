// Spec 0001 part B: scripts/lint-css.js. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'lint-css.js');
const EXAMPLES = path.join(__dirname, '..', '..', '..', '..', 'examples', 'editorial');
// examples/ lives in the repository; an installed copy of the skill does not ship it.
const noExamples = !fs.existsSync(EXAMPLES) && 'examples/ is not shipped with an installed skill';
const { lint } = require(SCRIPT);

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-lint-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}
const run = (content, name = 'a.css', opts = {}) => lint([tmpFile(name, content)], opts).findings;
const has = (fs_, rule, severity) => fs_.some((f) => f.rule === rule && (!severity || f.severity === severity));
const cli = (args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

test('B1 pure vw font-size is MT-ZOOM-VW HIGH at its line', () => {
  const f = run('h1 {\n  color: red;\n  font-size: 4vw;\n}\n');
  const hit = f.find((x) => x.rule === 'MT-ZOOM-VW');
  assert.ok(hit, 'expected MT-ZOOM-VW');
  assert.equal(hit.severity, 'HIGH');
  assert.equal(hit.line, 3);
});

test('B2 a modest clamp is judged by evaluation: not ZOOM-VW, ZOOM-RANGE LOW', () => {
  const f = run('h1 { font-size: clamp(2.5rem, 2.0833rem + 1.8519vw, 3.75rem); }');
  assert.ok(!has(f, 'MT-ZOOM-VW'), 'should not be ZOOM-VW');
  assert.ok(has(f, 'MT-ZOOM-RANGE', 'LOW'), 'expected ZOOM-RANGE LOW');
});

test('B2 a clamp whose rem bounds still let it reach 2x by 500% is not HIGH', () => {
  const f = run('h1 { font-size: clamp(2rem, 4vw, 4rem); }');
  assert.ok(!has(f, 'MT-ZOOM-VW', 'HIGH'));
});

test('B3 size tokens in custom properties are evaluated like font-size', () => {
  const f = run(':root { --font-size-hero: 5vw; --brand-color: #b33a32; }');
  assert.ok(has(f, 'MT-ZOOM-VW', 'HIGH'));
});

test('B4 px root size is MT-ROOT-PX HIGH, 62.5% is LOW', () => {
  assert.ok(has(run('html { font-size: 10px; }'), 'MT-ROOT-PX', 'HIGH'));
  assert.ok(has(run(':root { font-size: 62.5%; }'), 'MT-ROOT-PX', 'LOW'));
  assert.ok(!has(run('html { font-size: 100%; }'), 'MT-ROOT-PX'));
});

test('B5 length line-height on reading text is MT-LH-LENGTH MEDIUM; heading on --line is not', () => {
  assert.ok(has(run('p { line-height: 22px; }'), 'MT-LH-LENGTH', 'MEDIUM'));
  assert.ok(!has(run('.prose h2 { line-height: var(--line); }'), 'MT-LH-LENGTH'));
});

test('B6 tight unitless body leading is MT-LH-TIGHT MEDIUM', () => {
  assert.ok(has(run('body { line-height: 1.2; }'), 'MT-LH-TIGHT', 'MEDIUM'));
  assert.ok(!has(run('body { line-height: 1.5; }'), 'MT-LH-TIGHT'));
});

test('B7 justify without hyphens is MT-JUSTIFY MEDIUM; with hyphens it is not', () => {
  assert.ok(has(run('.prose { text-align: justify; }'), 'MT-JUSTIFY', 'MEDIUM'));
  assert.ok(!has(run('.prose { text-align: justify; hyphens: auto; }'), 'MT-JUSTIFY'));
});

test('B8 fixed px width on a text container is MT-WIDTH-PX MEDIUM', () => {
  assert.ok(has(run('.page { width: 960px; }'), 'MT-WIDTH-PX', 'MEDIUM'));
});

test('B9 a ch measure is MT-MEASURE-CH LOW', () => {
  assert.ok(has(run('.prose { max-width: 66ch; }'), 'MT-MEASURE-CH', 'LOW'));
});

test('B10 small caps with synthesis allowed is MT-SMALLCAPS-SYNTH MEDIUM unless synthesis is off', () => {
  assert.ok(has(run('abbr { font-variant: small-caps; }'), 'MT-SMALLCAPS-SYNTH', 'MEDIUM'));
  assert.ok(!has(run('abbr { font-variant-caps: all-small-caps; } .prose { font-synthesis: none; }'), 'MT-SMALLCAPS-SYNTH'));
  assert.ok(!has(run('abbr { font-variant-caps: all-small-caps; font-synthesis-small-caps: none; }'), 'MT-SMALLCAPS-SYNTH'));
});

test('B11 font-feature-settings for figures is MT-FFS LOW', () => {
  assert.ok(has(run('td { font-feature-settings: "tnum"; }'), 'MT-FFS', 'LOW'));
});

test('B12 physical sides are MT-PHYSICAL LOW, HIGH with --rtl', () => {
  assert.ok(has(run('ul { margin-left: 1em; }'), 'MT-PHYSICAL', 'LOW'));
  assert.ok(has(run('ul { margin-left: 1em; }', 'a.css', { rtl: true }), 'MT-PHYSICAL', 'HIGH'));
  assert.ok(!has(run('ul { margin-inline-start: 1em; }'), 'MT-PHYSICAL'));
});

test('B13 widows of 1 is MT-WIDOWS LOW', () => {
  assert.ok(has(run('@media print { p { widows: 1; } }'), 'MT-WIDOWS', 'LOW'));
});

test('B14 @font-face without font-display is MT-FONT-DISPLAY LOW', () => {
  assert.ok(has(run('@font-face { font-family: X; src: url(x.woff2); }'), 'MT-FONT-DISPLAY', 'LOW'));
  assert.ok(!has(run('@font-face { font-family: X; src: url(x.woff2); font-display: swap; }'), 'MT-FONT-DISPLAY'));
});

test('B15 HTML viewport, minus, range, quotes; code and dates are ignored', () => {
  const html = [
    '<!doctype html><html><head>',
    '<meta name="viewport" content="width=device-width, user-scalable=no">',
    '<style>p { color: #222; }</style></head><body>',
    '<p>Change was -12% from 1990-2004, published 2026-10-29.</p>',
    '<p>She said "hello" and it\'s fine.</p>',
    '<pre><code>x = -1; y = "a"; range 1-2</code></pre>',
    '</body></html>',
  ].join('\n');
  const f = run(html, 'page.html');
  assert.ok(has(f, 'MT-VIEWPORT-ZOOM', 'HIGH'));
  assert.ok(has(f, 'MT-MINUS'));
  const ranges = f.filter((x) => x.rule === 'MT-RANGE');
  assert.equal(ranges.length, 1, `one range expected, got ${JSON.stringify(ranges)}`);
  assert.equal(ranges[0].line, 4);
  assert.ok(has(f, 'MT-QUOTES'));
  assert.ok(!f.some((x) => x.line === 6), 'nothing inside pre/code');
});

test('B16 comments and strings do not break parsing or line numbers', () => {
  const css = '/* p { line-height: 30px; } */\n.a::before { content: "{ ; }"; }\n\np { line-height: 22px; }\n';
  const f = run(css).filter((x) => x.rule === 'MT-LH-LENGTH');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 4);
});

test('B17 --diff reports only lines changed since the ref', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-diff-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 's.css'), 'p { line-height: 22px; }\n');
  git('add', '.');
  git('commit', '-qm', 'base');
  fs.appendFileSync(path.join(dir, 's.css'), 'li { line-height: 20px; }\n');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const f = lint(['s.css'], { diff: 'HEAD' }).findings.filter((x) => x.rule === 'MT-LH-LENGTH');
    assert.deepEqual(f.map((x) => x.line), [2]);
  } finally {
    process.chdir(cwd);
  }
});

test('B18 exit code and verdict follow the HIGH findings', () => {
  const bad = cli([tmpFile('a.css', 'h1 { font-size: 4vw; }')]);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /Verdict: Block/);
  assert.match(bad.stdout, /\| HIGH \| MT-ZOOM-VW \|/);
  const ok = cli([tmpFile('a.css', 'p { line-height: 1.5; }')]);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /Approve/);
});

test('A4 repeated root causes collapse into one row listing every location', () => {
  const out = cli([tmpFile('a.css', 'p { line-height: 22px; }\np { line-height: 22px; }\n')]).stdout;
  const rows = out.split('\n').filter((l) => l.includes('MT-LH-LENGTH'));
  assert.equal(rows.length, 1);
  assert.match(rows[0], /a\.css:1`, `.*a\.css:2/);
});

test('B19 no HIGH or MEDIUM findings on the good example', { skip: noExamples }, () => {
  const f = lint([path.join(EXAMPLES, 'after.css'), path.join(EXAMPLES, 'after.html')]).findings;
  const serious = f.filter((x) => x.severity !== 'LOW');
  assert.deepEqual(serious, []);
});

test('B20 the known bad example yields its expected rules', { skip: noExamples }, () => {
  const f = lint([path.join(EXAMPLES, 'before.css'), path.join(EXAMPLES, 'before.html')]).findings;
  for (const rule of ['MT-ZOOM-VW', 'MT-ROOT-PX', 'MT-LH-TIGHT', 'MT-JUSTIFY', 'MT-MINUS', 'MT-RANGE', 'MT-QUOTES']) {
    assert.ok(has(f, rule), `expected ${rule}`);
  }
});
