// Spec 0006: the remaining tool gaps from council review 2.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'audit', 'gaps');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));
const { estimate, describe } = require(path.join(SCRIPTS, 'estimate-measure.js'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const cache = new Map();
const run = (name) => {
  if (!cache.has(name)) cache.set(name, audit(path.join(FIX, name), { browser }));
  return cache.get(name);
};
const find = (r, rule) => r.findings.filter((f) => f.rule === rule);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-gaps-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const lintOne = (name, text, opts) => lint([write(name, text)], opts);
const rules = (r) => r.findings.map((f) => `${f.line} ${f.rule}`).sort();

test('G1 the 1.4.12 override beats author !important and catches text spilling into the next block', async () => {
  const hits = find(await run('g1-spacing.html'), 'MT-TEXT-SPACING');
  assert.ok(hits.some((f) => /card/.test(f.location) && /overlaps/.test(f.measured)), JSON.stringify(hits));
  assert.ok(hits.some((f) => /tight/.test(f.location)), JSON.stringify(hits));
  assert.ok(hits.every((f) => f.severity === 'HIGH'));
});

test('G1 screen-reader text, a closed panel and a spam trap stay exempt', async () => {
  const r = await audit(path.join(__dirname, 'audit', 'spacing-hidden.html'), { browser });
  assert.deepEqual(find(r, 'MT-TEXT-SPACING'), []);
});

test('G2 class expressions in JSX, Vue, Svelte and Astro are read', () => {
  const jsx = lintOne('A.jsx', [
    'export const A = ({ on }) => (',
    '  <h1 className={cn("text-[5vw]", on && "ml-4")}>x</h1>',
    ');',
    'const label = clsx(\'uppercase\', { "text-justify": true });',
    '',
  ].join('\n'));
  assert.deepEqual(rules(jsx), ['2 MT-PHYSICAL', '2 MT-ZOOM-VW', '4 MT-CAPS-TRACKING', '4 MT-JUSTIFY']);
  assert.doesNotMatch(jsx.notVerified.join(' '), /expressions/);
  const vue = lintOne('B.vue', '<template>\n  <p :class="{ \'text-justify\': wide }">x</p>\n  <span :class="[\'uppercase\']">y</span>\n</template>\n');
  assert.deepEqual(rules(vue), ['2 MT-JUSTIFY', '3 MT-CAPS-TRACKING']);
  const svelte = lintOne('C.svelte', '<p class:text-justify={wide}>x</p>\n');
  assert.deepEqual(rules(svelte), ['1 MT-JUSTIFY']);
  const astro = lintOne('D.astro', '<p class:list={["text-justify", { "ml-4": x }]}>x</p>\n');
  assert.deepEqual(rules(astro), ['1 MT-JUSTIFY', '1 MT-PHYSICAL']);
  const dynamic = lintOne('E.jsx', 'export const E = ({ s }) => <p className={`text-${s} uppercase`}>x</p>;\n');
  assert.deepEqual(rules(dynamic), ['1 MT-CAPS-TRACKING']);
  assert.match(dynamic.notVerified.join(' '), /interpolated parts of class expressions/);
});

test('G3 a 2 MB HTML file with tens of thousands of findings is linted in seconds', () => {
  const body = '<p>Prices fell -5 and rose "fast" in 1990-2004.</p>\n'.repeat(40000);
  const file = write('big.html', `<!doctype html><html lang="en"><body>\n${body}</body></html>\n`);
  const t0 = Date.now();
  const r = lint([file]);
  const ms = Date.now() - t0;
  assert.ok(r.findings.length >= 120000, `${r.findings.length} findings`);
  assert.ok(ms < 15000, `${ms} ms`);
});

test('G4 an unknown first face gives the range and names the fallback, not a single number', () => {
  const e = estimate({ family: 'Inter, Arial, sans-serif', width: '65ch' });
  assert.equal(e.known, false);
  assert.equal(e.fallback, 'Arial');
  assert.ok(e.low < e.high);
  assert.match(describe(e), /Inter is not in the calibration table/);
  assert.match(describe(e), /Arial/);
  assert.equal(estimate({ family: 'Verdana, sans-serif', width: '66ch' }).known, true);
});

test('G5 lite and rendered reports share one shape', async () => {
  const lite = await audit(path.join(FIX, 'g8-header.html'), { lite: true });
  const rendered = await run('g8-header.html');
  assert.equal(lite.mode, 'lite');
  assert.equal(rendered.mode, 'rendered');
  for (const f of [...lite.findings, ...rendered.findings]) assert.equal(typeof f.location, 'string', JSON.stringify(f));
  const css = lintOne('x.css', 'p { text-align: justify; }\n');
  assert.match(css.findings[0].location, /x\.css:1$/);
});

test('G6 MT-MINUS reports the line the minus sign is on', () => {
  const r = lintOne('m.html', '<!doctype html><html lang="en"><body><p>Net change\n-5 points this week.</p></body></html>\n');
  assert.deepEqual(r.findings.filter((f) => f.rule === 'MT-MINUS').map((f) => f.line), [2]);
});

test('G7 MT-RANGE leaves phone numbers and numbered standards alone', () => {
  const r = lintOne('r.html', '<!doctype html><html lang="en"><body><p>Call 040-123 4567. Dates follow ISO 8601-1 and EN 301-549.</p><p>From 1990-2004.</p></body></html>\n');
  const hits = r.findings.filter((f) => f.rule === 'MT-RANGE');
  assert.deepEqual(hits.map((f) => f.measured), ['hyphen in a number range: 1990-2004']);
});

test('G8 a number column aligned at the end under a start-aligned header is MT-NUM-ALIGN for the header', async () => {
  const hits = find(await run('g8-header.html'), 'MT-NUM-ALIGN');
  assert.equal(hits.length, 1, JSON.stringify(hits));
  assert.match(hits[0].location, /column 2 header/);
});
