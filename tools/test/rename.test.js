// Spec 0033: the skill and plugin are named measured-typography. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const NEW = 'measured-typography';
const docs = () => ['README.md', 'skills/measured-typography/README.md', ...fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];

test('E1 the skill folder and its SKILL.md name are measured-typography', () => {
  const skill = read(`skills/${NEW}/SKILL.md`);
  const front = skill.slice(0, skill.indexOf('\n---', 4));
  assert.match(front, /^name: measured-typography$/m);
});

test('E2 the plugin is measured-typography everywhere, the marketplace keeps its name and maps the old one', () => {
  const market = json('.claude-plugin/marketplace.json');
  assert.equal(market.name, 'measured-type');
  const entry = market.plugins.find((p) => p.name === NEW);
  assert.ok(entry, JSON.stringify(market.plugins));
  assert.equal(entry.source, `./skills/${NEW}`);
  assert.deepEqual(market.renames, { 'measured-type': NEW });
  assert.equal(json(`skills/${NEW}/.claude-plugin/plugin.json`).name, NEW);
  assert.equal(json('.cursor-plugin/plugin.json').name, NEW);
});

test('E3 every install line and first-task prompt uses the new name', () => {
  const readme = read('README.md');
  assert.match(readme, /--skill measured-typography --agent claude-code -g/);
  assert.match(readme, /\/plugin install measured-typography@measured-type/);
  assert.match(readme, /Use measured-typography to/);
  for (const file of docs()) {
    const text = read(file);
    assert.doesNotMatch(text, /--skill measured-type\b(?!-)/, `${file}: old --skill`);
    assert.doesNotMatch(text, /measured-type@measured-type/, `${file}: old plugin install`);
    assert.doesNotMatch(text, /Use measured-type\b/, `${file}: old first-task prompt`);
    assert.doesNotMatch(text, /skills\/measured-type\//, `${file}: old folder path`);
    assert.doesNotMatch(text, /gh skill install PetriLahdelma\/measured-type measured-type\b/, `${file}: old gh skill line`);
  }
});

test('E4 the old folder holds only a pointer README, no second skill', () => {
  const old = path.join(ROOT, 'skills', 'measured-type');
  assert.deepEqual(fs.readdirSync(old), ['README.md']);
  assert.match(read('skills/measured-type/README.md'), /skills\/measured-typography/);
});

test('E5 the repository, marketplace and brand keep their names', () => {
  const readme = read('README.md');
  assert.match(readme, /PetriLahdelma\/measured-type\b(?!-)/);
  assert.match(readme, /Measured Type/);
  assert.match(json(`skills/${NEW}/.claude-plugin/plugin.json`).repository, /github\.com\/PetriLahdelma\/measured-type$/);
});
