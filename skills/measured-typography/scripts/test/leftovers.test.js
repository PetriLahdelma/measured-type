// Spec 0030: what the 5 November code review left open. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const { lint, evaluator, toMarkdown } = require(path.join(SCRIPTS, 'lint-css.js'));
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-leftovers-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const write = (name, text) => { const p = path.join(tmp, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };
const rules = (r) => r.findings.map((f) => f.rule);

test('X1 a comment opener inside a string does not swallow the rules after it', () => {
  const r = lint([write('x1.css', '.a::before { content: "/*"; }\n.b { line-height: 22px; }\n.c::after { content: "*/"; }\n')]);
  assert.ok(r.findings.some((f) => f.rule === 'MT-LH-LENGTH' && f.line === 2), JSON.stringify(r.findings));
});

test('X2 a fluid size the linter cannot evaluate is listed under Not verified with its declaration', () => {
  const r = lint([write('x2.css', 'h1 { font-size: calc(2vw + 1lh); }\nh2 { font-size: clamp(1rem, 1rem + 2vw + 1cap, 4rem); }\n')]);
  const note = r.notVerified.join(' ');
  assert.match(note, /x2\.css:1/);
  assert.match(note, /x2\.css:2/);
  assert.match(note, /lh/);
  assert.match(note, /cap/);
});

test('X3 vmin and vmax follow the shorter and longer side of the viewport model', () => {
  assert.equal(evaluator('2vmin')(1280), evaluator('2vh')(1280));
  assert.equal(evaluator('2vmax')(1280), evaluator('2vw')(1280));
});

test('X4 straight quotes written as character references are found in HTML text', () => {
  const r = lint([write('x4.html', '<!doctype html><html lang="en"><body><p>She said &quot;hello&quot; and it&#39;s fine.</p></body></html>')]);
  assert.ok(r.findings.some((f) => f.rule === 'MT-QUOTES' && f.line === 1), JSON.stringify(r.findings));
});

test('X5 a Tailwind arbitrary value with a colon inside its brackets is read', () => {
  const r = lint([write('x5.html', '<!doctype html><html lang="en"><body><h1 class="md:text-[length:5vw]">Title</h1></body></html>')]);
  assert.ok(rules(r).includes('MT-ZOOM-VW'), JSON.stringify(r.findings));
});

test('X6 a symbolic link that loops is skipped and listed, and the rest is linted', () => {
  const dir = path.join(tmp, 'x6');
  write('x6/a.css', 'p { line-height: 22px; }\n');
  fs.symlinkSync('.', path.join(dir, 'self'));
  const run = spawnSync(process.execPath, [path.join(SCRIPTS, 'lint-css.js'), dir, '--json'], { encoding: 'utf8' });
  assert.notEqual(run.status, 2, run.stderr);
  const r = JSON.parse(run.stdout);
  assert.equal(r.findings.filter((f) => f.rule === 'MT-LH-LENGTH').length, 1, JSON.stringify(r.findings));
  assert.match(r.notVerified.join(' '), /link/);
});

test('X7 a multi-line declaration stays in one table row, and a far location is printed whole', () => {
  const file = write('x7.css', 'h1 {\n  font-size: clamp(\n    1rem,\n    4vw,\n    5rem\n  );\n}\n');
  const md = toMarkdown(lint([file]));
  const row = md.split('\n').find((l) => l.includes('MT-ZOOM'));
  assert.ok(row, md);
  assert.match(row, /\|\s*$/, `the row breaks across lines:\n${md}`);
  assert.ok(row.includes(file) || !path.relative(process.cwd(), file).startsWith('..'), row);
});

test('X8 @font-face rules in an imported stylesheet are read by the rendered audit, or listed when unreadable', async () => {
  write('x8/fonts.css', '@font-face { font-family: "Imported Face"; src: url("missing.woff2") format("woff2"); }\n');
  const page = write('x8/page.html', '<!doctype html><html lang="en"><head><style>@import url("fonts.css"); p { font-family: "Imported Face", serif; }</style></head><body><main><p>Text in an imported face that has no font-display, which the audit should report as it does for a face in the page itself.</p></main></body></html>');
  // Over HTTP the imported sheet is same-origin and readable.
  const server = http.createServer((req, res) => {
    const file = path.join(tmp, 'x8', req.url === '/' ? 'page.html' : req.url.slice(1));
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': file.endsWith('.css') ? 'text/css' : 'text/html' });
    res.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const r = await audit(`http://127.0.0.1:${server.address().port}/`, { browser });
    assert.ok(r.findings.some((f) => f.rule === 'MT-FONT-DISPLAY' && /Imported Face/.test(f.location)), JSON.stringify(r.findings.map((f) => f.rule)));
  } finally {
    server.close();
  }
  // From a file, Chromium treats the imported sheet as another origin: it is named under Not verified.
  const local = await audit(page, { browser });
  assert.ok(local.findings.some((f) => f.rule === 'MT-FONT-DISPLAY') || local.notVerified.some((n) => /fonts\.css/.test(n)), JSON.stringify(local.notVerified));
});

test('X9 text in shadow roots and iframes is listed under Not verified with its count', async () => {
  const page = write('x9.html', `<!doctype html><html lang="en"><body><main><p>Ordinary text in the document itself, long enough to count as reading text for the audit's own checks.</p>
<div id="host"></div><iframe srcdoc="<p>Framed text</p>"></iframe>
<script>document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<p>Text inside a shadow root</p>';</script></main></body></html>`);
  const note = (await audit(page, { browser })).notVerified.join(' ');
  assert.match(note, /1 shadow root/);
  assert.match(note, /1 iframe/);
});

test('X10 type-scale refuses ratios at or below 1, bases at or below 0 and step counts outside 1 to 12', () => {
  for (const args of [['--ratio', '0:0'], ['--ratio', '1:1.2'], ['--base', '0rem:1rem'], ['--steps', '0'], ['--steps', '2.5'], ['--steps', '40']]) {
    const run = spawnSync(process.execPath, [path.join(SCRIPTS, 'type-scale.js'), ...args], { encoding: 'utf8' });
    assert.equal(run.status, 2, `${args.join(' ')}: ${run.stdout}`);
    assert.doesNotMatch(run.stdout, /NaN/);
  }
});
