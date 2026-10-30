// Spec 0016: evals/triggering/session.js counts a load any time before the agent acts.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const { Verdict, summarize } = require(path.join(ROOT, 'evals', 'triggering', 'session.js'));

const call = (name, input, parent = null) => ({
  type: 'assistant',
  parent_tool_use_id: parent,
  message: { content: [{ type: 'tool_use', name, input }] },
});
const result = { type: 'result', subtype: 'success' };
const run = (events) => {
  const v = new Verdict('measured-type');
  for (const e of events) if (v.step(e)) break;
  return v.value();
};

test('T1 a Skill call naming the skill on the first call loads it before acting', () => {
  const r = run([call('Skill', { skill: 'measured-type' }), result]);
  assert.deepEqual(r, { loaded: true, beforeActing: true, firstCall: true, loadCall: 1, acted: false, calls: 1 });
});

test('T2 a load after looking at files still counts before acting, but not as a first call', () => {
  const r = run([call('Glob', { pattern: '*.css' }), call('Read', { file_path: 'prose.css' }), call('Skill', { skill: 'measured-type' })]);
  assert.equal(r.beforeActing, true);
  assert.equal(r.firstCall, false);
  assert.equal(r.loadCall, 3);
});

test('T3 an edit before any load is a miss, and stepping stops there', () => {
  const v = new Verdict('measured-type');
  assert.equal(v.step(call('Read', { file_path: 'main.css' })), false);
  assert.equal(v.step(call('Edit', { file_path: 'main.css' })), true);
  const r = v.value();
  assert.equal(r.acted, true);
  assert.equal(r.loaded, false);
  assert.equal(r.beforeActing, false);
});

test('T4 reading the SKILL.md file counts as a load; other skills and other files do not', () => {
  assert.equal(run([call('Read', { file_path: '/w/.claude/skills/measured-type/SKILL.md' })]).loaded, true);
  assert.equal(run([call('Skill', { skill: 'design' }), call('Read', { file_path: 'measured-type.css' }), result]).loaded, false);
  assert.equal(run([call('Skill', { skill: 'plugin:measured-type' })]).loaded, true);
});

test('T5 a subagent tool call is ignored and an answer without tools is a miss', () => {
  assert.equal(run([call('Skill', { skill: 'measured-type' }, 'toolu_1'), result]).loaded, false);
  assert.deepEqual(run([{ type: 'assistant', message: { content: [{ type: 'text', text: 'Use clamp().' }] } }, result]),
    { loaded: false, beforeActing: false, firstCall: false, loadCall: null, acted: false, calls: 0 });
});

test('T7 the working directory holds the site and the real skill, with a swapped description when tuning', () => {
  const fs = require('node:fs');
  const { workspace } = require(path.join(ROOT, 'evals', 'triggering', 'session.js'));
  const dir = workspace(path.join(ROOT, 'skills', 'measured-type'), 'Line one of a new description.\nLine two.');
  try {
    const skill = fs.readFileSync(path.join(dir, '.claude', 'skills', 'measured-type', 'SKILL.md'), 'utf8');
    const front = skill.split('---')[1];
    assert.match(front, /^name: measured-type$/m);
    assert.match(front, /description: >-\n {2}Line one of a new description\.\n {2}Line two\.\n/);
    assert.doesNotMatch(front, /Web typesetting specialist/);
    assert.ok(fs.existsSync(path.join(dir, 'prose.css')));
    assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'measured-type', 'scripts', 'measure-line.js')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('T6 a prompt passes when its rate before acting is on the right side of 0.5', () => {
  const runs = [
    { query: 'a', should_trigger: true, verdict: { beforeActing: true, firstCall: false, loaded: true } },
    { query: 'a', should_trigger: true, verdict: { beforeActing: true, firstCall: true, loaded: true } },
    { query: 'a', should_trigger: true, verdict: { beforeActing: false, firstCall: false, loaded: false } },
    { query: 'b', should_trigger: false, verdict: { beforeActing: false, firstCall: false, loaded: false } },
  ];
  const s = summarize(runs);
  assert.equal(s.queries.find((q) => q.query === 'a').rate, 2 / 3);
  assert.equal(s.queries.find((q) => q.query === 'a').firstCallRate, 1 / 3);
  assert.equal(s.queries.find((q) => q.query === 'a').pass, true);
  assert.equal(s.queries.find((q) => q.query === 'b').pass, true);
  assert.deepEqual(s.totals, { shouldPassed: 1, should: 1, nearPassed: 1, near: 1, meanShouldRate: 2 / 3, meanShouldFirstCallRate: 1 / 3 });
});
