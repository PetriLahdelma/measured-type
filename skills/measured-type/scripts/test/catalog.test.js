// Spec 0001 A1/A2: the rule catalog in references/audit.md and the scripts agree,
// and SKILL.md sends the agent to every tool.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(SKILL, p), 'utf8');
const catalog = read('references/audit.md');
const catalogIds = new Set([...catalog.matchAll(/^\| (MT-[A-Z0-9-]+) \|/gm)].map((m) => m[1]));
const emitted = (file) => new Set([...read(file).matchAll(/'(MT-[A-Z0-9-]+)'/g)].map((m) => m[1]));

test('A1 every rule a script emits is in the catalog', () => {
  for (const file of ['scripts/lint-css.js', 'scripts/page-audit.js']) {
    for (const id of emitted(file)) assert.ok(catalogIds.has(id), `${file} emits ${id}, missing from audit.md`);
  }
});

test('A1 every catalog rule is emitted by a script', () => {
  const all = new Set([...emitted('scripts/lint-css.js'), ...emitted('scripts/page-audit.js')]);
  for (const id of catalogIds) assert.ok(all.has(id), `${id} is in audit.md but no script emits it`);
});

test('A2 catalog severities are HIGH, MEDIUM or LOW', () => {
  for (const m of catalog.matchAll(/^\| (MT-[A-Z0-9-]+) \| ([A-Z]+) \|/gm)) {
    assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(m[2]), `${m[1]}: ${m[2]}`);
  }
});

test('SKILL.md points to every tool and to the audit format', () => {
  const skill = read('SKILL.md');
  for (const ref of ['scripts/lint-css.js', 'scripts/page-audit.js', 'scripts/fallback-metrics.py', 'scripts/type-scale.js', 'references/audit.md', 'references/screen-and-ui.md', 'scripts/apca.js', 'references/product-ui.md', 'scripts/estimate-measure.js']) {
    assert.ok(skill.includes(ref), `SKILL.md does not mention ${ref}`);
  }
});
