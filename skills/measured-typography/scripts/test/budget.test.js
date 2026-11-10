// Spec 0014: SKILL.md stays within its word budget without losing a route.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(SKILL, p), 'utf8');
const words = (t) => t.split(/\s+/).filter(Boolean).length;

test('B1 SKILL.md is at most 2,300 words', () => {
  const n = words(read('SKILL.md'));
  assert.ok(n <= 2300, `${n} words`);
});

test('B2 SKILL.md names every script and every reference', () => {
  const skill = read('SKILL.md');
  const scripts = fs.readdirSync(path.join(SKILL, 'scripts')).filter((f) => /\.(js|py)$/.test(f));
  const refs = fs.readdirSync(path.join(SKILL, 'references')).filter((f) => f.endsWith('.md'));
  for (const f of scripts) assert.ok(skill.includes(`scripts/${f}`) || skill.includes(f), `SKILL.md does not name ${f}`);
  for (const f of refs) assert.ok(skill.includes(`references/${f}`), `SKILL.md does not name references/${f}`);
});

test('B3 the moved detail lives in the references', () => {
  const rules = read('references/rules.md');
  const scale = rules.slice(rules.indexOf('### 3.1.1'), rules.indexOf('## 3.2'));
  assert.match(scale, /5 to 8 sizes/);
  assert.match(scale, /line-height and.*tracking|its own line-height/s);
  assert.match(scale, /multiples of the base line/);
  const audit = read('references/audit.md');
  assert.match(audit, /SCSS and Less|SCSS, Less/);
  assert.match(audit, /cn\(\)/);
  assert.match(audit, /--lite/);
  assert.match(audit, /Not verified/);
});

test('B4 the core rules table is unchanged', () => {
  const table = read('SKILL.md').split('\n').filter((l) => /^\| \d\.\d/.test(l));
  assert.equal(table.length, 18, `${table.length} rule rows`);
  assert.ok(table.some((l) => l.startsWith('| 2.1.2 | Comfortable measure |')));
});
