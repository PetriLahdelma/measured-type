// Spec 0031: leading by line length, links by colour alone, the x-height floor.
// Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const REFS = path.join(SCRIPTS, '..', 'references');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const measure = require(path.join(SCRIPTS, 'measure-line.js'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-gap-review-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const PROSE = 'Typesetting is the craft of arranging words so that a reader can follow them without noticing the arrangement, and the measure, the leading and the size decide most of it. ';
const page = (name, css, body = `<p>${PROSE.repeat(5)}</p>`, lang = 'en') => {
  const file = path.join(tmp, `${name}.html`);
  fs.writeFileSync(file, `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name}</title><style>body { margin: 2rem; font-family: Georgia, serif; color: #222; background: #fff; } ${css}</style></head><body><main>${body}</main></body></html>`);
  return file;
};
const run = (file) => audit(file, { browser });
const find = (r, rule) => r.findings.filter((f) => f.rule === rule);

test('Y1 measureLines reports the leading, with normal resolved, and measure-line.js prints it with the house floor', () => {
  const set = page('y1-set', 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; }');
  const out = spawnSync(process.execPath, [path.join(SCRIPTS, 'measure-line.js'), set, 'p'], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /leading 1\.5\b/);
  assert.match(out.stdout, /house floor 1\.\d+/);

  const normal = page('y1-normal', 'p { font-size: 1rem; line-height: normal; max-inline-size: 33em; }');
  const json = spawnSync(process.execPath, [path.join(SCRIPTS, 'measure-line.js'), normal, 'p', '--json'], { encoding: 'utf8' });
  assert.equal(json.status, 0, json.stderr);
  const r = JSON.parse(json.stdout);
  assert.equal(typeof r.leading, 'number', json.stdout);
  assert.ok(r.leading > 1 && r.leading < 1.3, `normal resolved to ${r.leading}`);
  const plain = spawnSync(process.execPath, [path.join(SCRIPTS, 'measure-line.js'), normal, 'p'], { encoding: 'utf8' });
  assert.match(plain.stdout, /under the house floor/);
});

test('Y2 the house floor is 1.3 up to 45 characters, 1.4 from 60, straight between', () => {
  const f = measure.leadingFloor;
  assert.equal(typeof f, 'function');
  assert.equal(f(30), 1.3);
  assert.equal(f(45), 1.3);
  assert.equal(Math.round(f(52.5) * 1000) / 1000, 1.35);
  assert.equal(f(60), 1.4);
  assert.equal(f(90), 1.4);
});

test('Y3 the rendered audit reports leading under the floor for the measured line length, and only then', async () => {
  const wide = await run(page('y3-wide', 'p { font-size: 1rem; line-height: 1.35; max-inline-size: 33em; }'));
  const hit = find(wide, 'MT-LH-TIGHT');
  assert.equal(hit.length, 1, JSON.stringify(wide.findings.map((f) => f.rule)));
  assert.equal(hit[0].severity, 'MEDIUM');
  assert.match(hit[0].measured, /line-height 1\.35 at \d+(\.\d)? characters per line/);
  assert.match(hit[0].measured, /floor 1\.4/);
  assert.match(hit[0].fix, /line-height: 1\.5\b/);

  const normal = await run(page('y3-normal', 'p { font-size: 1rem; line-height: normal; max-inline-size: 33em; }'));
  assert.equal(find(normal, 'MT-LH-TIGHT').length, 1, 'normal leading at a book measure is under the floor');

  const narrow = await run(page('y3-narrow', 'p { font-size: 1rem; line-height: 1.35; max-inline-size: 17em; }'));
  assert.equal(find(narrow, 'MT-LH-TIGHT').length, 0, 'a short measure takes 1.35');

  const open = await run(page('y3-open', 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; }'));
  assert.equal(find(open, 'MT-LH-TIGHT').length, 0);

  const container = await run(page('y3-container', 'div.c { line-height: 0; max-inline-size: 33em; } div.c p { font-size: 1rem; line-height: 1.5; margin: 0; }', `<div class="c"><p>${PROSE.repeat(5)}</p></div>`));
  assert.equal(find(container, 'MT-LH-TIGHT').length, 0, 'the rendered pitch counts, not a container line-height of 0');

  const nav = await run(page('y3-nav', 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; } nav p { line-height: 1.1; }', `<nav><p>${PROSE.repeat(4)}</p></nav><p>${PROSE.repeat(5)}</p>`));
  assert.equal(find(nav, 'MT-LH-TIGHT').length, 0, 'navigation is not running text');

  const card = await run(page('y3-card', 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; } p.card { line-height: 1.15; max-inline-size: 9em; }', `<p class="card">${PROSE.repeat(2)}</p><p>${PROSE.repeat(5)}</p>`));
  assert.equal(find(card, 'MT-LH-TIGHT').length, 0, 'a column under 30 characters is a card or a sidebar');

  const standfirst = await run(page('y3-lead', 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; } p.lead { font-size: 1.3125rem; line-height: 1.3; }', `<p class="lead">${PROSE.repeat(2)}</p><p>${PROSE.repeat(5)}</p>`));
  assert.equal(find(standfirst, 'MT-LH-TIGHT').length, 0, 'a lead paragraph 15% or more above the body size sets tighter');

  const cjk = await run(page('y3-cjk', 'p { font-size: 1rem; line-height: 1.2; max-inline-size: 30em; }', `<p>${'活字を組むことは、読者が配置に気づかずに言葉を追えるように並べる技術であり、行の長さと行送りと大きさがその大部分を決める。'.repeat(6)}</p>`, 'ja'));
  assert.equal(find(cjk, 'MT-LH-TIGHT').length, 0, 'CJK text is set to other conventions');
});

const link = (style, text = 'the measure') => `<p>${PROSE.repeat(2)}Read more about <a href="#m" style="${style}">${text}</a> in the next chapter. ${PROSE.repeat(2)}</p>`;
const LINK_CSS = 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; }';

test('Y4 a link in running text with no cue but a colour under 3:1 against the text is HIGH', async () => {
  const r = await run(page('y4-hit', LINK_CSS, link('color: #3a3a5a; text-decoration: none')));
  const hit = find(r, 'MT-LINK-COLOUR');
  assert.equal(hit.length, 1, JSON.stringify(r.findings.map((f) => f.rule)));
  assert.equal(hit[0].severity, 'HIGH');
  assert.match(hit[0].measured, /\d\.\d+:1 against the text/);
  assert.match(hit[0].fix, /underline/);

  for (const [name, style] of [
    ['underline', 'color: #3a3a5a'],
    ['weight', 'color: #3a3a5a; text-decoration: none; font-weight: 700'],
    ['border', 'color: #3a3a5a; text-decoration: none; border-block-end: 1px solid'],
    ['italic', 'color: #3a3a5a; text-decoration: none; font-style: italic'],
  ]) {
    const ok = await run(page(`y4-${name}`, LINK_CSS, link(style)));
    assert.equal(find(ok, 'MT-LINK-COLOUR').length, 0, `${name} is a cue`);
  }

  const invisible = await run(page('y4-transparent', LINK_CSS, link('color: #3a3a5a; text-decoration-color: transparent')));
  assert.equal(find(invisible, 'MT-LINK-COLOUR').length, 1, 'an underline drawn in a transparent colour is no cue');

  const pseudo = await run(page('y4-pseudo', `${LINK_CSS} a.u { position: relative; } a.u::after { content: ""; position: absolute; inset-inline: 0; inset-block-end: -2px; border-block-end: 1px solid; }`, link('color: #3a3a5a; text-decoration: none" class="u')));
  assert.equal(find(pseudo, 'MT-LINK-COLOUR').length, 0, 'an underline drawn by a pseudo-element is a cue');

  const many = await run(page('y4-many', LINK_CSS, link('color: #3a3a5a; text-decoration: none') + link('color: #3a3a5a; text-decoration: none') + link('color: #3a3a5a; text-decoration: none')));
  const grouped = find(many, 'MT-LINK-COLOUR');
  assert.equal(grouped.length, 1, 'links styled alike are one finding');
  assert.match(grouped[0].measured, /3 links styled alike/);

  const toc = await run(page('y4-toc', LINK_CSS, `<ul><li><a href="#a" style="color: #3a3a5a; text-decoration: none">Introduction</a><ul><li><a href="#b" style="color: #3a3a5a; text-decoration: none">${PROSE}</a></li></ul></li></ul>${link('')}`));
  assert.equal(find(toc, 'MT-LINK-COLOUR').length, 0, 'a list of links is not running text');

  const navLink = await run(page('y4-nav', LINK_CSS, `<nav>${link('color: #3a3a5a; text-decoration: none')}</nav>`));
  assert.equal(find(navLink, 'MT-LINK-COLOUR').length, 0, 'links in navigation are interface');

  const list = await run(page('y4-list', LINK_CSS, `<ul><li><a href="#a" style="color: #3a3a5a; text-decoration: none">${PROSE}</a></li></ul>${link('')}`));
  assert.equal(find(list, 'MT-LINK-COLOUR').length, 0, 'a link that is the whole block is not running text');
});

test('Y5 a link told apart by colour at 3:1 or more is listed under Not verified for its hover and focus cue', async () => {
  const r = await run(page('y5', LINK_CSS, link('color: #1a73e8; text-decoration: none')));
  assert.equal(find(r, 'MT-LINK-COLOUR').length, 0, JSON.stringify(r.findings));
  assert.ok(r.notVerified.some((n) => /hover and focus/.test(n) && /colour/.test(n)), JSON.stringify(r.notVerified));
});

test('Y6 MT-SIZE-FLOOR reports 16px reading text whose x-height is under 7px, with the size for 8px', async () => {
  const low = await run(page('y6-low', 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; font-size-adjust: 0.4; }'));
  const hit = find(low, 'MT-SIZE-FLOOR');
  assert.equal(hit.length, 1, JSON.stringify(low.findings.map((f) => f.rule)));
  assert.match(hit[0].measured, /x-height 6\.4px/);
  assert.match(hit[0].measured, /0\.40/);
  assert.match(hit[0].fix, /font-size: 1\.25rem/);
  assert.match(hit[0].fix, /font-size-adjust: ex-height 0\.5/);

  const fine = await run(page('y6-fine', 'p { font-size: 1rem; line-height: 1.5; max-inline-size: 33em; font-size-adjust: 0.5; }'));
  assert.equal(find(fine, 'MT-SIZE-FLOOR').length, 0);

  const small = await run(page('y6-small', 'p { font-size: 0.875rem; line-height: 1.5; max-inline-size: 33em; font-size-adjust: 0.4; }'));
  const once = find(small, 'MT-SIZE-FLOOR');
  assert.equal(once.length, 1, 'text under 16px keeps one finding');
  assert.match(once[0].measured, /14px reading text/);
});

test('Y7 the references give the band and the catalogue lists the new checks', () => {
  const rules = fs.readFileSync(path.join(REFS, 'rules.md'), 'utf8');
  const audit = fs.readFileSync(path.join(REFS, 'audit.md'), 'utf8');
  const s221 = rules.slice(rules.indexOf('### 2.2.1'), rules.indexOf('### 2.2.2'));
  assert.match(s221, /45/);
  assert.match(s221, /60/);
  assert.match(s221, /Schöndorfer/);
  assert.match(audit, /\| MT-LINK-COLOUR \| HIGH \|/);
  assert.match(audit, /\| MT-LH-TIGHT \|[^\n]*line length/);
  assert.match(audit, /\| MT-SIZE-FLOOR \|[^\n]*x-height/);
});
