// Spec 0009: type-scale.js --fit, zoom-safe answers that keep the requested sizes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPTS = path.join(__dirname, '..');
const SKILL = path.join(SCRIPTS, '..');
const run = (args) => spawnSync(process.execPath, [path.join(SCRIPTS, 'type-scale.js'), ...args], { encoding: 'utf8' });
const fit = (range, extra = []) => {
  const r = run(['--fit', range, '--json', ...extra]);
  assert.ok(r.status === 0 || r.status === 1, r.stderr + r.stdout);
  return { status: r.status, out: JSON.parse(r.stdout) };
};
const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
const HERO = fit('2.5rem:4.5rem');
const byForm = (out, form) => out.candidates.find((c) => c.form === form);

test('Z1 a two-slope candidate keeps 40px at 360 and 72px at 1440 and passes both zoom checks', () => {
  const c = byForm(HERO.out, 'two-slope');
  assert.ok(c, JSON.stringify(HERO.out));
  assert.ok(near(c.at[360], 40), `360: ${c.at[360]}`);
  assert.ok(near(c.at[1440], 72), `1440: ${c.at[1440]}`);
  assert.ok(c.growth200 >= 1.6, `growth ${c.growth200}`);
  assert.ok(c.reach500 >= 2, `500%: ${c.reach500}`);
  assert.match(c.css, /^clamp\([\d.]+rem, min\([\d.]+rem \+ [\d.]+vi, [\d.]+rem \+ [\d.]+vi\), [\d.]+rem\)$/);
  assert.equal(HERO.status, 0);
});

test('Z2 an early-max candidate reaches 72px by 880px, keeps both sizes and names where the maximum starts', () => {
  const c = byForm(HERO.out, 'early-max');
  assert.ok(c, JSON.stringify(HERO.out));
  assert.ok(near(c.at[360], 40) && near(c.at[1440], 72), JSON.stringify(c.at));
  assert.ok(c.maxFrom <= 880, `max from ${c.maxFrom}`);
  assert.ok(c.growth200 >= 1.6 && c.reach500 >= 2, JSON.stringify(c));
  assert.match(c.css, /^clamp\([\d.]+rem, [\d.]+rem \+ [\d.]+vi, [\d.]+rem\)$/);
});

test('Z3 the plain ramp is reported at 1.43x as failing the bar and is not recommended', () => {
  const c = byForm(HERO.out, 'ramp');
  assert.ok(c, JSON.stringify(HERO.out));
  assert.ok(near(c.growth200, 1.43, 0.01), `growth ${c.growth200}`);
  assert.ok(c.failures.some((f) => /1\.6/.test(f)), JSON.stringify(c.failures));
  assert.notEqual(HERO.out.recommended, 'ramp');
});

test('Z4 Chromium computes the same sizes as the script for both candidates', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    for (const form of ['two-slope', 'early-max']) {
      const c = byForm(HERO.out, form);
      for (const width of [360, 640, 1280, 1440]) {
        const page = await browser.newPage({ viewport: { width, height: 600 } });
        await page.setContent(`<h1 style="font-size: ${c.css}">x</h1>`);
        const size = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize));
        assert.ok(Math.abs(size - c.at[width]) <= 0.1, `${form} at ${width}: Chromium ${size}, script ${c.at[width]}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test('Z5 a range the plain ramp already serves is recommended as the plain ramp', () => {
  const { status, out } = fit('2rem:2.5rem');
  assert.equal(status, 0);
  assert.equal(out.recommended, 'ramp');
  assert.ok(byForm(out, 'ramp').growth200 >= 1.6);
});

test('Z6 each candidate lists growth at 200% zoom on 1024, 1280, 1440 and 1920px windows', () => {
  for (const c of HERO.out.candidates) {
    for (const w of [1024, 1280, 1440, 1920]) assert.equal(typeof c.growthByWindow[w], 'number', `${c.form} ${w}`);
    assert.equal(c.growthByWindow[1280], c.growth200);
  }
  const table = run(['--fit', '2.5rem:4.5rem']).stdout;
  assert.match(table, /1024/);
  assert.match(table, /two-slope/);
  assert.match(table, /early-max/);
});

test('Z7 a malformed or inverted --fit range exits 2', () => {
  for (const bad of ['4.5rem:2.5rem', '2.5rem', 'big:small', '2.5rem:72px']) {
    const r = run(['--fit', bad]);
    assert.equal(r.status, 2, `${bad}: ${r.stdout}`);
    assert.ok(r.stderr.length > 0, bad);
  }
});

test('Z8 the linter evaluates min() inside clamp() and its range fix names --fit', () => {
  const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-fit-'));
  const two = byForm(HERO.out, 'two-slope').css;
  const file = path.join(tmp, 'hero.css');
  fs.writeFileSync(file, `.hero h1 { font-size: ${two}; }\n.plain h1 { font-size: clamp(2.5rem, 1.8rem + 3vw, 4.5rem); }\n`);
  const r = lint([file]);
  assert.deepEqual(r.findings.filter((f) => f.rule === 'MT-ZOOM-VW'), [], JSON.stringify(r.findings));
  const range = r.findings.filter((f) => f.rule === 'MT-ZOOM-RANGE');
  assert.ok(range.length >= 1, JSON.stringify(r.findings));
  assert.ok(range.every((f) => /type-scale\.js --fit/.test(f.fix)), JSON.stringify(range));
});

test('Z9 SKILL.md and rules.md tell the agent to keep the requested sizes and use --fit', () => {
  const skill = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
  const rules = fs.readFileSync(path.join(SKILL, 'references', 'rules.md'), 'utf8');
  for (const text of [skill, rules]) {
    assert.match(text, /--fit/);
    assert.match(text, /early max/i);
    assert.match(text, /two slopes/i);
  }
  assert.match(skill, /requested sizes/i);
});
