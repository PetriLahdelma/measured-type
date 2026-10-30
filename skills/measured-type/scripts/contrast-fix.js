#!/usr/bin/env node
/**
 * The nearest colour that reaches a WCAG contrast ratio (spec 0013).
 *
 *   node scripts/contrast-fix.js "#888" "#fff"              # text on ground, 4.5:1
 *   node scripts/contrast-fix.js "#999" "#fff" --large      # 3:1 for large text
 *   node scripts/contrast-fix.js "#ff7a00" "#fff" --ratio 7
 *   node scripts/contrast-fix.js "#fff" "#999" --move ground
 *
 * Only OKLCH lightness changes, so the hue stays; chroma is lowered only where
 * the lightness needed is outside sRGB at the original chroma. Both directions
 * are tried and the smaller change wins. Prints the colour, its ratio and the
 * APCA Lc. Exit code 0, 1 when no colour of that hue reaches the ratio, 2 on a
 * malformed colour. No dependencies.
 */
const { apcaLc } = require('./apca.js');

// ---------- colour spaces ----------

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toOklch([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  // A grey has no hue; leave its chroma at zero so the result stays neutral.
  if (C < 1e-4) return [L, 0, 0];
  return [L, C, ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

// Linear sRGB for an OKLCH colour, unclamped, so the caller can test the gamut.
function oklchToLinear([L, C, h]) {
  const A = C * Math.cos((h * Math.PI) / 180);
  const B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (lin) => lin.every((c) => c >= -1e-5 && c <= 1 + 1e-5);
const to8 = (lin) => lin.map((c) => Math.round(Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, c))))) * 255));

// The colour at lightness L and hue h, with the chroma lowered until it fits sRGB.
function fromOklch([L, C, h]) {
  if (inGamut(oklchToLinear([L, C, h]))) return to8(oklchToLinear([L, C, h]));
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear([L, mid, h]))) lo = mid; else hi = mid;
  }
  return to8(oklchToLinear([L, lo, h]));
}

// ---------- WCAG 2 ----------

const luminance = ([r, g, b]) => 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ---------- parsing ----------

function parse(input) {
  const s = String(input).trim().toLowerCase();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(s);
  if (m) return [m[1], m[2], m[3]].map((v) => Math.max(0, Math.min(255, Math.round(Number(v)))));
  m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.]+%?\s*)?\)$/.exec(s);
  if (m) {
    const L = m[2] ? Number(m[1]) / 100 : Number(m[1]);
    return fromOklch([L, Number(m[3]), Number(m[4])]);
  }
  throw new Error(`cannot read the colour ${input}: use #rgb, #rrggbb, rgb() or oklch()`);
}
const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
const round2 = (n) => Math.round(n * 100) / 100;

// ---------- the search ----------

/**
 * The nearest colour to `text` (or to `ground` with move: 'ground') that
 * reaches `ratio` against the other, changing only OKLCH lightness.
 * Returns { color, rgb, ratio, apcaLc, moved, from, lightness } or, when no
 * colour of that hue reaches it, { color: null, best }.
 */
function nearestPassing({ text, ground, ratio: target = 4.5, move = 'text' }) {
  const subject = move === 'ground' ? ground : text;
  const other = move === 'ground' ? text : ground;
  const [L0, C, h] = toOklch(subject);
  const passes = (rgb) => ratio(rgb, other) >= target;
  if (passes(subject)) return result(subject, L0);
  let best = null;
  let bestRatio = 0;
  for (const end of [0, 1]) {
    const endRgb = fromOklch([end, C, h]);
    bestRatio = Math.max(bestRatio, ratio(endRgb, other));
    if (!passes(endRgb)) continue;
    // From the original towards the end, the ratio fails and then passes: bisect the edge.
    let near = L0;
    let far = end;
    for (let i = 0; i < 40; i++) {
      const mid = (near + far) / 2;
      if (passes(fromOklch([mid, C, h]))) far = mid; else near = mid;
    }
    let L = far;
    let rgb = fromOklch([L, C, h]);
    for (let i = 0; i < 50 && !passes(rgb); i++) { L += end > L0 ? 0.001 : -0.001; rgb = fromOklch([L, C, h]); }
    if (!passes(rgb)) continue;
    if (!best || Math.abs(L - L0) < Math.abs(best.L - L0)) best = { rgb, L };
  }
  if (!best) return { color: null, best: round2(bestRatio), target, moved: move, from: hex(subject) };
  return result(best.rgb, best.L);

  function result(rgb, L) {
    const t = move === 'ground' ? text : rgb;
    const g = move === 'ground' ? rgb : ground;
    return {
      color: hex(rgb),
      rgb,
      ratio: round2(ratio(t, g)),
      apcaLc: round2(apcaLc(t, g)),
      target,
      moved: move,
      from: hex(subject),
      lightness: { from: Math.round(L0 * 1000) / 1000, to: Math.round(L * 1000) / 1000 },
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const value = (name) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? undefined : args[i + 1];
  };
  const positional = args.filter((a, j) => !a.startsWith('--') && !['--ratio', '--move'].includes(args[j - 1]));
  const fail = (message) => { console.error(message); process.exit(2); };
  if (positional.length !== 2) fail('usage: contrast-fix.js <text colour> <ground colour> [--ratio N | --large] [--move text|ground] [--json]');
  let text;
  let ground;
  try {
    text = parse(positional[0]);
    ground = parse(positional[1]);
  } catch (err) {
    fail(err.message);
  }
  let target = args.includes('--large') ? 3 : 4.5;
  if (args.includes('--ratio')) {
    target = Number(value('ratio'));
    if (!Number.isFinite(target) || target <= 1 || target > 21) fail(`--ratio needs a number between 1 and 21, got ${value('ratio') || 'nothing'}`);
  }
  const move = args.includes('--move') ? value('move') : 'text';
  if (!['text', 'ground'].includes(move)) fail(`--move takes text or ground, got ${move || 'nothing'}`);
  const r = nearestPassing({ text, ground, ratio: target, move });
  if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else if (!r.color) console.log(`no ${move} colour of this hue reaches ${target}:1; the best is ${r.best}:1. Change the hue, or move the ${move === 'text' ? 'ground' : 'text'} instead.`);
  else {
    const was = round2(ratio(text, ground));
    console.log(`${r.color} reaches ${r.ratio}:1 (was ${was}:1, needs ${target}:1), APCA Lc ${r.apcaLc}`);
    console.log(`  ${move} ${r.from} -> ${r.color}: OKLCH lightness ${r.lightness.from} -> ${r.lightness.to}, hue kept`);
  }
  process.exit(r.color ? 0 : 1);
}

module.exports = { nearestPassing, parse, toOklch, fromOklch, ratio, hex };
