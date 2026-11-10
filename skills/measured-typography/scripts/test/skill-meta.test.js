// Spec 0003 J1-J3 and K5: the skill's description and its no-install path.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skill = fs.readFileSync(path.join(__dirname, '..', '..', 'SKILL.md'), 'utf8');
const front = /^---\n([\s\S]*?)\n---/.exec(skill)[1];
const description = /description: >-\n([\s\S]*?)\n[a-z]+:/.exec(front)[1].replace(/\s+/g, ' ').trim();

test('J1 the description makes no priority claim over other skills', () => {
  assert.doesNotMatch(description, /\bfirst\b|ahead of|before (any|other)/i, description);
});

test('J2 the description says it works alongside other frontend and design skills', () => {
  assert.match(description, /alongside/i);
  assert.match(description, /design-system|design system/i);
});

test('J3 the description fits the 1024-character limit', () => {
  assert.ok(description.length <= 1024, `${description.length} characters`);
});

test('L the description names dense product UI so those requests load the skill', () => {
  assert.match(description, /table/i);
  assert.match(description, /label/i);
});

test('K5 SKILL.md describes the no-install path and the lite flag', () => {
  assert.match(skill, /estimate-measure\.js/);
  assert.match(skill, /--lite/);
});
