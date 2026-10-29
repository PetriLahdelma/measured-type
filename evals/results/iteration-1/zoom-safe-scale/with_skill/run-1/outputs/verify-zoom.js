#!/usr/bin/env node
// Verifies tokens.css in Chromium:
//  1. adjacent heading step ratios at every window from 320 to 2560px
//  2. size ratio at 200% page zoom (CSS viewport = window / 2, 1 CSS px = 2 device px)
//  3. zoom level at which each role reaches 2x on the worst window
//  4. text-only zoom (default font size 32px instead of 16px)
//  5. rhythm: --line and the half-line gap under a heading
// Usage: node verify-zoom.js [path/to/tokens.css]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(process.argv[2] || path.join(__dirname, 'tokens.css'));
const css = fs.readFileSync(cssPath, 'utf8');
const roles = ['body', 'small', 'caption', 'label', 'h4', 'h3', 'h2', 'h1', 'hero'];
const html = (rootSize = '') => `<!doctype html><html lang="en"><head><style>${css}
${rootSize ? `:root{font-size:${rootSize}}` : ''}
body{margin:0}
${roles.map(r => `.${r}{font-size:var(--${r}-size);line-height:var(--${r}-leading);letter-spacing:var(--${r}-tracking)}`).join('\n')}
.prose > * { margin-block: 0; }
.prose > * + * { margin-block-start: var(--flow-block); }
.prose > h2 { margin-block-start: var(--flow-before-h2); }
.prose > :is(h2, h3, h4) + * { margin-block-start: var(--flow-after-heading); }
</style></head><body>
${roles.map(r => `<div class="${r}" id="${r}">Sample</div>`).join('')}
<div class="prose body"><p>First.</p><h2 class="h2" id="ph2">Heading</h2><p id="pafter">After.</p></div>
</body></html>`;

const widths = [320, 360, 480, 600, 720, 900, 1024, 1080, 1280, 1440, 1600, 1920, 2160, 2560, 2880];

async function sizesAt(page, cssWidth, rootSize = '') {
  await page.setViewportSize({ width: Math.round(cssWidth), height: 800 });
  await page.setContent(html(rootSize));
  return page.evaluate((roles) => {
    const o = {};
    for (const r of roles) o[r] = parseFloat(getComputedStyle(document.getElementById(r)).fontSize);
    const cs = getComputedStyle(document.documentElement);
    const line = document.createElement('div');
    line.style.blockSize = 'var(--line)';
    document.body.append(line);
    o._line = line.getBoundingClientRect().height;
    o._gap = document.getElementById('pafter').getBoundingClientRect().top -
             document.getElementById('ph2').getBoundingClientRect().bottom;
    return o;
  }, roles);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const base = {};
  for (const w of widths) base[w] = await sizesAt(page, w);

  // 1. step ratios
  const ladder = ['body', 'h4', 'h3', 'h2', 'h1', 'hero'];
  let minStep = Infinity, minStepAt = '';
  console.log('\n1. Adjacent step ratios (window px: body>h4>h3>h2>h1>hero)');
  for (const w of widths) {
    const s = ladder.slice(1).map((r, i) => base[w][r] / base[w][ladder[i]]);
    s.forEach((v, i) => { if (v < minStep) { minStep = v; minStepAt = `${ladder[i + 1]}/${ladder[i]} @${w}`; } });
    if ([360, 1440].includes(w)) console.log(`  ${w}: sizes ${ladder.map(r => base[w][r].toFixed(2)).join(' ')} | steps ${s.map(v => v.toFixed(3)).join(' ')}`);
  }
  console.log(`  smallest step anywhere: ${minStep.toFixed(3)} (${minStepAt})`);

  // 2. 200% page zoom
  console.log('\n2. 200% page zoom: device px at zoom / device px at 100% (worst window)');
  const zoomRatio = async (z, w, r) => {
    const s = await sizesAt(page, w / z);
    return (s[r] * z) / base[w][r];
  };
  const worst200 = {};
  for (const r of roles) {
    let min = Infinity, at = 0;
    for (const w of widths) { const v = await zoomRatio(2, w, r); if (v < min) { min = v; at = w; } }
    worst200[r] = { min, at };
    console.log(`  ${r.padEnd(8)} ${min.toFixed(3)}x at ${at}px window`);
  }

  // 3. zoom needed to reach 2x on every window
  console.log('\n3. Lowest standard zoom step reaching >= 2x on every window');
  const stepsZ = [2, 2.5, 3, 4, 5];
  for (const r of roles) {
    let reached = null;
    for (const z of stepsZ) {
      let ok = true;
      for (const w of widths) if ((await zoomRatio(z, w, r)) < 1.9999) { ok = false; break; }
      if (ok) { reached = z; break; }
    }
    console.log(`  ${r.padEnd(8)} ${reached ? reached * 100 + '%' : 'never (<=500%)'}`);
  }

  // 4. text-only zoom: default font size 32px
  console.log('\n4. Default font size 32px (text-only zoom): ratio vs 16px (worst window)');
  for (const r of roles) {
    let min = Infinity, at = 0;
    for (const w of widths) { const s = await sizesAt(page, w, '200%'); const v = s[r] / base[w][r]; if (v < min) { min = v; at = w; } }
    console.log(`  ${r.padEnd(8)} ${min.toFixed(3)}x at ${at}px window`);
  }

  // 5. rhythm
  const b = base[1440], z = await sizesAt(page, 720);
  console.log(`\n5. Rhythm: --line ${b._line}px at 100%, ${z._line * 2} device px at 200%; gap under h2 ${b._gap}px (want ${b._line / 2})`);
  await browser.close();
})();
