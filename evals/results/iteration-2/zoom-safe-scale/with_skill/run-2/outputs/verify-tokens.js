// Verifies tokens.css in Chromium: zoom ratios (WCAG 1.4.4), scale steps,
// heading leading ratios and line-based spacing.
// Browser zoom is emulated as Chromium applies it: CSS viewport = window / zoom,
// devicePixelRatio = zoom. Device px = computed CSS px * zoom.
// Usage: NODE_PATH=<repo>/node_modules node verify-tokens.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const css = 'file://' + path.join(__dirname, 'tokens.css');
const roles = ['label', 'caption', 'small', 'body', 'h4', 'h3', 'h2', 'h1', 'hero'];
const fluid = ['h2', 'h1', 'hero'];
const spaces = ['--space-0-25', '--space-0-5', '--space-1', '--space-1-5', '--space-2',
  '--space-3', '--space-4', '--space-6', '--space-section'];
const html = `<!doctype html><html lang="en"><head><link rel="stylesheet" href="${css}">
<style>body{margin:0;font-family:system-ui,sans-serif} .s{display:block;block-size:0}</style></head><body>
${roles.map(r => `<div id="${r}" style="font-size:var(--font-size-${r});line-height:var(--line-height-${r});letter-spacing:var(--letter-spacing-${r})">Documentation</div>`).join('')}
${spaces.map(s => `<div class="s" data-s="${s}" style="margin-block-start:var(${s})"></div>`).join('')}
<div id="line" style="block-size:var(--line)"></div>
<span id="word" style="font-size:var(--font-size-hero);letter-spacing:var(--letter-spacing-hero);white-space:nowrap">Documentation</span>
</body></html>`;

// file:// stylesheets only load from a file:// page, so write the harness to a temp file
const harness = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-')), 'harness.html');
fs.writeFileSync(harness, html);
const pageUrl = 'file://' + harness;

async function sample(browser, win, zoom) {
  const ctx = await browser.newContext({ viewport: { width: Math.round(win / zoom), height: Math.round(900 / zoom) }, deviceScaleFactor: zoom });
  const page = await ctx.newPage();
  await page.goto(pageUrl, { waitUntil: 'load' });
  const r = await page.evaluate(({ roles, spaces }) => {
    const out = { fs: {}, lh: {}, sp: {} };
    for (const id of roles) {
      const cs = getComputedStyle(document.getElementById(id));
      out.fs[id] = parseFloat(cs.fontSize);
      out.lh[id] = cs.lineHeight === 'normal' ? NaN : parseFloat(cs.lineHeight);
    }
    for (const el of document.querySelectorAll('[data-s]')) out.sp[el.dataset.s] = parseFloat(getComputedStyle(el).marginBlockStart);
    out.line = document.getElementById('line').getBoundingClientRect().height;
    out.word = document.getElementById('word').getBoundingClientRect().width;
    out.vw = innerWidth;
    return out;
  }, { roles, spaces });
  await ctx.close();
  return r;
}

(async () => {
  const browser = await chromium.launch();
  let fail = 0;
  const check = (ok, msg) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + msg); };

  const probe = await sample(browser, 1440, 1);
  if (probe.fs.body !== 18) { console.log('FAIL tokens.css did not load (body ' + probe.fs.body + 'px)'); process.exit(1); }

  // 1. Sizes at 360 and 1440 (100%) and the adjacent steps
  for (const w of [360, 1440]) {
    const s = await sample(browser, w, 1);
    console.log(`\n${w}px window, 100%: ` + roles.map(r => `${r} ${s.fs[r].toFixed(2)}`).join(', '));
    for (let i = 1; i < roles.length; i++) {
      const ratio = s.fs[roles[i]] / s.fs[roles[i - 1]];
      const heading = ['h3', 'h2', 'h1', 'hero'].includes(roles[i]);
      console.log(`  ${roles[i - 1]} -> ${roles[i]}: ${ratio.toFixed(3)}`);
      if (heading) check(ratio >= 1.2 - 1e-3, `${w}px ${roles[i - 1]}->${roles[i]} step ${ratio.toFixed(3)} >= 1.2`);
    }
    for (const r of ['h4', 'h3', 'h2']) {
      const k = s.lh[r] / s.fs[r];
      check(k >= 1.05 && k <= 1.35 + 1e-9, `${w}px ${r} leading ratio ${k.toFixed(3)} in 1.05-1.35`);
    }
    for (const sp of spaces) {
      const n = s.sp[sp] / s.line;
      check(Math.abs(n * 4 - Math.round(n * 4)) < 1e-3, `${w}px ${sp} = ${s.sp[sp].toFixed(2)}px = ${n.toFixed(3)} lines`);
    }
  }

  // 2. Zoom: fixed sizes exactly 2x at 200%; fluid ratio across windows
  console.log('\nZoom ratios (device px at zoom / device px at 100%)');
  const windows = [360, 768, 1024, 1280, 1440, 1680, 1920];
  const worst = {};
  for (const w of windows) {
    const base = await sample(browser, w, 1);
    const z2 = await sample(browser, w, 2);
    const parts = [];
    for (const r of roles) {
      const ratio = (z2.fs[r] * 2) / base.fs[r];
      if (!fluid.includes(r)) check(Math.abs(ratio - 2) < 1e-6, `${w}px 200% ${r} = ${ratio.toFixed(3)}x`);
      else { parts.push(`${r} ${ratio.toFixed(3)}`); worst[r] = Math.min(worst[r] ?? 9, ratio); }
    }
    console.log(`  ${w}px window @200%: ${parts.join(', ')}`);
  }
  for (const r of fluid) console.log(`  worst 200% ratio ${r}: ${worst[r].toFixed(3)}x`);

  // 3. Zoom level at which each fluid size reaches 2x on the 1440 window
  const base1440 = await sample(browser, 1440, 1);
  for (const z of [2, 2.5, 3, 4, 5]) {
    const s = await sample(browser, 1440, z);
    console.log(`  1440px window @${z * 100}%: ` + fluid.map(r => `${r} ${((s.fs[r] * z) / base1440.fs[r]).toFixed(3)}x`).join(', '));
    if (z === 5) for (const r of fluid) check((s.fs[r] * z) / base1440.fs[r] >= 2, `1440px @500% ${r} reaches 2x`);
  }

  // 4. Reflow sanity (1.4.10): a 13-letter word at hero size in a 320 CSS px viewport (16px gutters)
  const reflow = await sample(browser, 1280, 4);
  check(reflow.word <= reflow.vw - 32, `320 CSS px viewport: "Documentation" at hero size is ${reflow.word.toFixed(1)}px wide, box ${reflow.vw - 32}px (system-ui; recheck with the real face)`);

  await browser.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nAll checks passed');
  process.exit(fail ? 1 : 0);
})();
