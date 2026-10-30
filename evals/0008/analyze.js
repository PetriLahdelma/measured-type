#!/usr/bin/env node
// Spec 0008 analysis, fixed before the runs:
// node evals/0008/analyze.js <results-dir> [<results-dir> ...]
// Each <results-dir> holds key.json and runs/<case>/<id>/grading.json; the
// runs of every directory are pooled by cell.
const fs = require('node:fs');
const path = require('node:path');

const METRIC = {
  'h2h-measure-ideal': { name: 'distance from 66 characters per line (lower is better)', read: (g) => Math.abs(Number(/pooled ([\d.]+)/.exec(g.expectations[0].evidence)[1]) - 66) },
  'h2h-zoom-hero': { name: 'growth at 200% zoom (higher is better)', read: (g) => Number(/growth ([\d.]+)× at 200%/.exec(g.expectations[1].evidence)[1]) },
};
const CELLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COMPARE = [
  ['E', 'A', 'primary: hint against the full skill, with a browser'],
  ['F', 'B', 'primary: hint against the lite skill, without a browser'],
  ['E', 'C', 'secondary: hint against nothing, with a browser'],
  ['F', 'D', 'secondary: hint against nothing, without a browser'],
  ['A', 'C', 'secondary: skill against nothing, with a browser'],
  ['B', 'D', 'secondary: skill against nothing, without a browser'],
];
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
// Exact two-sided permutation test on the difference of means, over every split.
function permutation(a, b) {
  const all = [...a, ...b];
  const n = all.length;
  const k = a.length;
  const sum = all.reduce((s, x) => s + x, 0);
  const observed = Math.abs(mean(a) - mean(b));
  let extreme = 0;
  let total = 0;
  const pick = (start, left, partial) => {
    if (left === 0) {
      const d = Math.abs(partial / k - (sum - partial) / (n - k));
      if (d >= observed - 1e-12) extreme++;
      total++;
      return;
    }
    for (let i = start; i <= n - left; i++) pick(i + 1, left - 1, partial + all[i]);
  };
  pick(0, k, 0);
  return extreme / total;
}

const dirs = process.argv.slice(2);
if (!dirs.length) { console.error('usage: analyze.js <results-dir> [...]'); process.exit(2); }
for (const [c, metric] of Object.entries(METRIC)) {
  const cells = Object.fromEntries(CELLS.map((k) => [k, []]));
  const passes = Object.fromEntries(CELLS.map((k) => [k, 0]));
  const graders = Object.fromEntries(CELLS.map((k) => [k, 0]));
  for (const dir of dirs) {
    const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8'));
    for (const [id, v] of Object.entries(key)) {
      if (v.case !== c) continue;
      const g = JSON.parse(fs.readFileSync(path.join(dir, 'runs', c, id, 'grading.json'), 'utf8'));
      cells[v.cell].push(metric.read(g));
      passes[v.cell] += g.summary.passed;
      graders[v.cell] += g.summary.total;
    }
  }
  console.log(`\n## ${c}: ${metric.name}\n`);
  console.log('| Cell | Runs | Mean | Median | Range | Graders passed |');
  console.log('|---|--:|--:|--:|---|--:|');
  for (const k of CELLS) {
    const v = cells[k];
    if (!v.length) continue;
    console.log(`| ${k} | ${v.length} | ${mean(v).toFixed(2)} | ${median(v).toFixed(2)} | ${Math.min(...v).toFixed(2)} to ${Math.max(...v).toFixed(2)} | ${passes[k]}/${graders[k]} |`);
  }
  console.log('');
  for (const [x, y, label] of COMPARE) {
    if (!cells[x].length || !cells[y].length) continue;
    const p = permutation(cells[x], cells[y]);
    console.log(`${x} - ${y} (${label}): ${(mean(cells[x]) - mean(cells[y])).toFixed(3)}, exact permutation p = ${p.toFixed(4)}`);
  }
}
