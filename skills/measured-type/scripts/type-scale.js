#!/usr/bin/env node
/**
 * Fluid type scale with the zoom and step checks of rules.md §3.1.1.
 *
 *   node scripts/type-scale.js --base 1rem:1.125rem --ratio 1.2:1.25 --steps 5
 *   node scripts/type-scale.js --base 16:18 --ratio 1.2:1.25 --steps 5 --viewports 360:1440 --json
 *
 * --base     body size at the smallest and largest viewport (rem or px)
 * --ratio    scale ratio at the smallest and largest viewport
 * --steps    number of steps above the body (step 0)
 * --viewports  where the fluid ramp starts and ends, in px (default 360:1440)
 * --fluid-from N  keep steps below N fixed in rem at their large-viewport size
 *                (rules.md §3.1.1: body and small headings stay fixed)
 *
 * Each step is `clamp(min-rem, rem + vi, max-rem)`, fixed `rem` when min equals
 * max. Every step is checked: fluid range at most 1.4×, 2× reachable by 500%
 * zoom on any window from 320 to 2560px, at least 1.6× at 200% zoom on a
 * 1280px window (this project's bar, not WCAG's), and at least 1.15× above the
 * step below at both ends of the ramp. Exit code 1 names the failing steps.
 */

const ROOT_PX = 16;
const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

function px(value) {
  const m = /^([\d.]+)(rem|px)?$/.exec(String(value).trim());
  if (!m) throw new Error(`not a size: ${value}`);
  return m[2] === 'rem' ? parseFloat(m[1]) * ROOT_PX : parseFloat(m[1]);
}
const pair = (s, f = Number) => {
  const [a, b] = String(s).split(':');
  return [f(a), f(b === undefined ? a : b)];
};

function buildStep(step, minPx, maxPx, [w0, w1]) {
  if (Math.abs(maxPx - minPx) < 0.01) {
    const rem = round(minPx / ROOT_PX);
    return { css: `${rem}rem`, f: () => rem * ROOT_PX };
  }
  const slope = (maxPx - minPx) / (w1 - w0);
  const vi = round(slope * 100);
  const intercept = round((minPx - slope * w0) / ROOT_PX);
  const lo = round(minPx / ROOT_PX);
  const hi = round(maxPx / ROOT_PX);
  const css = `clamp(${lo}rem, ${intercept}rem + ${vi}vi, ${hi}rem)`;
  return { css, f: (W) => Math.max(lo * ROOT_PX, Math.min(intercept * ROOT_PX + (vi * W) / 100, hi * ROOT_PX)) };
}

function scale({ base, ratio, steps, viewports, fluidFrom = 0 }) {
  const [b0, b1] = base;
  const [r0, r1] = ratio;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    // Below fluidFrom a step is fixed at its large-viewport size; a fluid step's
    // small end is lifted so it stays at least one ratio above the step under it.
    const max = b1 * r1 ** i;
    const min = i < fluidFrom ? max : Math.max(b0 * r0 ** i, i > 0 ? out[i - 1].min * r0 : 0);
    const { css, f } = buildStep(i, min, max, viewports);
    let reach500 = Infinity;
    for (let w = 320; w <= 2560; w += 10) reach500 = Math.min(reach500, (5 * f(w / 5)) / f(w));
    const s = {
      step: i,
      min: round(f(viewports[0]), 2),
      max: round(f(viewports[1]), 2),
      css,
      range: round(f(viewports[1]) / f(viewports[0]), 3),
      growth200: round((2 * f(640)) / f(1280), 3),
      reach500: round(reach500, 3),
      at: { 360: round(f(360), 3), 640: round(f(640), 3), 1280: round(f(1280), 3), 1440: round(f(1440), 3) },
      failures: [],
    };
    if (i > 0) {
      const prev = out[i - 1];
      s.stepRatioMin = round(s.min / prev.min, 3);
      s.stepRatioMax = round(s.max / prev.max, 3);
    }
    if (s.range > 1.4 + 1e-9) s.failures.push(`range ${s.range}× (keep it at 1.4× or less)`);
    if (s.reach500 < 2) s.failures.push(`reaches only ${s.reach500}× at 500% zoom (WCAG 1.4.4 needs 2×)`);
    if (s.growth200 < 1.6) s.failures.push(`${s.growth200}× at 200% zoom on 1280px (house bar 1.6×)`);
    if (i > 0 && (s.stepRatioMin < 1.15 || s.stepRatioMax < 1.15)) s.failures.push(`only ${Math.min(s.stepRatioMin, s.stepRatioMax)}× above step ${i - 1} (keep steps at 1.15× or more)`);
    s.f = f;
    out.push(s);
  }
  const css = `:root {\n${out.map((s) => `  --step-${s.step}: ${s.css};`).join('\n')}\n}`;
  return { css, steps: out.map(({ f, ...rest }) => rest), ok: out.every((s) => !s.failures.length) };
}

function table(result) {
  let md = '| step | min px | max px | range | 200% on 1280 | 500% worst | ratio min | ratio max | result |\n|---|--:|--:|--:|--:|--:|--:|--:|---|\n';
  for (const s of result.steps) {
    md += `| ${s.step} | ${s.min} | ${s.max} | ${s.range}× | ${s.growth200}× | ${s.reach500}× | ${s.stepRatioMin ?? ''} | ${s.stepRatioMax ?? ''} | ${s.failures.length ? 'fail' : 'ok'} |\n`;
  }
  const failing = result.steps.filter((s) => s.failures.length);
  if (failing.length) md += `\n${failing.map((s) => `step ${s.step}: ${s.failures.join('; ')}`).join('\n')}\n`;
  return md;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : args[i + 1];
  };
  let result;
  try {
    result = scale({
      base: pair(opt('base', '1rem:1.125rem'), px),
      ratio: pair(opt('ratio', '1.2:1.25')),
      steps: Number(opt('steps', 5)),
      viewports: pair(opt('viewports', '360:1440')),
      fluidFrom: Number(opt('fluid-from', 0)),
    });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else console.log(`${result.css}\n\n${table(result)}`);
  process.exit(result.ok ? 0 : 1);
}

module.exports = { scale };
