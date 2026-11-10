// Spec 0032: the rest of the 9 November gap review. Test names carry the spec IDs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const { PY, FONTS, fontToolsReady, NO_FONTTOOLS, NO_TEST_FONTS } = require('./helpers.js');

const SCRIPTS = path.join(__dirname, '..');
const REFS = path.join(SCRIPTS, '..', 'references');
const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-gap-rest-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const html = (body, css = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>t</title><style>body { margin: 2rem; font-family: Georgia, serif; color: #222; background: #fff; } p { max-inline-size: 33em; line-height: 1.5; } ${css}</style></head><body><main>${body}</main></body></html>`;
const punct = (r) => r.findings.filter((f) => f.rule === 'MT-PUNCT');
const PROSE = 'Typesetting is the craft of arranging words so that a reader can follow them without noticing the arrangement, and the measure, the leading and the size decide most of it. ';

const FONT_OK = fontToolsReady();
const FILES = fs.existsSync(FONTS);
const serif = path.join(FONTS, 'SourceSerif4[opsz,wght].ttf');
const sans = path.join(FONTS, 'Outfit[wght].ttf');
const metrics = (...args) => spawnSync(PY, [path.join(SCRIPTS, 'font-features.py'), '--metrics', ...args], { encoding: 'utf8' });

test('N1 (c), (TM) and (R) stand-ins are MT-PUNCT, and a list label is not', async () => {
  const r = lint([write('n1.html', html('<p>(c) 2026 Acme Oy. Measured Type(TM) and Acme(R) are names.</p><p>Choose one: (a) the first, (b) the second or (c) the third item.</p>'))]);
  const found = punct(r).map((f) => f.measured).join(' | ');
  assert.match(found, /\(c\)/, found);
  assert.match(found, /\(TM\)/, found);
  assert.match(found, /\(R\)/, found);
  assert.equal(punct(r).filter((f) => /\(c\) the/.test(f.measured)).length, 0, found);
  assert.ok(punct(r).some((f) => /©/.test(f.fix)) && punct(r).some((f) => /™/.test(f.fix)) && punct(r).some((f) => /®/.test(f.fix)), JSON.stringify(punct(r)));

  const rendered = await audit(write('n1r.html', html(`<p>${PROSE}Copyright (c) 2026 Acme Oy.</p>`)), { browser });
  assert.ok(punct(rendered).some((f) => /©/.test(f.fix)), JSON.stringify(rendered.findings));
});

test('N2 a plain space after ¶ or § before a number is MT-PUNCT; a no-break space is not', () => {
  const r = lint([write('n2.html', html('<p>See § 12 and ¶¶ 3–4 of the agreement.</p><p>See §&nbsp;14 for the rest.</p>'))]);
  const hits = punct(r).filter((f) => /no-break/.test(f.fix));
  assert.equal(hits.length, 2, JSON.stringify(punct(r)));
});

test('N3 font-features.py --metrics prints proportions per em and the font-size-adjust value', { skip: (!FONT_OK && NO_FONTTOOLS) || (!FILES && NO_TEST_FONTS) }, () => {
  const r = metrics(serif);
  assert.equal(r.status, 0, r.stderr);
  for (const label of ['x-height', 'cap height', 'ascender', 'descender', 'average a-z width']) assert.match(r.stdout, new RegExp(label), r.stdout);
  assert.match(r.stdout, /font-size-adjust: ex-height 0\.\d{3}/);
  const j = metrics(serif, '--json');
  assert.equal(j.status, 0, j.stderr);
  const m = JSON.parse(j.stdout)[0].metrics;
  assert.ok(m.x_height > 0.4 && m.x_height < 0.55, JSON.stringify(m));
  assert.ok(m.cap_height > m.x_height && m.ascender > m.cap_height * 0.9 && m.descender < 0, JSON.stringify(m));
  assert.ok(m.avg_lowercase_width > 0.3 && m.avg_lowercase_width < 0.7, JSON.stringify(m));
});

test('N4 with two faces, --metrics compares to the first and names the x-height relation', { skip: (!FONT_OK && NO_FONTTOOLS) || (!FILES && NO_TEST_FONTS) }, () => {
  const r = metrics(serif, sans);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /anchor/);
  assert.match(r.stdout, /[+−-]\d+%/);
  assert.match(r.stdout, /x-height (matched|contrasted|neither matched nor contrasted)/);
  const j = JSON.parse(metrics(serif, sans, '--json').stdout);
  assert.equal(j.length, 2);
  assert.ok(['matched', 'contrasted', 'neither'].includes(j[1].pairing.x_height), JSON.stringify(j[1].pairing));
});

test('N5 reading text stepped up by a media query is MT-ZOOM-GROWTH when 200% zoom drops it back under 1.6×', async () => {
  const body = `<p>${PROSE.repeat(4)}</p>`;
  const big = await audit(write('n5-big.html', html(body, 'p { font-size: 1rem; } @media (min-width: 60em) { p { font-size: 1.5rem; } }')), { browser });
  const hit = big.findings.filter((f) => f.rule === 'MT-ZOOM-GROWTH' && /p/.test(f.location));
  assert.equal(hit.length, 1, JSON.stringify(big.findings.map((f) => f.rule)));
  assert.match(hit[0].measured, /1\.33× at 200% zoom/);
  const small = await audit(write('n5-small.html', html(body, 'p { font-size: 1rem; } @media (min-width: 60em) { p { font-size: 1.125rem; } }')), { browser });
  assert.equal(small.findings.filter((f) => f.rule === 'MT-ZOOM-GROWTH').length, 0, 'a step to 18px grows 1.78× and passes');
});

test('N6 the references carry the research note, body steps, the pairing method and table chrome', () => {
  const rules = fs.readFileSync(path.join(REFS, 'rules.md'), 'utf8');
  const s212 = rules.slice(rules.indexOf('### 2.1.2'), rules.indexOf('### 2.1.3'));
  assert.match(s212, /Dyson/);
  const s311 = rules.slice(rules.indexOf('### 3.1.1'), rules.indexOf('## 3.2'));
  assert.match(s311, /viewing distance/);
  assert.match(s311, /1\.78/);
  const taste = fs.readFileSync(path.join(REFS, 'taste.md'), 'utf8');
  assert.match(taste, /Brown/);
  assert.match(taste, /--metrics/);
  const ui = fs.readFileSync(path.join(REFS, 'product-ui.md'), 'utf8');
  assert.match(ui, /zebra/i);
  assert.match(ui, /Tschichold/);
});
