#!/usr/bin/env node
// Spec 0028 runner: page-audit.js and measure-line.js over the frozen corpus. Resumable: a page
// with a report in <out>/pages is skipped.
//   node evals/0028/run.js --out <folder> [--workers 3]
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPTS = path.join(ROOT, 'skills', 'measured-type', 'scripts');
const TOOL_TIMEOUT = 300 * 1000;
const READING = 'main p, article p, [role=main] p';
const MIN_FULL_LINES = 3;

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const out = opt('out', null);
const workers = Number(opt('workers', 3));
if (!out) { console.error('usage: run.js --out <folder> [--workers 3]'); process.exit(2); }
const PAGES = path.join(out, 'pages');
fs.mkdirSync(PAGES, { recursive: true });

const slug = (url) => url.replace(/^https:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 90);
const fileOf = (url) => path.join(PAGES, `${slug(url)}.json`);

function tool(script, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(SCRIPTS, script), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TOOL_TIMEOUT);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
  });
}

const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

async function lines(url) {
  for (const selector of [READING, 'p']) {
    const r = await tool('measure-line.js', [url, selector, '--json']);
    const m = parse(r.stdout);
    if (r.code === 0 && m && !m.error && m.fullLines >= MIN_FULL_LINES) return { ...m, selector };
    if (selector === 'p') return m && !m.error ? { ...m, selector } : null;
  }
  return null;
}

async function auditOnce(url) {
  const r = await tool('page-audit.js', [url, '--json']);
  if (r.code === 3) { console.error('exit 3: the browser is missing; the study stops'); process.exit(3); }
  const report = parse(r.stdout);
  if ((r.code === 0 || r.code === 1) && report && report.mode === 'rendered') return { report };
  return { error: r.timedOut ? 'timeout' : (r.stderr || r.stdout || `exit ${r.code}`).split('\n')[0].slice(0, 300) };
}

async function runPage({ url, category, role }) {
  const started = Date.now();
  let a = await auditOnce(url);
  if (a.error) a = await auditOnce(url);
  const base = { url, category, role, seconds: 0 };
  const record = a.error
    ? { ...base, status: 'failed', error: a.error }
    : { ...base, status: 'ok', audit: { verdict: a.report.verdict, findings: a.report.findings, notVerified: a.report.notVerified }, lines: await lines(url) };
  record.seconds = Math.round((Date.now() - started) / 1000);
  fs.writeFileSync(fileOf(url), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${record.status === 'ok' ? 'ok    ' : 'FAILED'} ${record.seconds}s ${category} ${url}${a.error ? ` : ${a.error}` : ` : ${record.audit.verdict}, ${record.lines ? record.lines.avgCharsPerLine : 'no'} chars/line`}`);
  return record;
}

const existing = (url) => (fs.existsSync(fileOf(url)) ? parse(fs.readFileSync(fileOf(url), 'utf8')) : null);

async function pool(jobs) {
  let next = 0;
  const done = [];
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      done.push(existing(job.url) || await runPage(job));
    }
  };
  await Promise.all(Array.from({ length: workers }, worker));
  return done;
}

(async () => {
  const { categories } = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus.json'), 'utf8'));
  const primary = Object.entries(categories).flatMap(([category, c]) => c.primary.map((url) => ({ url, category, role: 'primary' })));
  const results = await pool(primary);
  // A failed primary page is replaced by the next reserve in its category, in the order listed.
  for (const [category, c] of Object.entries(categories)) {
    let lost = results.filter((r) => r.category === category && r.status !== 'ok').length;
    for (const url of c.reserve) {
      if (!lost) break;
      const [r] = await pool([{ url, category, role: 'reserve' }]);
      if (r.status === 'ok') lost--;
    }
    if (lost) console.log(`${category}: ${lost} page(s) lost with no reserve left`);
  }
  console.log('DONE');
})();
