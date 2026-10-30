#!/usr/bin/env node
// Spec 0016 triggering eval: the real skill folder installed as a project
// skill, a small site to work in, and a load counted any time before the
// agent's first edit (not only on its first tool call).
//
//   node evals/triggering/session.js --set evals/triggering/trigger-eval.json \
//     --out evals/triggering/results/<name>.json [--runs 3] [--model claude-opus-5-5]
//     [--workers 4] [--description-file d.txt] [--max-turns 12] [--timeout 300]
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const ACTS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
// Tools that would leave the working directory or start other agents.
const OFF = ['Task', 'Workflow', 'WebSearch', 'WebFetch', 'Artifact', 'ArtifactComments', 'ArtifactData', 'CronCreate',
  'CronDelete', 'CronList', 'RemoteTrigger', 'PushNotification', 'ScheduleWakeup', 'EnterWorktree', 'ExitWorktree',
  'DesignSync', 'SendMessage', 'ListAgents', 'Monitor', 'TaskStop'];
const READ_ONLY_BASH = ['ls', 'cat', 'head', 'tail', 'wc', 'find', 'grep', 'file'].map((c) => `Bash(${c}:*)`);

// Reads stream-json events one at a time; step() returns true once the
// outcome is settled (the skill loaded, the agent edited, or the run ended).
class Verdict {
  constructor(name) {
    this.name = name;
    this.calls = 0;
    this.loadCall = null;
    this.acted = false;
    this.done = false;
  }

  isLoad(tool, input = {}) {
    if (tool === 'Skill') return new RegExp(`(^|:)${this.name}$`).test(String(input.skill || ''));
    if (tool === 'Read') return String(input.file_path || '').replace(/\\/g, '/').endsWith(`skills/${this.name}/SKILL.md`);
    return false;
  }

  step(event) {
    if (this.done) return true;
    if (event.type === 'result') return (this.done = true);
    if (event.type !== 'assistant' || event.parent_tool_use_id) return false;
    for (const item of (event.message && event.message.content) || []) {
      if (item.type !== 'tool_use') continue;
      this.calls++;
      if (this.isLoad(item.name, item.input)) {
        this.loadCall = this.calls;
        return (this.done = true);
      }
      if (ACTS.has(item.name)) {
        this.acted = true;
        return (this.done = true);
      }
    }
    return false;
  }

  value() {
    const loaded = this.loadCall !== null;
    return { loaded, beforeActing: loaded, firstCall: this.loadCall === 1, loadCall: this.loadCall, acted: this.acted, calls: this.calls };
  }
}

function summarize(runs) {
  const byQuery = new Map();
  for (const r of runs) {
    if (!byQuery.has(r.query)) byQuery.set(r.query, { query: r.query, should_trigger: r.should_trigger, runs: [] });
    byQuery.get(r.query).runs.push(r.verdict);
  }
  const queries = [...byQuery.values()].map((q) => {
    const rate = q.runs.filter((v) => v.beforeActing).length / q.runs.length;
    const firstCallRate = q.runs.filter((v) => v.firstCall).length / q.runs.length;
    return { query: q.query, should_trigger: q.should_trigger, rate, firstCallRate, runs: q.runs.length, pass: q.should_trigger ? rate > 0.5 : rate < 0.5 };
  });
  const should = queries.filter((q) => q.should_trigger);
  const near = queries.filter((q) => !q.should_trigger);
  const mean = (a, k) => (a.length ? a.reduce((s, q) => s + q[k], 0) / a.length : 0);
  return {
    queries,
    totals: {
      shouldPassed: should.filter((q) => q.pass).length,
      should: should.length,
      nearPassed: near.filter((q) => q.pass).length,
      near: near.length,
      meanShouldRate: mean(should, 'rate'),
      meanShouldFirstCallRate: mean(should, 'firstCallRate'),
    },
  };
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (e.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

// The working directory: the site in workspace/ plus the skill under
// .claude/skills/, with the description replaced when tuning.
function workspace(skillDir, description) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-trigger-'));
  copyDir(path.join(__dirname, 'workspace'), dir);
  const skill = path.join(dir, '.claude', 'skills', path.basename(skillDir));
  copyDir(skillDir, skill);
  if (description) {
    const file = path.join(skill, 'SKILL.md');
    const text = fs.readFileSync(file, 'utf8');
    const block = `description: >-\n${description.trim().split('\n').map((l) => `  ${l}`).join('\n')}\n`;
    fs.writeFileSync(file, text.replace(/^description:[\s\S]*?(?=^[a-z_-]+:|^---)/m, block));
  }
  return dir;
}

function runOne({ query, skillDir, description, model, maxTurns, timeout }) {
  const dir = workspace(skillDir, description);
  const args = ['-p', query, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project',
    '--strict-mcp-config', '--no-session-persistence', '--max-turns', String(maxTurns), '--model', model,
    '--disallowedTools', ...OFF, '--allowedTools', 'Read', 'Glob', 'Grep', ...READ_ONLY_BASH];
  const env = { ...process.env };
  delete env.CLAUDECODE;
  return new Promise((resolve) => {
    const verdict = new Verdict(path.basename(skillDir));
    let skills = null;
    let buffer = '';
    const child = spawn('claude', args, { cwd: dir, env, stdio: ['ignore', 'pipe', 'ignore'] });
    const finish = (status) => {
      clearTimeout(timer);
      if (child.exitCode === null) child.kill('SIGKILL');
      fs.rmSync(dir, { recursive: true, force: true });
      resolve({ verdict: verdict.value(), status, skillOffered: skills ? skills.includes(path.basename(skillDir)) : null });
    };
    const timer = setTimeout(() => finish('timeout'), timeout * 1000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i).trim();
        buffer = buffer.slice(i + 1);
        if (!line) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (event.type === 'system' && event.subtype === 'init') skills = event.skills || [];
        if (verdict.step(event)) return finish('settled');
      }
    });
    child.on('close', () => finish('exited'));
  });
}

async function main() {
  const opt = { runs: 3, model: 'claude-opus-5-5', workers: 4, maxTurns: 12, timeout: 300, skillDir: path.join(ROOT, 'skills', 'measured-type') };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    opt[key] = argv[++i];
  }
  if (!opt.set || !opt.out) throw new Error('usage: session.js --set <eval.json> --out <result.json> [options]');
  const description = opt.descriptionFile ? fs.readFileSync(opt.descriptionFile, 'utf8') : null;
  const set = JSON.parse(fs.readFileSync(opt.set, 'utf8'));
  const jobs = set.flatMap((item) => Array.from({ length: Number(opt.runs) }, () => item));
  const runs = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const item = jobs[next++];
      const r = await runOne({ query: item.query, skillDir: path.resolve(opt.skillDir), description, model: opt.model, maxTurns: Number(opt.maxTurns), timeout: Number(opt.timeout) });
      runs.push({ query: item.query, should_trigger: item.should_trigger, ...r });
      process.stderr.write(`${runs.length}/${jobs.length} ${r.verdict.loaded ? 'loaded' : r.verdict.acted ? 'acted ' : 'none  '} ${r.status} ${item.query.slice(0, 60)}\n`);
    }
  };
  await Promise.all(Array.from({ length: Number(opt.workers) }, worker));
  const summary = summarize(runs);
  const out = { date: new Date().toISOString(), model: opt.model, runsPerQuery: Number(opt.runs), maxTurns: Number(opt.maxTurns), set: path.relative(ROOT, path.resolve(opt.set)), descriptionFile: opt.descriptionFile || null, ...summary, runs };
  fs.mkdirSync(path.dirname(opt.out), { recursive: true });
  fs.writeFileSync(opt.out, `${JSON.stringify(out, null, 2)}\n`);
  const t = summary.totals;
  console.log(`typography tasks ${t.shouldPassed}/${t.should}, near misses ${t.nearPassed}/${t.near}, mean load before acting ${(t.meanShouldRate * 100).toFixed(0)}%, on first call ${(t.meanShouldFirstCallRate * 100).toFixed(0)}%`);
  const unoffered = runs.filter((r) => r.skillOffered === false).length;
  if (unoffered) console.log(`warning: ${unoffered} runs did not list the skill at start`);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { Verdict, summarize, workspace };
