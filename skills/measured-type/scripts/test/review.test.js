// Spec 0025: trust fixes from the 5 November review. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
// The repository root in a checkout; an installed copy has no README or examples there.
const ROOT = path.join(__dirname, '..', '..', '..', '..');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));
const { measureLines } = require(path.join(SCRIPTS, 'measure-line.js'));
const { PY, EXAMPLES, fontToolsReady } = require('./helpers.js');

const FIX = path.join(__dirname, 'audit', 'r25');
const noBrowser = { ...process.env, MT_NO_PLAYWRIGHT: '1' };
const node = (script, args, opts = {}) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], { encoding: 'utf8', ...opts });
// For a CLI run against a server this process hosts: spawnSync would block the event loop and starve the server.
const nodeAsync = (script, args) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(SCRIPTS, script), ...args], { encoding: 'utf8' });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  child.on('close', (status) => resolve({ status, stdout, stderr }));
});
const inRepo = fs.existsSync(path.join(ROOT, 'CONTRIBUTING.md')) && fs.existsSync(path.join(ROOT, 'skills', 'measured-type', 'SKILL.md'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-review-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const run = (name) => audit(path.join(FIX, name), { browser });
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));
const measure = async (file, selector) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => document.fonts.ready);
    return await page.evaluate(measureLines, selector);
  } finally {
    await page.close();
  }
};

test('R1 a page with lang="en_US" is audited to the end and reports MT-LANG', async () => {
  const r = await run('r1-lang-underscore.html');
  assert.ok(find(r, 'MT-LANG', 'MEDIUM').some((f) => /en_US/.test(f.measured)), JSON.stringify(r.findings));
});

const serve = (status, body) => new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
  });
  server.listen(0, '127.0.0.1', () => resolve(server));
});

test('R2 a response of 400 or above is an error that names the status, not an audited page', async () => {
  const server = await serve(404, '<!doctype html><html lang="en"><body><p>Not found</p></body></html>');
  try {
    const url = `http://127.0.0.1:${server.address().port}/missing`;
    await assert.rejects(audit(url, { browser }), /404/);
    const cli = await nodeAsync('page-audit.js', [url]);
    assert.equal(cli.status, 2, cli.stdout);
    assert.match(cli.stderr, /404/);
    assert.doesNotMatch(cli.stdout, /Verdict/);
  } finally {
    server.close();
  }
});

test('R3 light text on an unpainted color-scheme: dark page is not MT-CONTRAST; #999 on an unpainted light page still is', async () => {
  const dark = await run('r3-dark-scheme.html');
  assert.equal(find(dark, 'MT-CONTRAST').length, 0, JSON.stringify(find(dark, 'MT-CONTRAST')));
  const light = await run('r3-light-unpainted.html');
  const hits = find(light, 'MT-CONTRAST', 'HIGH');
  assert.ok(hits.some((f) => /2\.8\d:1/.test(f.measured) && /rgb\(255, 255, 255\)/.test(f.measured)), JSON.stringify(light.findings));
});

test('R4 an inline-block child is part of its paragraph\'s lines: #badge measures like #plain', async () => {
  const file = path.join(FIX, 'r4-inline-block.html');
  const plain = await measure(file, '#plain');
  const badge = await measure(file, '#badge');
  assert.ok(plain.fullLines >= 4, JSON.stringify(plain));
  for (const k of ['fullLines', 'avgCharsPerLine', 'minCharsPerLine', 'maxCharsPerLine']) {
    assert.equal(badge[k], plain[k], `${k}: badge ${badge[k]}, plain ${plain[k]}`);
  }
});

test('R5 without a browser and without --lite the CLI prints the lite report and exits 3, naming the install command', () => {
  const file = path.join(FIX, 'r3-light-unpainted.html');
  const fallback = node('page-audit.js', [file], { env: noBrowser });
  assert.equal(fallback.status, 3, `${fallback.stdout}\n${fallback.stderr}`);
  assert.match(fallback.stdout, /Lite mode/);
  assert.match(fallback.stderr, /npx playwright install chromium/);
  const asked = node('page-audit.js', [file, '--lite'], { env: noBrowser });
  assert.equal(asked.status, 0, `${asked.stdout}\n${asked.stderr}`);
});

test('R6 measure-line --css with a missing stylesheet exits 2 and names the file', () => {
  const r = node('measure-line.js', ['--css', path.join(tmp, 'nope.css')]);
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /no such file/);
  assert.doesNotMatch(r.stdout, /chars\/line/);
});

test('R7 a selector matching mixed sizes takes its figures from the size that sets most lines and lists every size', async () => {
  const para = `<p>${'The measure is the length of a line, counted here in full lines. '.repeat(4)}</p>`;
  const html = write('r7.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    body { margin: 2rem; font-family: Georgia, serif; line-height: 1.5; }
    .prose { inline-size: 558px; }
    p { font-size: 18px; margin: 0 0 1em; }
    .kicker { font-size: 13px; }
    .standfirst { font-size: 21px; }
  </style></head><body><div class="prose"><p class="kicker">Section one</p><p class="standfirst">${'A standfirst that runs a little long. '.repeat(3)}</p>${para.repeat(4)}</div></body></html>`);
  const m = await measure(html, 'p');
  assert.equal(m.fontSizePx, 18, JSON.stringify(m));
  assert.equal(m.mixedSizes, true);
  assert.deepEqual(m.fontSizes, [13, 18, 21]);
  assert.ok(Math.abs(m.inlineSizeInEm - 31) < 0.1, `em ${m.inlineSizeInEm}`);
  const cli = node('measure-line.js', [html, 'p']);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /declared .*18px/);
  assert.match(cli.stdout, /13px/);
  assert.match(cli.stdout, /21px/);
});

test('R8 a pane that scrolls on the clipped axis is not MT-TEXT-SPACING; a box with overflow hidden still is', async () => {
  const hits = find(await run('r8-scroll-pane.html'), 'MT-TEXT-SPACING');
  assert.ok(!hits.some((f) => /pane/.test(f.location)), JSON.stringify(hits));
  assert.ok(hits.some((f) => f.severity === 'HIGH' && /div\.box/.test(f.location)), `the hidden box is not reported: ${JSON.stringify(hits)}`);
});

test('R9 the fontTools probe refuses an empty namespace package and the scripts name the import error they hit', (t) => {
  // A regular package anywhere on the path beats a namespace portion, so the trap can only be staged
  // on a Python that has no fontTools at all: the system python3, as on the machine that hit it.
  const bare = 'python3';
  if (spawnSync(bare, ['--version'], { encoding: 'utf8' }).status !== 0) return t.skip('no python3 on PATH');
  if (fontToolsReady(bare)) return t.skip('python3 has fontTools, so the namespace trap cannot be staged');
  const fake = path.join(tmp, 'fakesite');
  fs.mkdirSync(path.join(fake, 'fontTools'), { recursive: true });
  const env = { ...process.env, PYTHONPATH: fake };
  const probe = spawnSync(bare, ['-c', 'import fontTools'], { encoding: 'utf8', env });
  assert.equal(probe.status, 0, 'the empty directory should import as a namespace package, which is the trap');
  assert.equal(fontToolsReady(bare, env), false);
  const r = spawnSync(bare, [path.join(SCRIPTS, 'font-features.py'), 'nothing.ttf'], { encoding: 'utf8', env });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /cannot import name|No module named/);
  assert.match(r.stderr, /venv/);
  assert.doesNotMatch(r.stderr, /^fontTools is missing: pip install fonttools brotli$/m);
});

test('R10 Playwright is a runtime dependency and the packages declare the Node they need', () => {
  const skill = JSON.parse(fs.readFileSync(path.join(SCRIPTS, '..', 'package.json'), 'utf8'));
  assert.ok(skill.dependencies && skill.dependencies.playwright, 'playwright is not in dependencies');
  assert.ok(!skill.devDependencies || !skill.devDependencies.playwright, 'playwright is still a devDependency');
  assert.match((skill.engines && skill.engines.node) || '', />=\s*20/);
  if (inRepo) {
    const root = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match((root.engines && root.engines.node) || '', />=\s*20/);
  }
});

test('R12 the contributor docs count the fontTools-backed tests and the skip reasons agree', (t) => {
  const others = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js') && f !== path.basename(__filename));
  const tests = others.map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  assert.doesNotMatch(tests, /'test font missing'/, 'one spelling: test fonts missing');
  if (!inRepo) return t.skip('repository files only');
  for (const f of ['AGENTS.md', 'CONTRIBUTING.md']) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(text, /four (font-metric )?tests/, f);
    // The count is what `MT_PYTHON=/usr/bin/python3 npm test` (a Python with no fontTools) reports as skipped:
    // eleven since spec 0032 (D1 to D3 and the D1 override check, R11, N3, N4, F3, T7, T8, T9).
    assert.match(text, /eleven/, f);
  }
});

test('R13 the README install section gives the virtual environment recipe, MT_PYTHON and what to expect', (t) => {
  if (!inRepo) return t.skip('repository files only');
  const text = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(text, /python3 -m venv/);
  assert.match(text, /MT_PYTHON/);
  assert.match(text, /150 MB/);
  assert.doesNotMatch(text, /^pip install fonttools brotli$/m, 'the bare pip line fails on current Pythons');
});

test('R14 lint-css --help prints usage and exits 0; an unknown flag is an error that names it', () => {
  const help = node('lint-css.js', ['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /usage: lint-css\.js/);
  const bad = node('lint-css.js', ['--nope', 'x.css']);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown option --nope/);
});

test('R15 lint-css on an HTML file lists the linked stylesheets it did not open under Not verified', () => {
  const html = write('r15.html', '<!doctype html><html lang="en"><head><link rel="stylesheet" href="r15.css"><link rel="stylesheet" href="https://example.com/x.css"></head><body><p>Text.</p></body></html>');
  const note = lint([html]).notVerified.join(' ');
  assert.match(note, /r15\.css/);
  assert.match(note, /example\.com\/x\.css/);
  assert.match(note, /--lite/);
});

test('R16 type-scale with no --fluid-from keeps the body and lower steps fixed and only the top two fluid', () => {
  const r = node('type-scale.js', ['--json']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.steps[0].css, '1.125rem');
  for (const s of out.steps.slice(0, -2)) assert.match(s.css, /^[\d.]+rem$/, `step ${s.step} should be fixed: ${s.css}`);
  for (const s of out.steps.slice(-2)) assert.match(s.css, /^clamp\(/, `step ${s.step} should be fluid: ${s.css}`);
});

test('R17 the editorial after example lints clean', (t) => {
  const css = path.join(EXAMPLES, 'editorial', 'after.css');
  if (!fs.existsSync(css)) return t.skip('examples/ is not shipped with an installed skill');
  const r = lint([css]);
  assert.equal(r.findings.length, 0, JSON.stringify(r.findings));
});
