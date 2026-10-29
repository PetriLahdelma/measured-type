// Spec 0001 part D4-D5: scripts/type-scale.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'type-scale.js');
const run = (args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
const GOOD = ['--base', '1rem:1.125rem', '--ratio', '1.2:1.25', '--steps', '5', '--viewports', '360:1440'];

test('D4 a modest scale passes every check and prints clamp() tokens with rem and vi', () => {
  const r = run([...GOOD, '--json']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const out = JSON.parse(r.stdout);
  assert.equal(out.steps.length, 6); // step 0 (body) to step 5
  for (const s of out.steps) {
    assert.ok(s.range <= 1.4 + 1e-9, `step ${s.step} range ${s.range}`);
    assert.ok(s.reach500 >= 2, `step ${s.step} reaches ${s.reach500} at 500%`);
    assert.ok(s.growth200 >= 1.6, `step ${s.step} grows ${s.growth200} at 200%`);
    if (s.step > 0) assert.ok(s.stepRatioMin >= 1.15 && s.stepRatioMax >= 1.15);
    if (s.max > s.min) assert.match(s.css, /^clamp\([\d.]+rem, [\d.]+rem \+ [\d.]+vi, [\d.]+rem\)$/);
  }
});

test('D4 a scale whose top steps range too far exits 1 and names the failing steps', () => {
  const r = run(['--base', '1rem:1.25rem', '--ratio', '1.2:1.333', '--steps', '5', '--viewports', '360:1440']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /step 5/);
  assert.match(r.stdout, /range/);
});

test('D4 steps closer than 1.15x fail the step check', () => {
  const r = run(['--base', '1rem:1.125rem', '--ratio', '1.1:1.12', '--steps', '3', '--viewports', '360:1440']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /1\.15/);
});

test('D4 the default output is CSS custom properties plus a verification table', () => {
  const r = run(GOOD);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /--step-0: /);
  assert.match(r.stdout, /--step-5: clamp\(/);
  assert.match(r.stdout, /\| step \|/);
});

test('D5 computed sizes match Chromium at 360, 640 and 1440px within 0.1px', async () => {
  const out = JSON.parse(run([...GOOD, '--json']).stdout);
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    for (const width of [360, 640, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 600 } });
      await page.setContent(`<style>${out.css}</style>${out.steps.map((s) => `<p style="font-size: var(--step-${s.step})" id="s${s.step}">x</p>`).join('')}`);
      const sizes = await page.evaluate(() => [...document.querySelectorAll('p')].map((p) => parseFloat(getComputedStyle(p).fontSize)));
      out.steps.forEach((s, i) => {
        const predicted = s.at[width];
        assert.ok(Math.abs(sizes[i] - predicted) <= 0.1, `step ${s.step} at ${width}: Chromium ${sizes[i]}, script ${predicted}`);
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('D6 --fluid-from keeps lower steps fixed rem and keeps fluid steps a ratio above them', () => {
  const r = run(['--base', '1rem:1.125rem', '--ratio', '1.2:1.25', '--steps', '5', '--fluid-from', '4', '--json']);
  assert.equal(r.status, 0, r.stdout);
  const out = JSON.parse(r.stdout);
  for (const s of out.steps.slice(0, 4)) {
    assert.match(s.css, /^[\d.]+rem$/, `step ${s.step} should be fixed: ${s.css}`);
    assert.equal(s.growth200, 2);
  }
  assert.equal(out.steps[0].css, '1.125rem');
  for (const s of out.steps.slice(4)) {
    assert.match(s.css, /^clamp\(/);
    assert.ok(s.stepRatioMin >= 1.2 - 1e-3, `step ${s.step} only ${s.stepRatioMin}x above the step below at the small end`);
  }
});

test('D7 --prefix names the tokens, so a linter that infers a type scale from --font-size-* can read them', () => {
  const r = run([...GOOD, '--prefix', 'font-size']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /--font-size-0: /);
  assert.doesNotMatch(r.stdout, /--step-/);
  assert.match(run(GOOD).stdout, /--step-0: /);
});
