// Spec 0029: the tool faults the 100-page study found (F1 to F5). Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const FIX = path.join(__dirname, 'audit', 'r29');

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-faults-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const run = (name) => audit(path.join(FIX, name), { browser });
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));

// A CLI run through a pipe, as CI reads it; asynchronous so nothing is starved.
const piped = (script, args) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(SCRIPTS, script), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  const out = [];
  child.stdout.on('data', (d) => out.push(d));
  child.on('close', (status) => resolve({ status, stdout: Buffer.concat(out).toString('utf8') }));
});

// WCAG relative luminance, to check that a printed pair gives the printed ratio.
const lum = ([r, g, b]) => [r, g, b].map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const pairOf = (measured) => {
  const m = /^([\d.]+):1 \(rgb\((\d+), (\d+), (\d+)\) on rgb\((\d+), (\d+), (\d+)\)/.exec(measured);
  return m && { ratio: Number(m[1]), text: [m[2], m[3], m[4]].map(Number), ground: [m[5], m[6], m[7]].map(Number) };
};
const ratioOf = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('U1 text that reaches 2x at 200% zoom is not MT-ZOOM-VW though it shrinks at 500%; text in vw still is', async () => {
  const r = await run('u1-zoom.html');
  const vw = find(r, 'MT-ZOOM-VW');
  assert.ok(!vw.some((f) => /issue/.test(f.location)), JSON.stringify(vw));
  assert.ok(vw.some((f) => f.severity === 'HIGH' && /vw/.test(f.location)), `the vw heading is not reported: ${JSON.stringify(vw)}`);
});

test('U2 a large report arrives whole through a pipe, from lint-css.js and page-audit.js', async () => {
  const css = write('u2.css', Array.from({ length: 4000 }, (_, i) => `.heading-${i} { font-size: 4vw; }`).join('\n'));
  const lint = await piped('lint-css.js', [css, '--json']);
  assert.equal(lint.status, 1);
  assert.ok(lint.stdout.length > 200000, `${lint.stdout.length} bytes`);
  assert.equal(JSON.parse(lint.stdout).findings.length, 4000);
  const rows = Array.from({ length: 900 }, (_, i) => `<p id="row-${i}" style="color:#aaa">Low-contrast row number ${i} of the large report fixture.</p>`).join('\n');
  const html = write('u2.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><main>${rows}</main></body></html>`);
  const page = await piped('page-audit.js', [html, '--json']);
  assert.equal(page.status, 1);
  assert.ok(page.stdout.length > 65536, `${page.stdout.length} bytes`);
  const report = JSON.parse(page.stdout);
  assert.ok(report.findings.filter((f) => f.rule === 'MT-CONTRAST').length >= 900);
});

test('U3 spilled text that meets the next block is MT-TEXT-SPACING; a block standing beside it is not', async () => {
  const hits = find(await run('u3-spacing.html'), 'MT-TEXT-SPACING');
  assert.ok(hits.some((f) => f.severity === 'HIGH' && /div\.box\.real/.test(f.location)), `the overlapping box is not reported: ${JSON.stringify(hits)}`);
  assert.ok(!hits.some((f) => /div\.side/.test(f.location)), JSON.stringify(hits));
});

test('U4 the printed contrast pair is the colour the reader sees, so it gives the printed ratio', async () => {
  const hits = find(await run('u4-opacity.html'), 'MT-CONTRAST', 'HIGH');
  const row = hits.find((f) => /faded/.test(f.location));
  assert.ok(row, JSON.stringify(hits));
  const pair = pairOf(row.measured);
  assert.ok(pair, row.measured);
  assert.ok(Math.abs(ratioOf(pair.text, pair.ground) - pair.ratio) < 0.03, `${row.measured} does not give its own ratio`);
  assert.match(row.measured, /opacity/);
});

test('U5 the ground is what is painted under the text, also by an element that is not its ancestor', async () => {
  const r = await run('u5-layer.html');
  const hits = find(r, 'MT-CONTRAST');
  assert.ok(!hits.some((f) => /light/.test(f.location)), `white on the dark layer is reported: ${JSON.stringify(hits)}`);
  const ph = hits.find((f) => /placeholder/.test(f.location));
  assert.ok(ph, `the faint placeholder is not reported: ${JSON.stringify(hits)}`);
  const pair = pairOf(ph.measured);
  assert.ok(pair && pair.ground[2] > pair.ground[0] + 60, `the ground should be the purple layer: ${ph.measured}`);
  assert.ok(pair.ratio > 3 && pair.ratio < 4.5, ph.measured);
});

test('U7 a covering ::before or ::after layer is part of the ground: a gradient is not verified, a solid layer is measured', async () => {
  const r = await run('u7-pseudo.html');
  const hits = find(r, 'MT-CONTRAST');
  assert.ok(!hits.some((f) => /placeholder/.test(f.location)), `the placeholder on a gradient layer is reported with a ratio: ${JSON.stringify(hits)}`);
  assert.ok(!hits.some((f) => /onband/.test(f.location)), `white on the dark ::before layer is reported: ${JSON.stringify(hits)}`);
  assert.ok(r.notVerified.some((n) => /background images/.test(n)), JSON.stringify(r.notVerified));
});

test('U8 the paint-stack probe stylesheet goes in once per contrast pass, not once per text element', async () => {
  let inserted = 0;
  const counting = {
    newPage: async (opts) => {
      const page = await browser.newPage(opts);
      await page.exposeFunction('__mtProbeInserted', () => { inserted++; });
      await page.addInitScript(() => {
        new MutationObserver((ms) => {
          for (const m of ms) for (const n of m.addedNodes) if (n.tagName === 'STYLE' && /pointer-events: auto/.test(n.textContent)) window.__mtProbeInserted();
        }).observe(document, { subtree: true, childList: true });
      });
      return page;
    },
  };
  const rows = Array.from({ length: 200 }, (_, i) => `<p id="p${i}">Row ${i} of ordinary body text on a long page.</p>`).join('');
  await audit(write('u8.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><main>${rows}</main></body></html>`), { browser: counting });
  assert.ok(inserted > 0, 'the probe never ran');
  assert.ok(inserted <= 4, `the probe stylesheet was inserted ${inserted} times`);
});

function write(name, text) { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; }
