// Spec 0015: .claude-plugin/marketplace.json, the Claude Code plugin route.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const MANIFEST = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const manifest = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const plugin = () => manifest().plugins.find((p) => p.name === 'measured-type');

test('P1 the marketplace lists measured-type from a folder holding SKILL.md', () => {
  const m = manifest();
  assert.equal(m.plugins.length, 1);
  const p = plugin();
  assert.ok(p, 'no plugin named measured-type');
  assert.equal(typeof p.source, 'string', 'source should be a path in this repository');
  assert.ok(fs.existsSync(path.join(ROOT, p.source, 'SKILL.md')), `${p.source}/SKILL.md is missing`);
  assert.deepEqual(p.skills, ['./']);
  assert.equal(p.strict, false);
});

test('P2 the plugin version matches CITATION.cff and the newest CHANGELOG release', () => {
  const cited = /^version:\s*(\S+)/m.exec(read('CITATION.cff'))[1];
  const logged = /^## (\d+\.\d+\.\d+)/m.exec(read('CHANGELOG.md'))[1];
  assert.equal(plugin().version, cited, 'marketplace.json and CITATION.cff disagree');
  assert.equal(plugin().version, logged, 'marketplace.json and CHANGELOG.md disagree');
});

test('P3 the README gives the marketplace install lines', () => {
  const readme = read('README.md');
  assert.match(readme, /\/plugin marketplace add PetriLahdelma\/measured-type/);
  assert.match(readme, /\/plugin install measured-type@measured-type/);
});

test('P4 the manifest names the owner without an email address', () => {
  const m = manifest();
  assert.ok(m.owner && m.owner.name && m.owner.url, JSON.stringify(m.owner));
  assert.doesNotMatch(fs.readFileSync(MANIFEST, 'utf8'), /[\w.+-]+@[\w-]+\.[\w.]+/);
});

test('P5 claude plugin validate passes in strict mode', (t) => {
  const probe = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    t.skip('the claude CLI is not installed');
    return;
  }
  const r = spawnSync('claude', ['plugin', 'validate', '.', '--strict'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('P6 the gate runs every tools test, this file included', () => {
  const { steps } = require(path.join(ROOT, 'tools', 'gate.js'));
  const tools = steps({ skillDir: ROOT, inner: false }).find(([name]) => name === 'tools tests');
  assert.ok(tools, 'the gate has no tools step');
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js'));
  for (const f of files) assert.ok(tools[2].some((a) => a.endsWith(path.join('tools', 'test', f))), `${f} is not run by the gate`);
});
