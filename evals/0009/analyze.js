#!/usr/bin/env node
// Spec 0009 rerun analysis, fixed before the runs:
// node evals/0009/analyze.js evals/results/2x2 evals/results/0008 evals/results/0009
const fs = require('node:fs');
const path = require('node:path');

const CASE = 'h2h-zoom-hero';
const cells = {};
for (const dir of process.argv.slice(2)) {
  const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8'));
  for (const [id, v] of Object.entries(key)) {
    if (v.case !== CASE) continue;
    const g = JSON.parse(fs.readFileSync(path.join(dir, 'runs', CASE, id, 'grading.json'), 'utf8'));
    const t = JSON.parse(fs.readFileSync(path.join(dir, 'runs', CASE, id, 'timing.json'), 'utf8'));
    (cells[v.cell] ||= []).push({
      all: g.expectations.every((e) => e.passed),
      sizes: g.expectations[2].passed,
      growth: Number(/growth ([\d.]+)× at 200%/.exec(g.expectations[1].evidence)[1]),
      tokens: t.total_tokens,
      seconds: t.total_duration_seconds,
    });
  }
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const logFact = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
// Two-sided Fisher exact test on a 2x2 table [[a, b], [c, d]].
function fisher(a, b, c, d) {
  const r1 = a + b, r2 = c + d, c1 = a + c, n = a + b + c + d;
  const p = (x) => Math.exp(logFact(r1) + logFact(r2) + logFact(c1) + logFact(n - c1) - logFact(n) - logFact(x) - logFact(r1 - x) - logFact(c1 - x) - logFact(r2 - c1 + x));
  const observed = p(a);
  let total = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) if (p(x) <= observed * (1 + 1e-9)) total += p(x);
  return Math.min(1, total);
}
function permutation(a, b) {
  const all = [...a, ...b], n = all.length, k = a.length, sum = all.reduce((s, x) => s + x, 0);
  const observed = Math.abs(mean(a) - mean(b));
  let extreme = 0, total = 0;
  const pick = (start, left, partial) => {
    if (left === 0) { if (Math.abs(partial / k - (sum - partial) / (n - k)) >= observed - 1e-12) extreme++; total++; return; }
    for (let i = start; i <= n - left; i++) pick(i + 1, left - 1, partial + all[i]);
  };
  pick(0, k, 0);
  return extreme / total;
}

console.log(`## ${CASE}\n`);
console.log('| Cell | Runs | All three graders | Requested sizes | Mean growth | Range | Mean tokens | Median time |');
console.log('|---|--:|--:|--:|--:|---|--:|--:|');
for (const k of ['A', 'B', 'C', 'D', 'E', 'F', 'A9', 'B9']) {
  const v = cells[k];
  if (!v) continue;
  const g = v.map((r) => r.growth);
  console.log(`| ${k} | ${v.length} | ${v.filter((r) => r.all).length} | ${v.filter((r) => r.sizes).length} | ${mean(g).toFixed(3)}× | ${Math.min(...g).toFixed(2)}× to ${Math.max(...g).toFixed(2)}× | ${Math.round(mean(v.map((r) => r.tokens)) / 1000)}k | ${Math.round(median(v.map((r) => r.seconds)))} s |`);
}
console.log('');
for (const [x, y, label] of [['A9', 'A', 'primary'], ['B9', 'B', 'primary'], ['A9', 'E', 'secondary'], ['B9', 'F', 'secondary']]) {
  if (!cells[x] || !cells[y]) continue;
  const ax = cells[x].filter((r) => r.all).length, ay = cells[y].filter((r) => r.all).length;
  const p = fisher(ax, cells[x].length - ax, ay, cells[y].length - ay);
  const gp = permutation(cells[x].map((r) => r.growth), cells[y].map((r) => r.growth));
  console.log(`${x} vs ${y} (${label}): all three ${ax}/${cells[x].length} against ${ay}/${cells[y].length}, Fisher p = ${p.toFixed(4)}; growth ${(mean(cells[x].map((r) => r.growth)) - mean(cells[y].map((r) => r.growth))).toFixed(3)}, permutation p = ${gp.toFixed(4)}`);
}
