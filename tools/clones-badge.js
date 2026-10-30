#!/usr/bin/env node
/**
 * Keeps a running total of git clones for the README badge. GitHub reports
 * clones per day for the last 14 days only, and only to the repository's
 * owner, so a daily job on the owner's machine adds each day to a public
 * gist that a shields.io endpoint badge reads:
 *
 *   node tools/clones-badge.js --gist <id>             # fetch, merge, update the gist
 *   node tools/clones-badge.js --gist <id> --dry-run   # print the result, change nothing
 *   node tools/clones-badge.js --out <dir>             # write both files for a new gist
 *
 * The gist holds clones-data.json (one count per day) and clones.json (the
 * badge). Clones include the owner's own and automated ones, so the badge
 * says "clones", never "installs" or "downloads". Needs an authenticated gh.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = 'PetriLahdelma/measured-type';
const GH = process.env.GH_BIN || (fs.existsSync('/opt/homebrew/bin/gh') ? '/opt/homebrew/bin/gh' : 'gh');

// One count per day, keyed by date. A day still in progress comes back
// higher on a later run, so the larger count wins and a total never drops.
function merge(data, traffic) {
  const days = { ...(data.days || {}) };
  for (const c of traffic.clones || []) {
    const date = c.timestamp.slice(0, 10);
    days[date] = Math.max(days[date] ?? 0, c.count);
  }
  const sorted = Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b)));
  return { days: sorted, total: Object.values(sorted).reduce((s, n) => s + n, 0) };
}

function compact(n) {
  const short = (v, unit) => `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}${unit}`;
  if (n >= 1e6) return short(n / 1e6, 'M');
  if (n >= 1e3) return short(n / 1e3, 'k');
  return String(n);
}

function badge(total) {
  return { schemaVersion: 1, label: 'clones', message: compact(total), color: '61645E' };
}

const gh = (args, input) => execFileSync(GH, args, { encoding: 'utf8', input });

function files(data) {
  return {
    'clones-data.json': `${JSON.stringify({ repo: REPO, ...data, updated: new Date().toISOString() }, null, 2)}\n`,
    'clones.json': `${JSON.stringify(badge(data.total))}\n`,
  };
}

function run(argv) {
  const opt = (name) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
  const gist = opt('--gist');
  const out = opt('--out');
  if (!gist && !out) throw new Error('usage: clones-badge.js --gist <id> [--dry-run] | --out <dir>');
  const traffic = JSON.parse(gh(['api', `repos/${REPO}/traffic/clones?per=day`]));
  let stored = { days: {} };
  if (gist) {
    const content = JSON.parse(gh(['api', `gists/${gist}`])).files['clones-data.json']?.content;
    if (content) stored = JSON.parse(content);
  }
  const data = merge(stored, traffic);
  const body = files(data);
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    for (const [name, text] of Object.entries(body)) fs.writeFileSync(path.join(out, name), text);
  } else if (argv.includes('--dry-run')) {
    process.stdout.write(body['clones.json']);
  } else {
    const patch = { files: Object.fromEntries(Object.entries(body).map(([name, content]) => [name, { content }])) };
    gh(['api', '-X', 'PATCH', `gists/${gist}`, '--input', '-'], JSON.stringify(patch));
  }
  console.log(`${new Date().toISOString()} ${data.total} clones over ${Object.keys(data.days).length} days`);
}

if (require.main === module) {
  try {
    run(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { merge, badge, compact };
