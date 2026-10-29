// Verify tokens.css in Chromium: zoom behaviour (WCAG 1.4.4), heading steps
// and the rhythm unit. Browser zoom is emulated the way browsers do it: the
// CSS viewport becomes window / zoom and every CSS px is drawn zoom device px.
// Run: NODE_PATH=<dir with playwright> node verify-zoom.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'tokens.css'), 'utf8');

const roles = ['body', 'small', 'caption', 'label', 'h4', 'h3', 'h2', 'h1', 'hero'];
const html = `<!doctype html><html lang="en"><head><style>${css}
${roles.map((r) => `#${r}{font-size:var(--text-${r});line-height:var(--leading-${r})}`).join('\n')}
#line{block-size:var(--line)} #section{block-size:var(--space-section)}
</style></head><body>${roles.map((r) => `<p id="${r}">Text</p>`).join('')}
<div id="line"></div><div id="section"></div></body></html>`;

const windows = [360, 414, 768, 1024, 1280, 1440, 1920];
const zooms = [1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);

async function sample(cssWidth) {
  await page.setViewportSize({ width: Math.round(cssWidth), height: 800 });
  return page.evaluate((ids) => {
    const out = {};
    for (const id of ids) out[id] = parseFloat(getComputedStyle(document.getElementById(id)).fontSize);
    out.line = document.getElementById('line').getBoundingClientRect().height;
    out.section = document.getElementById('section').getBoundingClientRect().height;
    return out;
  }, roles);
}

const table = {}; // table[window][zoom] = device px per role
for (const w of windows) {
  table[w] = {};
  for (const z of zooms) {
    const s = await sample(w / z);
    table[w][z] = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v * z]));
  }
}
await browser.close();

let failures = 0;
const fail = (msg) => { failures++; console.log('FAIL ' + msg); };

console.log('\nSizes at 100% (CSS px)');
console.log('role     ' + windows.map((w) => String(w).padStart(7)).join(''));
for (const r of roles) console.log(r.padEnd(9) + windows.map((w) => table[w][1][r].toFixed(2).padStart(7)).join(''));

console.log('\nRatio at 200% zoom vs 100% on the same window (target 2.00)');
console.log('role     ' + windows.map((w) => String(w).padStart(7)).join('') + '   first zoom reaching 2x on worst window');
for (const r of roles) {
  const ratios = windows.map((w) => table[w][2][r] / table[w][1][r]);
  const reach = windows.map((w) => zooms.find((z) => table[w][z][r] / table[w][1][r] >= 1.999));
  const worstReach = Math.max(...reach.map((z) => z ?? Infinity));
  console.log(r.padEnd(9) + ratios.map((x) => x.toFixed(2).padStart(7)).join('') + `   ${worstReach * 100}%`);
  if (['body', 'small', 'caption', 'label'].includes(r) && ratios.some((x) => Math.abs(x - 2) > 0.001)) fail(`${r} is not exactly 2x at 200%`);
  if (!Number.isFinite(worstReach) || worstReach > 3) fail(`${r} needs more than 300% zoom to reach 2x`);
}

console.log('\nMax / min of each fluid role (500% zoom can compensate up to 2.5)');
for (const r of ['h4', 'h3', 'h2', 'h1', 'hero']) {
  const vals = windows.map((w) => table[w][1][r]);
  const k = Math.max(...vals) / Math.min(...vals);
  console.log(r.padEnd(9) + k.toFixed(3));
  if (k > 2.5) fail(`${r} range exceeds 2.5`);
}

console.log('\nAdjacent steps at 100% (target >= 1.2 for headings)');
const ladder = ['body', 'h4', 'h3', 'h2', 'h1', 'hero'];
for (let i = 1; i < ladder.length; i++) {
  const a = ladder[i - 1], b = ladder[i];
  const steps = windows.map((w) => table[w][1][b] / table[w][1][a]);
  console.log(`${b}/${a}`.padEnd(11) + steps.map((x) => x.toFixed(3).padStart(7)).join(''));
  if (a !== 'body' && Math.min(...steps) < 1.2) fail(`${b}/${a} step below 1.2`);
}

const l = table[1440][1].line;
console.log(`\n--line at 100%: ${l.toFixed(2)}px; at 200% zoom: ${(table[1440][2].line / l).toFixed(2)}x`);
console.log(`--space-section on 1440 window: 100% ${table[1440][1].section.toFixed(1)}px (${(table[1440][1].section / l).toFixed(2)} lines), ` +
  `200% ${(table[1440][2].section / 2).toFixed(1)} CSS px (${(table[1440][2].section / table[1440][2].line).toFixed(2)} lines)`);
if (Math.abs(l - 27.2) > 0.05) fail('--line is not 27.2px');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
