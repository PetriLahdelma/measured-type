#!/usr/bin/env node
// Spec 0028 analysis, fixed before the runs:
//   node evals/0028/analyze.js <folder holding pages/*.json>
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MIN_FULL_LINES = 3;
const ZOOM_BAR = 1.6;
const CHECKED_RULES = ['MT-CONTRAST', 'MT-REFLOW', 'MT-TEXT-SPACING', 'MT-ZOOM-VW'];

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

function growthOf(f) {
  if (f.rule === 'MT-ZOOM-GROWTH') {
    const m = /([\d.]+)× at 200%/.exec(f.measured);
    return m ? Number(m[1]) : null;
  }
  if (f.rule === 'MT-ZOOM-VW') {
    const m = /grows ([\d.]+)× at 200%/.exec(f.measured);
    return m ? Number(m[1]) : null;
  }
  return null;
}

function lowestGrowth(page) {
  const all = page.audit.findings.map(growthOf).filter((g) => g !== null);
  return all.length ? Math.min(...all) : null;
}

function summarizeOk(ok) {
  const withText = ok.filter((p) => p.lines && p.lines.fullLines >= MIN_FULL_LINES && p.lines.avgCharsPerLine != null);
  const avgs = withText.map((p) => p.lines.avgCharsPerLine);
  const growths = ok.map(lowestGrowth).filter((g) => g !== null);
  const rules = {};
  for (const p of ok) {
    const seen = new Set();
    for (const f of p.audit.findings) {
      const r = (rules[f.rule] ||= { pages: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
      if (!seen.has(f.rule)) r.pages++;
      const key = `${f.rule}|${f.severity}`;
      if (!seen.has(key)) r[f.severity]++;
      seen.add(f.rule);
      seen.add(key);
    }
  }
  return {
    pages: ok.length,
    lines: {
      measured: withText.length,
      noText: ok.length - withText.length,
      median: median(avgs),
      under45: avgs.filter((a) => a < 45).length,
      in45to75: avgs.filter((a) => a >= 45 && a <= 75).length,
      over75: avgs.filter((a) => a > 75).length,
    },
    zoom: {
      underBar: growths.filter((g) => g < ZOOM_BAR).length,
      medianLowest: median(growths),
      vw: ok.filter((p) => p.audit.findings.some((f) => f.rule === 'MT-ZOOM-VW')).length,
    },
    rules,
    verdicts: {
      block: ok.filter((p) => /^Block/.test(p.audit.verdict)).length,
      approveToFix: ok.filter((p) => /^Approve, /.test(p.audit.verdict)).length,
      approve: ok.filter((p) => p.audit.verdict === 'Approve').length,
    },
  };
}

function summarize(pages) {
  const ok = pages.filter((p) => p.status === 'ok');
  const byCategory = {};
  for (const c of [...new Set(ok.map((p) => p.category))].sort()) byCategory[c] = summarizeOk(ok.filter((p) => p.category === c));
  return { ...summarizeOk(ok), failed: pages.length - ok.length, byCategory };
}

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const firstByLocation = (a) => [...a].sort((x, y) => x.location.localeCompare(y.location))[0];

// The spot-check draw: pages with the rule, ordered by a hash of URL and rule, first finding by location.
function spotSample(pages, rule, n) {
  return pages
    .filter((p) => p.status === 'ok' && p.audit.findings.some((f) => f.rule === rule))
    .sort((a, b) => hash(`${a.url}|${rule}`).localeCompare(hash(`${b.url}|${rule}`)))
    .slice(0, n)
    .map((p) => ({ url: p.url, ...firstByLocation(p.audit.findings.filter((f) => f.rule === rule)) }));
}

function lineSample(pages, n) {
  return pages
    .filter((p) => p.status === 'ok' && p.lines && p.lines.fullLines >= MIN_FULL_LINES)
    .sort((a, b) => hash(`${a.url}|lines`).localeCompare(hash(`${b.url}|lines`)))
    .slice(0, n)
    .map((p) => ({ url: p.url, selector: p.lines.selector, avg: p.lines.avgCharsPerLine, fullLines: p.lines.fullLines, min: p.lines.minCharsPerLine, max: p.lines.maxCharsPerLine }));
}

function report(pages) {
  const s = summarize(pages);
  const pct = (n, d) => (d ? `${n} of ${d} (${Math.round((n / d) * 100)}%)` : '0');
  const rows = [['all', s], ...Object.entries(s.byCategory)];
  const out = [];
  out.push(`Pages audited: ${s.pages}; failed and replaced or lost: ${s.failed}.`, '');
  out.push('## Line length', '', '| Category | Pages measured | Median characters per line | Under 45 | 45 to 75 | Over 75 | Too little text |', '|---|--:|--:|--:|--:|--:|--:|');
  for (const [k, v] of rows) out.push(`| ${k} | ${v.lines.measured} | ${v.lines.median} | ${v.lines.under45} | ${v.lines.in45to75} | ${v.lines.over75} | ${v.lines.noText} |`);
  out.push('', '## Zoom', '', '| Category | Pages | Under 1.6× at 200% | Median lowest growth | MT-ZOOM-VW |', '|---|--:|--:|--:|--:|');
  for (const [k, v] of rows) out.push(`| ${k} | ${v.pages} | ${v.zoom.underBar} | ${v.zoom.medianLowest} | ${v.zoom.vw} |`);
  out.push('', '## Verdicts', '', '| Category | Block | Approve, with work left | Approve |', '|---|--:|--:|--:|');
  for (const [k, v] of rows) out.push(`| ${k} | ${v.verdicts.block} | ${v.verdicts.approveToFix} | ${v.verdicts.approve} |`);
  out.push('', '## Rules', '', '| Rule | Pages | HIGH | MEDIUM | LOW |', '|---|--:|--:|--:|--:|');
  for (const [rule, r] of Object.entries(s.rules).sort((a, b) => b[1].pages - a[1].pages)) out.push(`| ${rule} | ${pct(r.pages, s.pages)} | ${r.HIGH} | ${r.MEDIUM} | ${r.LOW} |`);
  const nv = {};
  for (const p of pages.filter((x) => x.status === 'ok')) for (const n of new Set(p.audit.notVerified.map((t) => t.replace(/\d+/g, 'N').replace(/: .*$/, '')))) nv[n] = (nv[n] || 0) + 1;
  out.push('', '## Not verified', '', '| Entry | Pages |', '|---|--:|');
  for (const [n, c] of Object.entries(nv).sort((a, b) => b[1] - a[1]).slice(0, 12)) out.push(`| ${n} | ${c} |`);
  out.push('', '## Spot-check draw', '');
  for (const rule of CHECKED_RULES) {
    out.push(`### ${rule}`, '');
    for (const f of spotSample(pages, rule, 5)) out.push(`- ${f.url} | ${f.location} | ${f.measured}`);
    out.push('');
  }
  out.push('### Line counts', '');
  for (const l of lineSample(pages, 5)) out.push(`- ${l.url} | ${l.selector} | ${l.avg} (${l.min} to ${l.max}, ${l.fullLines} lines)`);
  return out.join('\n');
}

if (require.main === module) {
  const dir = path.join(process.argv[2], 'pages');
  const pages = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  console.log(report(pages));
}

module.exports = { growthOf, lowestGrowth, summarize, spotSample, lineSample, report };
