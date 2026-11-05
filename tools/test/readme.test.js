// Spec 0027: a README that shows the number first. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readme = () => read('README.md');
// Prose is what a reader reads: no fenced code, no HTML tags and no link or image targets.
const prose = (markdown) => markdown.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\]\([^)]*\)/g, ']');
const words = (text) => text.split(/\s+/).filter((w) => /\w/.test(w)).length;
const docs = () => (fs.existsSync(path.join(ROOT, 'docs')) ? fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md')) : []);

// Relative links and image sources, Markdown and HTML, without anchors or URLs.
const relativeLinks = (markdown) => {
  const out = [];
  for (const m of markdown.matchAll(/\]\(([^)\s]+)\)/g)) out.push(m[1]);
  for (const m of markdown.matchAll(/\b(?:src|srcset|href)="([^"]+)"/g)) out.push(m[1]);
  return out.map((l) => l.split('#')[0]).filter((l) => l && !/^(https?:|mailto:|#)/.test(l));
};

test('W1 the README stays within 1,650 words outside code and HTML', () => {
  const n = words(prose(readme()));
  assert.ok(n <= 1650, `${n} words`);
});

test('W2 Install is the first section, opens with the two commands, and the zoom image follows', () => {
  const text = readme();
  const sections = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.equal(sections[0], 'Install', `first section is "${sections[0]}"`);
  const install = text.slice(text.indexOf('## Install'), text.indexOf(`## ${sections[1]}`));
  const firstBlock = /```bash\n([\s\S]*?)```/.exec(install);
  assert.ok(firstBlock, 'no bash block in Install');
  assert.match(firstBlock[1], /npx skills add PetriLahdelma\/measured-type --skill measured-type --agent claude-code -g/);
  assert.match(firstBlock[1], /npm install && npx playwright install chromium/);
  const next = text.slice(text.indexOf(`## ${sections[1]}`), text.indexOf(`## ${sections[2]}`));
  assert.match(next, /zoom-200-light\.png/, 'the zoom image is not in the section after Install');
  assert.match(next, /\| Hero written with the skill \|/, 'the zoom table is not in the section after Install');
});

test('W3 every docs page is linked from the README and every relative link resolves', () => {
  const text = readme();
  assert.ok(docs().length >= 3, `only ${docs().length} docs pages`);
  for (const f of docs()) assert.ok(text.includes(`docs/${f}`), `README does not link docs/${f}`);
  const check = (file, base) => {
    for (const link of relativeLinks(read(file))) {
      const target = path.resolve(path.join(ROOT, base), link);
      assert.ok(fs.existsSync(target), `${file}: ${link} does not resolve`);
    }
  };
  check('README.md', '.');
  for (const f of docs()) check(path.join('docs', f), 'docs');
});

test('W4 nothing moved out of the README is lost: the evidence, proofs, reference, scripts, Rhythmguard and identity are in docs/', () => {
  const all = docs().map((f) => read(path.join('docs', f))).join('\n');
  for (const needle of [
    'Spec 0017', 'Spec 0018', 'Triggering, real session', 'Plain-words description', 'How to read it',
    'measure-66ch-light.png', 'SourceSerif4-Italic', 'before-after.png',
    'You are deciding', 'Choose a comfortable measure',
    '`page-audit.js`', '`fallback-metrics.py`', 'Reported by', 'reading-page-desktop.jpg',
  ]) {
    assert.ok(all.includes(needle), `docs/ does not contain ${needle}`);
  }
  const text = readme();
  for (const re of [/\/plugin install measured-type@measured-type/, /python3 -m venv/, /MT_PYTHON/, /--agent codex/, /--agent cursor/]) assert.match(text, re);
});
