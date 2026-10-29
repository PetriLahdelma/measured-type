// Measures every font-size token in Chromium and checks browser-zoom behaviour.
// Browser zoom z on a window W = CSS viewport W/z, each CSS px drawn at z device px,
// so rendered(W, z) = z * computed(viewport = W / z).
// Run: NODE_PATH=<dir with playwright> node verify-zoom.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const tokens = ['body', 'small', 'caption', 'label', 'h4', 'h3', 'h2', 'h1', 'display'];
const html = `<!doctype html><style>${css}</style>` +
  tokens.map(t => `<p id="${t}" style="font-size:var(--font-size-${t})">x</p>`).join('');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
const f = {}; // f[token][cssWidth] = computed px
for (let w = 90; w <= 2560; w++) {
  await page.setViewportSize({ width: w, height: 800 });
  const sizes = await page.evaluate(ts => ts.map(t => parseFloat(getComputedStyle(document.getElementById(t)).fontSize)), tokens);
  tokens.forEach((t, i) => ((f[t] ??= {})[w] = sizes[i]));
}
await browser.close();

const rendered = (t, W, z) => z * f[t][Math.round(W / z)];
let ok = true;
console.log('token     min    max    max/min  worst@200%  (window)  2x reached at');
for (const t of tokens) {
  const min = f[t][360], max = f[t][1440];
  let worst = Infinity, worstW = 0;
  for (let W = 360; W <= 2560; W++) {
    const r = rendered(t, W, 2) / f[t][W];
    if (r < worst) { worst = r; worstW = W; }
  }
  let reach = null;
  for (let z = 2; z <= 5.001 && reach === null; z += 0.01) {
    let all = true;
    for (let W = 360; W <= 2560; W++) if (rendered(t, W, z) < 2 * f[t][W] * 0.998) { all = false; break; }
    if (all) reach = z;
  }
  const ratio = max / min;
  if (ratio > 2.5 || reach === null) ok = false;
  if (['body', 'small', 'caption', 'label'].includes(t) && Math.abs(worst - 2) > 1e-6) ok = false;
  console.log(t.padEnd(9), min.toFixed(2).padStart(6), max.toFixed(2).padStart(6), ratio.toFixed(2).padStart(8),
    (worst.toFixed(3) + 'x').padStart(11), String(worstW).padStart(9), ((reach * 100).toFixed(0) + '%').padStart(14));
}
console.log(ok ? 'PASS: static text 2.00x at 200%; all fluid tokens max/min <= 2.5 and reach 2x within 500% zoom'
               : 'FAIL');
process.exit(ok ? 0 : 1);
