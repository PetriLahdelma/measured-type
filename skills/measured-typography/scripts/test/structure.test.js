// Spec 0023: the skill's shape follows Anthropic's authoring guidance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(SKILL, p), 'utf8');
const refs = fs.readdirSync(path.join(SKILL, 'references')).filter((f) => f.endsWith('.md'));
const long = refs.filter((f) => read(`references/${f}`).split('\n').length > 100);
const words = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}.\s]/gu, ' ').replace(/\.(?!\d)/g, ' ').split(/\s+/).filter(Boolean);

// The ## headings of a file, and the text of its ## Contents section.
function sections(text) {
  const heads = text.split('\n').filter((l) => /^## /.test(l)).map((l) => l.slice(3).trim());
  const at = text.indexOf('\n## Contents\n');
  const end = at === -1 ? -1 : text.indexOf('\n## ', at + 1);
  return { heads, contents: at === -1 ? '' : text.slice(at, end === -1 ? undefined : end) };
}

// A section of SKILL.md, from its ### heading to the next heading, with line
// wraps collapsed so a phrase matches wherever the paragraph breaks.
function workflow(name) {
  const skill = read('SKILL.md');
  const at = skill.indexOf(`### ${name}`);
  assert.notEqual(at, -1, `no "### ${name}" in SKILL.md`);
  const next = skill.slice(at + 4).search(/\n#{2,3} /);
  return skill.slice(at, next === -1 ? undefined : at + 4 + next).replace(/\s+/g, ' ');
}

test('S1 every reference over 100 lines opens with a Contents section', () => {
  assert.ok(long.length >= 5, `${long.length} long references`);
  for (const f of long) {
    const { heads } = sections(read(`references/${f}`));
    assert.equal(heads[0], 'Contents', `references/${f}: first ## heading is "${heads[0]}"`);
  }
});

test('S2 every ## heading of a long reference is in its Contents list', () => {
  for (const f of long) {
    const { heads, contents } = sections(read(`references/${f}`));
    const listed = words(contents).join(' ');
    for (const h of heads.slice(1)) {
      const key = words(h).slice(0, 2).join(' ');
      assert.ok(listed.includes(key), `references/${f}: "${h}" is not in Contents`);
    }
  }
});

test('S2 a heading missing from the Contents list is caught', () => {
  const { heads, contents } = sections('# T\n\n## Contents\n\n- Alpha one\n\n## Alpha one\n\n## Beta two\n');
  const listed = words(contents).join(' ');
  assert.deepEqual(heads.slice(1).filter((h) => !listed.includes(words(h).slice(0, 2).join(' '))), ['Beta two']);
});

test('S3 every reference a reference points to is named in SKILL.md', () => {
  const skill = read('SKILL.md');
  for (const f of refs) {
    for (const other of refs.filter((o) => o !== f && read(`references/${f}`).includes(o))) {
      assert.ok(skill.includes(`references/${other}`), `references/${f} points to ${other}, which SKILL.md does not name`);
    }
  }
});

test('S4 SKILL.md is under 500 lines', () => {
  const n = read('SKILL.md').split('\n').length;
  assert.ok(n < 500, `${n} lines`);
});

test('T1 SKILL.md ties no instruction to a year', () => {
  const body = read('SKILL.md').replace(/^---\n[\s\S]*?\n---\n/, '');
  assert.doesNotMatch(body, /\b(for|as of|in|since|until|before|after) 20\d\d\b/i);
});

test('F1 the audit workflow reruns the tools after fixes and reports what still fails', () => {
  const audit = workflow('Auditing existing CSS or a page');
  assert.match(audit, /fix[\s\S]{0,80}run the same tools again|run the same tools again[\s\S]{0,80}fix/i);
  assert.match(audit, /still fails/i);
});

test('F2 the type-scale workflow reruns type-scale.js until it exits 0', () => {
  assert.match(workflow('Building or reviewing a type scale'), /change the inputs[\s\S]{0,60}until it exits 0/i);
});
