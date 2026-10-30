#!/usr/bin/env node
// Spec 0018: committed runs re-graded under tighter bands, after the fact.
// Reads the numbers each grading.json already records; renders nothing.
//   node evals/regrade-tight.js
const fs = require('node:fs');
const path = require('node:path');

const RESULTS = path.join(__dirname, 'results');
// The requested value within 2 characters, or each requested size within 5%.
const within = (v, p) => [+(v * (1 - p)).toFixed(2), +(v * (1 + p)).toFixed(2)];
const BANDS = {
  'h2h-measure-ideal': { grader: 0, chars: [64, 68] },
  'h2h-zoom-hero': { grader: 2, small: within(40, 0.05), large: within(72, 0.05) },
  'h2h-zoom-title': { grader: 2, small: within(48, 0.05), large: within(80, 0.05) },
};
const inside = (x, [lo, hi]) => Number.isFinite(x) && x >= lo && x <= hi;

// expectations: the committed grading.json list. Returns whether the tighter
// band holds and whether every grader passes with it in place.
function tight(name, expectations) {
  const b = BANDS[name];
  const evidence = expectations[b.grader].evidence;
  let band;
  if (b.chars) {
    const m = /pooled ([\d.]+) characters/.exec(evidence);
    band = Boolean(m) && inside(Number(m[1]), b.chars);
  } else {
    const m = /h1 ([\d.]+)px at 360, ([\d.]+)px at 1440/.exec(evidence);
    band = Boolean(m) && inside(Number(m[1]), b.small) && inside(Number(m[2]), b.large);
  }
  const all = band && expectations.every((e, i) => i === b.grader || e.passed);
  return { band, all };
}

function main() {
  const rows = [];
  for (const exp of fs.readdirSync(RESULTS).sort()) {
    const keyFile = path.join(RESULTS, exp, 'key.json');
    if (!fs.existsSync(keyFile)) continue;
    const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    const cells = new Map();
    for (const [id, v] of Object.entries(key)) {
      if (!BANDS[v.case]) continue;
      const file = path.join(RESULTS, exp, 'runs', v.case, id, 'grading.json');
      if (!fs.existsSync(file)) continue;
      const g = JSON.parse(fs.readFileSync(file, 'utf8')).expectations;
      const cell = [v.cell || v.config, v.model].filter(Boolean).join(', ');
      const k = `${v.case}|${cell}`;
      if (!cells.has(k)) cells.set(k, { exp, name: v.case, cell, runs: 0, band: 0, all: 0, tightBand: 0, tightAll: 0 });
      const c = cells.get(k);
      const t = tight(v.case, g);
      c.runs++;
      c.band += g[BANDS[v.case].grader].passed ? 1 : 0;
      c.all += g.every((e) => e.passed) ? 1 : 0;
      c.tightBand += t.band ? 1 : 0;
      c.tightAll += t.all ? 1 : 0;
    }
    rows.push(...[...cells.values()].sort((a, b) => (a.name + a.cell).localeCompare(b.name + b.cell)));
  }
  console.log('| Experiment | Case | Cell | Runs | Band as committed | Tighter band | All graders as committed | All graders, tighter |');
  console.log('|---|---|---|--:|--:|--:|--:|--:|');
  for (const r of rows) console.log(`| ${r.exp} | ${r.name} | ${r.cell} | ${r.runs} | ${r.band} | ${r.tightBand} | ${r.all} | ${r.tightAll} |`);
}

if (require.main === module) main();
module.exports = { tight, BANDS };
