#!/usr/bin/env node
/**
 * House style for prose (spec 0011, CONTRIBUTING.md "Writing the text").
 *
 *   node tools/prose-check.js            # every Markdown file in the repository
 *   node tools/prose-check.js docs/      # one folder or file
 *
 * Reports em dashes, middle dots and serial commas ("A, B, and C") as
 * file:line, skipping code, URLs and blockquotes. Exit code 1 when anything is
 * reported. No dependencies.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
// Agent outputs and test fixtures are data, not house prose.
const SKIP = [/(^|[\\/])node_modules([\\/]|$)/, /(^|[\\/])\.git([\\/]|$)/, /\.github[\\/]brand/, /evals[\\/]results[\\/][^\\/]+[\\/]runs[\\/]/, /evals[\\/]results[\\/].*[\\/]outputs[\\/]/, /evals[\\/][^\\/]+[\\/]files[\\/]/, /scripts[\\/]test[\\/]/];

function files(target) {
  const out = [];
  const walk = (p) => {
    if (SKIP.some((re) => re.test(path.relative(ROOT, p)))) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const e of fs.readdirSync(p).sort()) walk(path.join(p, e));
    else if (/\.md$/i.test(p)) out.push(p);
  };
  walk(target);
  return out;
}

// Replace what is not prose with spaces of the same length, so columns and
// lines stay where they were.
const blank = (s) => s.replace(/[^\n]/g, ' ');
function prose(text) {
  const lines = text.split('\n');
  let fence = null;
  let comment = false;
  return lines.map((line) => {
    if (fence) { if (line.trim().startsWith(fence)) fence = null; return ''; }
    const f = /^\s*(```|~~~)/.exec(line);
    if (f) { fence = f[1]; return ''; }
    if (comment) { if (line.includes('-->')) comment = false; return ''; }
    if (/^\s*<!--/.test(line) && !line.includes('-->')) { comment = true; return ''; }
    if (/^\s*>/.test(line)) return '';
    return line
      .replace(/<!--.*?-->/g, blank)
      .replace(/`[^`]*`/g, blank)
      .replace(/\]\([^)]*\)/g, (m) => `]${blank(m.slice(1))}`)
      .replace(/https?:\/\/\S+/g, blank)
      .replace(/<[^>]+>/g, (tag) => tag.replace(/^<[^>]*?(alt|title)="([^"]*)"[^>]*>$/, (m, a, v) => blank(m.slice(0, m.indexOf(v))) + v + blank(m.slice(m.indexOf(v) + v.length))).replace(/^<[^"]*>$/, blank));
  });
}

const LIST_DELIM = /[.;:!?()|\n]/;
const CONJ = /\b(and|or)\b/i;

// "A, B, and C": two short items before ", and"/", or", in one sentence,
// neither already joined by "and" or "or" (those commas join clauses).
function serialCommas(paragraph) {
  const hits = [];
  const re = /, (and|or) /g;
  let m;
  while ((m = re.exec(paragraph))) {
    const before = paragraph.slice(0, m.index);
    const c2 = before.lastIndexOf(',');
    if (c2 < 0) continue;
    const item2 = before.slice(c2 + 1);
    if (LIST_DELIM.test(item2)) continue;
    const head = before.slice(0, c2);
    const start = Math.max(head.lastIndexOf(','), ...[...'.;:!?(|'].map((ch) => head.lastIndexOf(ch)));
    const item1 = head.slice(start + 1);
    const ok = (s) => s.trim().length >= 1 && s.trim().length <= 40 && !CONJ.test(s);
    if (!ok(item1) || !ok(item2)) continue;
    // The final item runs to the next comma or sentence break.
    const final = paragraph.slice(m.index + m[0].length).split(/[,.;:!?()|]/)[0];
    const words = (x) => x.trim().split(/\s+/).filter(Boolean).length;
    const short = [item1, item2, final].every((x) => words(x) <= 3);
    hits.push({ at: m.index, level: short ? 'error' : 'note' });
  }
  return hits;
}

function checkText(text) {
  const lines = prose(text);
  const findings = [];
  lines.forEach((line, i) => {
    for (const [ch, rule] of [['—', 'em-dash'], ['·', 'middle-dot']]) {
      let at = line.indexOf(ch);
      while (at !== -1) { findings.push({ rule, level: 'error', line: i + 1, column: at + 1 }); at = line.indexOf(ch, at + 1); }
    }
  });
  // Serial commas can span a line break, so join each paragraph and map back.
  let para = '';
  let map = [];
  const flush = () => {
    for (const { at, level } of serialCommas(para)) findings.push({ rule: 'serial-comma', level, line: map[at] + 1, column: 0 });
    para = '';
    map = [];
  };
  lines.forEach((line, i) => {
    if (!line.trim() || /^\s*(#|\||[-*+] |\d+\. )/.test(line)) flush();
    if (!line.trim()) return;
    const text = `${line.replace(/^\s*([-*+]|\d+\.)\s+/, '').trim()} `;
    for (let k = 0; k < text.length; k++) map.push(i);
    para += text;
  });
  flush();
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

const MESSAGE = {
  'em-dash': 'em dash: use a comma, colon, full stop or a new sentence',
  'middle-dot': 'middle dot: use a comma, a line break or spacing',
  'serial-comma': 'serial comma: no comma before the "and" or "or" that ends a list',
};

if (require.main === module) {
  const targets = process.argv.slice(2);
  const list = (targets.length ? targets : [ROOT]).flatMap((t) => files(path.resolve(t)));
  let errors = 0;
  let notes = 0;
  for (const file of list) {
    for (const f of checkText(fs.readFileSync(file, 'utf8'))) {
      if (f.level === 'error') errors++; else notes++;
      console.log(`${path.relative(process.cwd(), file)}:${f.line} ${f.level} ${MESSAGE[f.rule]}`);
    }
  }
  const tail = notes ? `, ${notes} note${notes === 1 ? '' : 's'} to review` : '';
  console.log(`prose check: ${list.length} files, ${errors} error${errors === 1 ? '' : 's'}${tail}`);
  process.exit(errors ? 1 : 0);
}

module.exports = { checkText, files };
