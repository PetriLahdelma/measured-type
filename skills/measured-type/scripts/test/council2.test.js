// Spec 0004: never approve what was not computed (P), no false blocks (F).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'audit', 'c2');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const cache = new Map();
const run = (name) => {
  if (!cache.has(name)) cache.set(name, audit(path.join(FIX, name), { browser }));
  return cache.get(name);
};
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-c2-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const lintOne = (name, text, opts) => lint([write(name, text)], opts);

// ---------- P: no silent approval ----------

test('P1 text in oklch() and text under opacity are measured for contrast', async () => {
  const hits = find(await run('p1-colour.html'), 'MT-CONTRAST', 'HIGH');
  assert.ok(hits.some((f) => /faint/.test(f.location)), JSON.stringify(hits));
  assert.ok(hits.some((f) => /ghost/.test(f.location)), JSON.stringify(hits));
});

test('P2 disabled controls are exempt from MT-CONTRAST', async () => {
  const r = await run('p2-disabled.html');
  assert.deepEqual(find(r, 'MT-CONTRAST'), []);
});

test('P3 text cut off by overflow-x: hidden is MT-REFLOW HIGH; a scroll container is allowed', async () => {
  const hits = find(await run('p3-hidden.html'), 'MT-REFLOW', 'HIGH');
  assert.ok(hits.length >= 1, 'no MT-REFLOW');
  assert.ok(hits.every((f) => !/scroll|table/.test(f.location)), JSON.stringify(hits));
  assert.ok(hits.some((f) => /wide/.test(f.location)), JSON.stringify(hits));
});

test('P4 a heading sized in vh is MT-ZOOM-VW HIGH', async () => {
  assert.equal(find(await run('p4-vh.html'), 'MT-ZOOM-VW', 'HIGH').length, 1);
});

test('P5 a contrast failure that appears only in the dark scheme is reported as such', async () => {
  const hits = find(await run('p5-dark.html'), 'MT-CONTRAST', 'HIGH');
  assert.ok(hits.length >= 1, 'no dark-scheme contrast finding');
  assert.ok(hits.every((f) => /dark scheme/.test(f.location)), JSON.stringify(hits));
});

test('P6 number cells with a unit count as numbers for MT-TABULAR and MT-NUM-ALIGN', async () => {
  const r = await run('p6-units.html');
  assert.equal(find(r, 'MT-TABULAR').length, 2, JSON.stringify(r.findings));
  assert.equal(find(r, 'MT-NUM-ALIGN').length, 2, JSON.stringify(r.findings));
});

test('P7 custom properties with digits are linted, and a failing type-scale.js scale fails the linter', () => {
  const r = lintOne('tokens.css', ':root { --step-0: 5vw; --font-size-4: 8vw; --_size: 6vw; }\n');
  assert.equal(r.findings.filter((f) => f.rule === 'MT-ZOOM-VW').length, 3, JSON.stringify(r.findings));
  const scale = spawnSync(process.execPath, [path.join(SCRIPTS, 'type-scale.js'), '--base', '12:36', '--ratio', '1.2:1.5', '--steps', '3', '--prefix', 'font-size'], { encoding: 'utf8' });
  assert.equal(scale.status, 1, 'type-scale should reject this scale');
  const css = scale.stdout.slice(scale.stdout.indexOf(':root'), scale.stdout.indexOf('}') + 1);
  const fromScale = lintOne('scale.css', `${css}\n`);
  assert.ok(fromScale.findings.some((f) => /^MT-ZOOM/.test(f.rule)), JSON.stringify(fromScale.findings));
});

test('P8 vh-family sizes are evaluated; container units are listed under Not verified', () => {
  const r = lintOne('vh.css', 'h1 { font-size: 6vh; }\nh2 { font-size: 3dvh; }\nh3 { font-size: 4cqi; }\n');
  assert.equal(r.findings.filter((f) => f.rule === 'MT-ZOOM-VW').length, 2, JSON.stringify(r.findings));
  assert.match(r.notVerified.join(' '), /container units/);
});

test('P9 inputs the linter cannot read are listed under Not verified, not reported clean', () => {
  const sass = lintOne('a.sass', '.a\n  font-size: 5vw\n');
  assert.match(sass.notVerified.join(' '), /a\.sass/);
  const vue = lintOne('B.vue', '<template><p>x</p></template>\n<style lang="sass">\n.a\n  font-size: 5vw\n</style>\n');
  assert.match(vue.notVerified.join(' '), /B\.vue/);
  const jsx = lintOne('C.jsx', 'export const C = () => <h1 className={cn("text-[5vw]")}>x</h1>;\n');
  assert.match(jsx.notVerified.join(' '), /class lists built by expressions/);
});

test('P9 lite mode lists stylesheets it could not read', async () => {
  const r = await audit(path.join(FIX, 'p9-lite-links.html'), { lite: true });
  const nv = r.notVerified.join(' ');
  assert.match(nv, /\/styles\/site\.css/);
  assert.match(nv, /cdn\.example\.com/);
});

// ---------- F: no false blocks or harmful fixes ----------

test('F1 symmetric physical pairs and Tailwind centring are not MT-PHYSICAL, even with --rtl', () => {
  const css = lintOne('c.css', '.c { margin-left: auto; margin-right: auto; }\n.d { left: 0; right: 0; }\n.e { margin-left: 1rem; }\n', { rtl: true });
  assert.deepEqual(css.findings.filter((f) => f.rule === 'MT-PHYSICAL').map((f) => f.line), [3]);
  const tw = lintOne('t.jsx', '<div className="absolute left-1/2 -translate-x-1/2">x</div>\n', { rtl: true });
  assert.deepEqual(tw.findings.filter((f) => f.rule === 'MT-PHYSICAL'), []);
});

test('F2 an icon centred in a flex row is not MT-ICON-ALIGN; an icon on the baseline still is', async () => {
  const r = await run('f2-icons.html');
  const hits = find(r, 'MT-ICON-ALIGN');
  assert.ok(hits.every((f) => !/btn/.test(f.location)), JSON.stringify(hits));
  const inline = await audit(path.join(__dirname, 'audit', 'icon.html'), { browser });
  assert.equal(find(inline, 'MT-ICON-ALIGN').length, 1);
});

test('F3 MT-WIDOWS flags 1, not the CSS default 2', () => {
  const r = lintOne('w.css', '@media print { p { widows: 2; orphans: 2; } }\n.x { widows: 1; }\n');
  assert.deepEqual(r.findings.filter((f) => f.rule === 'MT-WIDOWS').map((f) => f.line), [2]);
});

test('F4 Latin-only checks leave Arabic and Japanese alone; CJK is measured on its own band', async () => {
  const r = await run('f4-scripts.html');
  assert.deepEqual(find(r, 'MT-CAPS-TRACKING'), [], 'tracking advice on Arabic');
  assert.deepEqual(find(r, 'MT-CONFUSABLE'), [], 'I/l check on Japanese');
  assert.deepEqual(find(r, 'MT-MEASURE-SHORT'), [], '35ic flagged as short');
  assert.equal(find(r, 'MT-MEASURE-LONG').length, 1, JSON.stringify(r.findings));
});

test('F5 MT-TABULAR probes the digits, and names the face that rendered', async () => {
  assert.deepEqual(find(await run('f5-span.html'), 'MT-TABULAR'), []);
  const hit = find(await run('f5-fallback.html'), 'MT-TABULAR');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].fix, /^Georgia has no tabular figures/);
});
