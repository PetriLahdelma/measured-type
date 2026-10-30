#!/usr/bin/env node
// Spec 0017 analysis (held-out measure in Charter), fixed before the runs:
// node evals/0017/analyze.js evals/results/0017
const fs = require('node:fs');
const path = require('node:path');

const CASE = 'h2h-measure-notes';
const TARGET = 62;
const cells = {};
for (const dir of process.argv.slice(2)) {
  const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8'));
  for (const [id, v] of Object.entries(key)) {
    if (v.case !== CASE) continue;
    const g = JSON.parse(fs.readFileSync(path.join(dir, 'runs', CASE, id, 'grading.json'), 'utf8'));
    const t = JSON.parse(fs.readFileSync(path.join(dir, 'runs', CASE, id, 'timing.json'), 'utf8'));
    // A run with no full lines to measure counts 100 characters off.
    const found = /pooled ([\d.]+) characters/.exec(g.expectations[0].evidence);
    const chars = found ? Number(found[1]) : TARGET + 100;
    (cells[v.cell] ||= []).push({
      all: g.expectations.every((e) => e.passed),
      measure: g.expectations[0].passed,
      scroll: g.expectations[1].passed,
      size: g.expectations[2].passed,
      chars,
      off: Math.abs(chars - TARGET),
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
console.log('| Cell | Runs | All three graders | 60 to 64 characters | No sideways scroll | 19px kept | Mean distance from 62 | Range | Mean tokens | Median time |');
console.log('|---|--:|--:|--:|--:|--:|--:|---|--:|--:|');
for (const k of ['S', 'N', 'H']) {
  const v = cells[k];
  if (!v) continue;
  const c = v.map((r) => r.chars);
  console.log(`| ${k} | ${v.length} | ${v.filter((r) => r.all).length} | ${v.filter((r) => r.measure).length} | ${v.filter((r) => r.scroll).length} | ${v.filter((r) => r.size).length} | ${mean(v.map((r) => r.off)).toFixed(2)} | ${Math.min(...c).toFixed(1)} to ${Math.max(...c).toFixed(1)} | ${Math.round(mean(v.map((r) => r.tokens)) / 1000)}k | ${Math.round(median(v.map((r) => r.seconds)))} s |`);
}
console.log('');
for (const [x, y] of [['S', 'N'], ['S', 'H']]) {
  if (!cells[x] || !cells[y]) continue;
  const dp = permutation(cells[x].map((r) => r.off), cells[y].map((r) => r.off));
  const ax = cells[x].filter((r) => r.all).length, ay = cells[y].filter((r) => r.all).length;
  const p = fisher(ax, cells[x].length - ax, ay, cells[y].length - ay);
  console.log(`${x} vs ${y}: distance from ${TARGET} ${mean(cells[x].map((r) => r.off)).toFixed(2)} against ${mean(cells[y].map((r) => r.off)).toFixed(2)}, permutation p = ${dp.toFixed(4)} (primary); all three ${ax}/${cells[x].length} against ${ay}/${cells[y].length}, Fisher p = ${p.toFixed(4)} (secondary)`);
}
