// Spec 0026: a plugin manifest, a plugin README and plain words. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const PLUGIN = path.join(ROOT, 'skills', 'measured-type');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const manifest = () => JSON.parse(read(path.join('skills', 'measured-type', '.claude-plugin', 'plugin.json')));
const entry = () => JSON.parse(read(path.join('.claude-plugin', 'marketplace.json'))).plugins.find((p) => p.name === 'measured-type');

const hasClaude = () => {
  const probe = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  return !probe.error && probe.status === 0;
};

test('Q1 the plugin manifest names the plugin, its version, author and metadata, and the folder itself as the skill', () => {
  const m = manifest();
  assert.equal(m.name, 'measured-type');
  const cited = /^version:\s*(\S+)/m.exec(read('CITATION.cff'))[1];
  const logged = /^## (\d+\.\d+\.\d+)/m.exec(read('CHANGELOG.md'))[1];
  assert.equal(m.version, cited, 'plugin.json and CITATION.cff disagree');
  assert.equal(m.version, logged, 'plugin.json and CHANGELOG.md disagree');
  assert.ok(m.description && m.description.length > 20);
  assert.ok(m.author && m.author.name, 'author.name is missing');
  assert.ok(!m.author.email, 'no email address in the manifest');
  assert.match(m.homepage, /^https:\/\//);
  assert.match(m.repository, /^https:\/\/github\.com\/PetriLahdelma\/measured-type/);
  assert.match(m.license, /MIT/);
  assert.ok(Array.isArray(m.keywords) && m.keywords.includes('typography'));
  assert.deepEqual(m.skills, ['./']);
});

test('Q2 the marketplace entry leaves components, strict and version to the manifest', () => {
  const p = entry();
  for (const key of ['skills', 'commands', 'agents', 'hooks', 'strict', 'version']) {
    assert.equal(p[key], undefined, `the entry still sets ${key}`);
  }
  assert.equal(p.source, './skills/measured-type');
});

test('Q2 claude plugin validate --strict passes for the marketplace and for the plugin folder', (t) => {
  if (!hasClaude()) return t.skip('the claude CLI is not installed');
  for (const target of ['.', './skills/measured-type']) {
    const r = spawnSync('claude', ['plugin', 'validate', target, '--strict'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, `${target}: ${r.stdout}${r.stderr}`);
  }
});

const proseWords = (markdown) => markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter((w) => /\w/.test(w)).length;

test('Q3 the plugin README says what the scripts open, download and read, and how to install', () => {
  const file = path.join(PLUGIN, 'README.md');
  assert.ok(fs.existsSync(file), 'skills/measured-type/README.md is missing');
  const readme = fs.readFileSync(file, 'utf8');
  assert.ok(proseWords(readme) >= 40, `${proseWords(readme)} words outside code blocks`);
  for (const re of [/Chromium/, /fontTools/, /the page you name/i, /nothing is sent|no telemetry/i, /npx skills add/, /\/plugin install measured-type@measured-type/, /LICENSE/]) {
    assert.match(readme, re);
  }
});

test('Q4 the description stays the measured wording; the searched words live in the manifest and the READMEs', () => {
  // The plain-words opening was run through spec 0016 and compared with this wording on the same day
  // (evals/triggering/README.md, 5 November 2026): it loaded on near misses the measured wording never
  // loaded on, so the model-facing text stays as measured and discovery text goes where people read it.
  const skill = read(path.join('skills', 'measured-type', 'SKILL.md'));
  const front = /^---\n([\s\S]*?)\n---/.exec(skill)[1];
  const description = /description: >-\n([\s\S]*?)\n[a-z]+:/.exec(front)[1].replace(/\s+/g, ' ').trim();
  assert.match(description, /^Web typesetting specialist\./, 'the description is not the measured wording');
  for (const words of ['line length', 'zoom', 'type scales', 'alongside', 'tables', 'labels', 'lints the source']) {
    assert.ok(description.toLowerCase().includes(words), `description does not say "${words}"`);
  }
  assert.ok(description.length <= 1024, `${description.length} characters`);
  assert.ok(skill.split(/\s+/).filter(Boolean).length <= 2300, 'SKILL.md is over its word budget');
  for (const text of [manifest().description, entry().description, fs.readFileSync(path.join(PLUGIN, 'README.md'), 'utf8')]) {
    assert.match(text, /web typography/i, 'the searched words are missing from a listing text');
  }
});

test('Q5 the README gives skills CLI install lines for Codex and Cursor', () => {
  const readme = read('README.md');
  assert.match(readme, /npx skills add PetriLahdelma\/measured-type --skill measured-type --agent codex/);
  assert.match(readme, /npx skills add PetriLahdelma\/measured-type --skill measured-type --agent cursor/);
});

test('Q6 the plugin folder keeps within the directory limits: files, sizes and stray system files', () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '__pycache__') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(PLUGIN);
  assert.ok(files.length <= 512, `${files.length} files`);
  assert.ok(!files.some((f) => /\.DS_Store$|Thumbs\.db$/.test(f)), 'a system file is in the plugin folder');
  for (const f of files) {
    if (/\.(png|jpe?g|gif|webp|svg|ttf|otf|woff2?)$/i.test(f)) continue;
    const size = fs.statSync(f).size;
    assert.ok(size <= 256 * 1024, `${path.relative(PLUGIN, f)} is ${size} bytes`);
  }
});
