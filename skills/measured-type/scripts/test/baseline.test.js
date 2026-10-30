// Spec 0020: strict baseline grid, opt-in.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-baseline-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };

const BODY = `<h2>Harbour timetable</h2>
<p>Ferries leave every hour from the north quay, and the last one waits for the train from the city when it runs late on Sundays and holidays.</p>
<p>Tickets are sold on board.</p>
<h3>Winter</h3>
<p>From November the ferry stops at the island pier only on request.</p>
<p>The kiosk on the quay closes at six.</p>`;

const page = (css) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { margin: 0 2rem; font-family: Georgia, serif; color: #041b23; background: #fff; } ${css}</style>
</head><body><main class="g">${BODY}</main></body></html>`;

// Every block shifted onto an 8px grid with the cap unit; line heights and
// gaps in whole grid units.
const ON_GRID = page(`.g { max-inline-size: 34em; }
.g > * { margin: 0; --u: 0.5rem; --shift: calc((var(--n) * var(--u) - 1cap) / 2);
  line-height: calc(var(--n) * var(--u)); padding-top: var(--shift);
  margin-bottom: calc(var(--b) * var(--u) - var(--shift)); }
.g p { font-size: 1rem; --n: 3; --b: 3; }
.g h2 { font-size: 1.75rem; --n: 4; --b: 2; }
.g h3 { font-size: 1.25rem; --n: 3; --b: 1; }`);

// The usual unitless leading and em margins: even rhythm, no grid.
const FREE = page(`.g { max-inline-size: 34em; font-size: 1rem; line-height: 1.5; }
.g h2 { font-size: 1.75rem; line-height: 1.2; margin: 1.1em 0 0.4em; }
.g h3 { font-size: 1.25rem; line-height: 1.3; margin: 1.3em 0 0.3em; }
.g p { margin: 0 0 0.8em; }`);

// On the grid, except that paragraphs use a 26px line: the first line sits
// on the grid and every later line drifts.
const LONG_LINE = ON_GRID.replace('.g p { font-size: 1rem; --n: 3; --b: 3; }',
  '.g p { font-size: 1rem; --n: 3; --b: 3; line-height: 26px; }');

const drift = (r) => r.findings.filter((f) => f.rule === 'MT-BASELINE-DRIFT');

test('B1 a page set on the grid with the cap shift has no baseline finding', async () => {
  const r = await audit(write('on-grid.html', ON_GRID), { browser, baseline: '8px' });
  assert.deepEqual(drift(r), [], JSON.stringify(drift(r)));
});

test('B1 a page with free leading and em margins drifts off an 8px grid', async () => {
  const r = await audit(write('free.html', FREE), { browser, baseline: '8px' });
  const d = drift(r);
  assert.ok(d.length > 0, 'no drift reported');
  assert.ok(d.every((f) => f.severity === 'MEDIUM'), JSON.stringify(d));
  assert.ok(d.every((f) => /px off/.test(f.measured)), JSON.stringify(d.map((f) => f.measured)));
});

test('B2 the grid unit may be given in rem and the origin is found, not asked for', async () => {
  // Shifting the whole page by 3px moves the grid's origin, not the rhythm.
  const shifted = ON_GRID.replace('<main class="g">', '<main class="g" style="padding-top: 3px">');
  const r = await audit(write('shifted.html', shifted), { browser, baseline: '0.5rem' });
  assert.deepEqual(drift(r), [], JSON.stringify(drift(r)));
});

test('B3 a line-height that is not whole grid units is named as the cause, and blocks it pushes off are not blamed', async () => {
  const r = await audit(write('long-line.html', LONG_LINE), { browser, baseline: '8px' });
  const d = drift(r);
  assert.ok(d.some((f) => /(^| > )p$/.test(f.location) && /line-height 26px/.test(f.measured)), JSON.stringify(d));
  assert.ok(!d.some((f) => /(^| > )h[23]$/.test(f.location) && /line-height/.test(f.measured)), JSON.stringify(d));
});

test('B4 without a grid unit there is no baseline check, and with one every other finding is unchanged', async () => {
  const off = await audit(write('free.html', FREE), { browser });
  assert.deepEqual(drift(off), []);
  const on = await audit(write('free.html', FREE), { browser, baseline: '8px' });
  const rest = (r) => r.findings.filter((f) => f.rule !== 'MT-BASELINE-DRIFT').map((f) => [f.rule, f.location, f.measured]);
  assert.deepEqual(rest(on), rest(off));
});

test('B5 a grid unit that is not a positive px or rem length is an error', async () => {
  await assert.rejects(audit(write('free.html', FREE), { browser, baseline: '8' }), /baseline/);
  await assert.rejects(audit(write('free.html', FREE), { browser, baseline: '-4px' }), /baseline/);
  assert.throws(() => execFileSync(process.execPath, [path.join(SCRIPTS, 'page-audit.js'), write('free.html', FREE), '--baseline', '1em'], { stdio: 'pipe' }),
    (e) => e.status === 2 && /baseline/.test(String(e.stderr)));
});
