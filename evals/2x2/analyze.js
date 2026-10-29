#!/usr/bin/env node
// Spec 0007 analysis, fixed before the runs: node evals/2x2/analyze.js <results-dir>
// <results-dir> holds key.json and runs/<case>/<id>/grading.json.
const fs = require('node:fs');
const path = require('node:path');

const dir = process.argv[2];
const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8'));
const METRIC = {
  'h2h-measure-ideal': { name: 'distance from 66 characters per line (lower is better)', better: -1, read: (g) => Math.abs(Number(/pooled ([\d.]+)/.exec(g.expectations[0].evidence)[1]) - 66) },
  'h2h-zoom-hero': { name: 'growth at 200% zoom (higher is better)', better: 1, read: (g) => Number(/growth ([\d.]+)× at 200%/.exec(g.expectations[1].evidence)[1]) },
};
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
// Exact two-sided permutation test on the difference of means.
function permutation(a, b) {
  const all = [...a, ...b];
  const observed = Math.abs(mean(a) - mean(b));
  let extreme = 0;
  let total = 0;
  const pick = (start, chosen) => {
    if (chosen.length === a.length) {
      const set = new Set(chosen);
      const x = chosen.map((i) => all[i]);
      const y = all.filter((v, i) => !set.has(i));
      if (Math.abs(mean(x) - mean(y)) >= observed - 1e-12) extreme++;
      total++;
      return;
    }
    for (let i = start; i < all.length; i++) pick(i + 1, [...chosen, i]);
  };
  pick(0, []);
  return extreme / total;
}

for (const [c, metric] of Object.entries(METRIC)) {
  const cells = { A: [], B: [], C: [], D: [] };
  const passes = { A: [], B: [], C: [], D: [] };
  for (const [id, v] of Object.entries(key)) {
    if (v.case !== c) continue;
    const g = JSON.parse(fs.readFileSync(path.join(dir, 'runs', c, id, 'grading.json'), 'utf8'));
    cells[v.cell].push(metric.read(g));
    passes[v.cell].push(`${g.summary.passed}/${g.summary.total}`);
  }
  console.log(`\n## ${c}: ${metric.name}\n`);
  console.log('| Cell | Runs | Mean | Median | Range | Graders passed |');
  console.log('|---|--:|--:|--:|---|---|');
  for (const k of ['A', 'B', 'C', 'D']) {
    const v = cells[k];
    console.log(`| ${k} | ${v.length} | ${mean(v).toFixed(2)} | ${median(v).toFixed(2)} | ${Math.min(...v).toFixed(2)} to ${Math.max(...v).toFixed(2)} | ${passes[k].join(', ')} |`);
  }
  const [A, B, C, D] = ['A', 'B', 'C', 'D'].map((k) => mean(cells[k]));
  console.log(`\nSkill main effect ((A+B)/2 - (C+D)/2): ${(((A + B) - (C + D)) / 2).toFixed(3)}`);
  console.log(`Browser main effect ((A+C)/2 - (B+D)/2): ${(((A + C) - (B + D)) / 2).toFixed(3)}`);
  console.log(`Interaction ((A-C) - (B-D)): ${((A - C) - (B - D)).toFixed(3)}`);
  console.log(`Skill effect with a browser (A - C): ${(A - C).toFixed(3)}, exact permutation p = ${permutation(cells.A, cells.C).toFixed(3)}`);
  console.log(`Skill effect without a browser (B - D): ${(B - D).toFixed(3)}, exact permutation p = ${permutation(cells.B, cells.D).toFixed(3)}`);
}
