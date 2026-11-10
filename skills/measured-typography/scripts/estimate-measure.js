#!/usr/bin/env node
/**
 * Estimate characters per line without a browser.
 *
 *   node scripts/estimate-measure.js Verdana 66ch
 *   node scripts/estimate-measure.js "Georgia, serif" 34em --size 18
 *   node scripts/estimate-measure.js "Brand Sans" 600px --json
 *   node scripts/estimate-measure.js Verdana --target 66 --size 17
 *
 * A line holds about width / (average character width) characters, less a
 * few for the word that does not fit at the end. The average character and
 * zero widths below were measured in Chromium on macOS on 29 October 2026,
 * on the English sample prose of measure-line.js at 16px (spec 0003 K3).
 * Faces not in the table get the range the table spans. The real count still
 * comes from measure-line.js; this is for when no browser is installed.
 *
 * No dependencies. Exit code 0, or 2 on a usage error.
 */

// family: [average character width in em, zero width in em]
const FACES = {
  'Arial': [0.438, 0.556],
  'Helvetica': [0.438, 0.556],
  'Helvetica Neue': [0.442, 0.556],
  'Verdana': [0.504, 0.636],
  'Tahoma': [0.441, 0.546],
  'Trebuchet MS': [0.45, 0.524],
  'Georgia': [0.435, 0.614],
  'Times New Roman': [0.393, 0.5],
  'Palatino': [0.437, 0.5],
  'Iowan Old Style': [0.441, 0.556],
  'Charter': [0.433, 0.556],
  'Avenir Next': [0.448, 0.58],
  'Futura': [0.451, 0.617],
  'Gill Sans': [0.401, 0.5],
  'Optima': [0.426, 0.556],
  'Baskerville': [0.393, 0.5],
  'Hoefler Text': [0.416, 0.596],
  'system-ui': [0.446, 0.61], // San Francisco on macOS; other systems differ
  'Roboto': [0.443, 0.563],
  'Merriweather': [0.48, 0.634],
  'DM Sans': [0.457, 0.684],
  'Raleway': [0.454, 0.612],
  'PT Serif': [0.439, 0.533],
  'PT Sans': [0.422, 0.545],
  'Geist': [0.45, 0.673],
  'Rubik': [0.456, 0.633],
  'Libre Franklin': [0.455, 0.688],
  'Menlo': [0.602, 0.602],
  'Courier New': [0.6, 0.6],
  'JetBrains Mono': [0.6, 0.6],
};
const WRAP_LOSS = 2.8; // characters lost to the word that does not fit, median of the calibration
const MONO = new Set(['Menlo', 'Courier New', 'JetBrains Mono']);

const ROOT_PX = 16;

function lookup(stack) {
  const names = String(stack).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  for (const n of names) {
    const hit = Object.keys(FACES).find((k) => k.toLowerCase() === n.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function widthPx(width, size, zeroEm) {
  const m = /^([\d.]+)(ch|em|rem|px)$/.exec(String(width).trim());
  if (!m) throw new Error(`cannot read the width ${width}: use ch, em, rem or px`);
  const n = parseFloat(m[1]);
  if (m[2] === 'px') return n;
  if (m[2] === 'rem') return n * ROOT_PX;
  if (m[2] === 'em') return n * size;
  return n * size * zeroEm;
}

const perLine = (px, size, avgEm) => Math.round((px / (avgEm * size) - WRAP_LOSS) * 10) / 10;

const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math)$/i;

function estimate({ family, width, size = ROOT_PX }) {
  // Only the first named face is what renders when it is installed; a later face in the stack is a guess.
  const names = String(family).split(',').map((n) => n.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const first = names.find((n) => !GENERIC.test(n));
  const face = first && lookup(first);
  const fallback = !face && lookup(family);
  if (face) {
    const [avgEm, zeroEm] = FACES[face];
    const px = widthPx(width, size, zeroEm);
    return { family: face, known: true, width, size, widthPx: Math.round(px * 10) / 10, cpl: perLine(px, size, avgEm), avgEm, zeroEm };
  }
  const values = Object.entries(FACES).filter(([k]) => !MONO.has(k))
    .map(([, [avgEm, zeroEm]]) => perLine(widthPx(width, size, zeroEm), size, avgEm));
  const out = { family: String(family), first: first || null, known: false, width, size, cpl: null, low: Math.min(...values), high: Math.max(...values) };
  if (fallback) {
    const [avgEm, zeroEm] = FACES[fallback];
    out.fallback = fallback;
    out.fallbackCpl = perLine(widthPx(width, size, zeroEm), size, avgEm);
  }
  return out;
}

// The inverse (spec 0012): the width whose estimate is `target` characters per line.
const tenth = (n) => Math.round(n * 10) / 10;
function solveWidth({ family, target, size = ROOT_PX }) {
  const names = String(family).split(',').map((n) => n.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const first = names.find((n) => !GENERIC.test(n));
  const face = first && lookup(first);
  const emFor = (avgEm) => tenth((target + WRAP_LOSS) * avgEm);
  if (face) {
    const em = emFor(FACES[face][0]);
    return { family: face, known: true, target, size, em, px: tenth(em * size) };
  }
  const ems = Object.entries(FACES).filter(([k]) => !MONO.has(k)).map(([, [avgEm]]) => emFor(avgEm));
  const out = { family: String(family), first: first || null, known: false, target, size, low: Math.min(...ems), high: Math.max(...ems) };
  const fallback = lookup(family);
  if (fallback) {
    out.fallback = fallback;
    out.fallbackEm = emFor(FACES[fallback][0]);
  }
  return out;
}

function describeWidth(w) {
  if (w.known) return `about ${w.em}em (${w.px}px at ${w.size}px) for ${w.target} characters per line in ${w.family}`;
  const range = `${w.low}em to ${w.high}em for ${w.target} characters per line, depending on the face`;
  if (!w.fallback) return range;
  return `${w.first} is not in the calibration table: ${range}; if ${w.first} is missing and ${w.fallback} renders instead, about ${w.fallbackEm}em`;
}

function describe(e) {
  if (e.known) return `about ${Math.round(e.cpl)} characters per line in ${e.family} at ${e.width}`;
  const range = `${Math.round(e.low)} to ${Math.round(e.high)} characters per line at ${e.width}, depending on the face`;
  if (!e.fallback) return range;
  return `${e.first} is not in the calibration table: ${range}; if ${e.first} is missing and ${e.fallback} renders instead, about ${Math.round(e.fallbackCpl)}`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const value = (name) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? undefined : args[i + 1];
  };
  const positional = args.filter((a, j) => !a.startsWith('--') && !['--size', '--target'].includes(args[j - 1]));
  const sizeRaw = value('size');
  const size = args.includes('--size') ? Number(sizeRaw === undefined || sizeRaw === '' ? NaN : sizeRaw) : ROOT_PX;
  if (!Number.isFinite(size) || size <= 0) {
    console.error(`--size needs a number of px, got ${sizeRaw === undefined || sizeRaw === '' ? 'nothing' : sizeRaw}`);
    process.exit(2);
  }
  const targetRaw = value('target');
  if (args.includes('--target')) {
    const target = Number(targetRaw);
    if (targetRaw === undefined || targetRaw === '' || !Number.isFinite(target) || target <= 0) {
      console.error(`--target needs a number of characters per line, for example 66 (got ${targetRaw === undefined || targetRaw === '' ? 'nothing' : targetRaw})`);
      process.exit(2);
    }
    const [family] = positional;
    if (!family) {
      console.error('usage: estimate-measure.js <font-family> --target <characters per line> [--size px] [--json]');
      process.exit(2);
    }
    const w = solveWidth({ family, target, size });
    if (json) console.log(JSON.stringify(w, null, 2));
    else console.log(`${describeWidth(w)} (estimate from a Chromium calibration; confirm with measure-line.js --solve ${target})`);
    process.exit(0);
  }
  const [family, width] = positional;
  if (!family || !width) {
    console.error('usage: estimate-measure.js <font-family> <width: 66ch | 34em | 34rem | 600px> [--size px] [--json]\n       estimate-measure.js <font-family> --target <characters per line> [--size px] [--json]');
    process.exit(2);
  }
  let e;
  try {
    e = estimate({ family, width, size });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  if (json) console.log(JSON.stringify(e, null, 2));
  else {
    console.log(`${describe(e)} (estimate from a Chromium calibration, not a measurement)`);
    if (e.known) console.log(`  ${e.widthPx}px at ${size}px; average character ${e.avgEm}em, zero ${e.zeroEm}em`);
    else console.log(`  ${family} is not in the calibration table; run measure-line.js for the real count`);
  }
}

module.exports = { estimate, describe, solveWidth, describeWidth, lookup, FACES };
