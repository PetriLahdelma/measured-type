// Measures tokens.css in Chromium.
// Browser zoom z on a window W px wide = a CSS viewport of W/z px with 1rem
// still 16 CSS px; on-screen size = computed CSS px * z. That is emulated
// here by setting the viewport to W/z and multiplying.
// Usage: NODE_PATH=<dir with playwright> node verify-tokens.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'tokens.css'), 'utf8');
const roles = ['label', 'caption', 'small', 'body', 'h4', 'h3', 'h2', 'h1', 'hero'];
const html = `<!doctype html><html lang="en"><head><style>${css}
body{margin:0;font-family:Georgia,serif}
${roles.map(r => `#${r}{font-size:var(--font-size-${r});line-height:var(--line-height-${r});letter-spacing:var(--letter-spacing-${r})}`).join('\n')}
.prose{font-size:var(--font-size-body);line-height:var(--line-height-body);inline-size:20em}
.prose>*{margin-block:0}
.prose>*+*{margin-block-start:var(--space-flow)}
.prose>h2{font-size:var(--font-size-h2);line-height:var(--line-height-h2);margin-block-start:var(--space-before-h2)}
.prose>h3{font-size:var(--font-size-h3);line-height:var(--line-height-h3);margin-block-start:var(--space-before-h3)}
.prose>h4{font-size:var(--font-size-h4);line-height:var(--line-height-h4);margin-block-start:var(--space-before-h4)}
.prose>:is(h2,h3,h4)+*{margin-block-start:var(--space-after-heading)}
</style></head><body>
${roles.map(r => `<div id="${r}">Sample</div>`).join('')}
<div class="prose" id="prose">
<p id="p0">One line.</p><h2>Short</h2><p id="p1">One line.</p><h3>Short</h3><p id="p2">One line.</p><h4>Short</h4><p id="p3">One line.</p>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setContent(html);
  const read = async () => page.evaluate(rs => {
    const o = {};
    for (const r of rs) {
      const cs = getComputedStyle(document.getElementById(r));
      o[r] = { fs: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight), ls: cs.letterSpacing };
    }
    const line = parseFloat(getComputedStyle(document.getElementById('p0')).lineHeight);
    const top0 = document.getElementById('p0').getBoundingClientRect().top;
    o.offsets = ['p1', 'p2', 'p3'].map(id => (document.getElementById(id).getBoundingClientRect().top - top0) / line);
    o.line = line;
    return o;
  }, roles);
  const at = async w => { await page.setViewportSize({ width: Math.round(w), height: 900 }); return read(); };

  let fail = 0;
  const check = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

  // 1. Sizes and adjacent ratios at both ends of the ramp
  for (const w of [360, 1440]) {
    const m = await at(w);
    console.log(`\nViewport ${w}px`);
    for (const r of roles) console.log(`  ${r.padEnd(8)} ${m[r].fs.toFixed(2).padStart(6)}px  lh ${m[r].lh.toFixed(2).padStart(6)}px (${(m[r].lh / m[r].fs).toFixed(3)})  ls ${m[r].ls}`);
    const chain = ['body', 'h4', 'h3', 'h2', 'h1', 'hero'];
    for (let i = 1; i < chain.length; i++) {
      const ratio = m[chain[i]].fs / m[chain[i - 1]].fs;
      check(ratio >= 1.15, `${w}px ${chain[i]}/${chain[i - 1]} = ${ratio.toFixed(3)} (floor 1.15)`);
    }
    for (const h of ['h4', 'h3', 'h2', 'h1']) {
      const lr = m[h].lh / m[h].fs;
      check(lr >= 1.05 && lr <= 1.3, `${w}px ${h} leading ratio ${lr.toFixed(3)} in 1.05..1.3`);
    }
    check(m.offsets.every(x => Math.abs(x - Math.round(x)) < 0.01), `${w}px text after h2/h3/h4 lands on the body line: ${m.offsets.map(x => x.toFixed(3)).join(', ')} lines`);
  }

  // 2. Zoom: on-screen growth at 200% for every window 320..2560
  const base = {};
  console.log('\n200% zoom, worst window per role');
  const worst = {};
  for (let W = 320; W <= 2560; W += 20) {
    const m1 = await at(W);
    const m2 = await at(W / 2);
    for (const r of roles) {
      const g = (m2[r].fs * 2) / m1[r].fs;
      if (!worst[r] || g < worst[r].g) worst[r] = { g, W };
    }
  }
  for (const r of roles) {
    const fixed = ['label', 'caption', 'small', 'body', 'h4', 'h3'].includes(r);
    if (fixed) check(Math.abs(worst[r].g - 2) < 0.001, `${r}: exactly ${worst[r].g.toFixed(3)}x at 200% on every window`);
    else check(worst[r].g >= 1.6, `${r}: ${worst[r].g.toFixed(3)}x at 200% on the worst window (${worst[r].W}px), target >= 1.6`);
  }

  // 3. Zoom level needed to reach 2x on the worst (1440px) window
  const m1440 = await at(1440);
  for (const r of ['h2', 'h1', 'hero']) {
    let z = 1;
    for (; z <= 5; z += 0.05) { const m = await at(1440 / z); if (m[r].fs * z >= 2 * m1440[r].fs) break; }
    check(z <= 3, `${r}: reaches 2x at ${(z * 100).toFixed(0)}% zoom on a 1440px window (browsers allow 500%)`);
  }
  // 4. Range heuristic
  const mMin = await at(360);
  for (const r of ['h2', 'h1', 'hero']) {
    const range = m1440[r].fs / mMin[r].fs;
    check(range <= 1.4, `${r}: max/min ${range.toFixed(3)} (<= 1.4 keeps zoom close to 2x; hard limit 2.5)`);
  }

  await browser.close();
  console.log(`\n${fail ? fail + ' FAILED' : 'ALL PASS'}`);
  process.exit(fail ? 1 : 0);
})();
