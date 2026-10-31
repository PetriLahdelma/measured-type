// Spec 0021: trust fixes from the third council.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));
const { lint } = require(path.join(SCRIPTS, 'lint-css.js'));
const { fitRange } = require(path.join(SCRIPTS, 'type-scale.js'));

const PY = process.env.MT_PYTHON || 'python3';
const FONTS = path.join(__dirname, '..', '..', '..', '..', 'evals', 'ofl-feature-check', 'files', 'fonts');
const ROMAN = path.join(FONTS, 'SourceSerif4[opsz,wght].ttf');
const OUTFIT = path.join(FONTS, 'Outfit[wght].ttf');
const GEORGIA = ['/System/Library/Fonts/Supplemental/Georgia.ttf', '/usr/share/fonts/truetype/msttcorefonts/Georgia.ttf'].find((f) => fs.existsSync(f));
const hasFontTools = spawnSync(PY, ['-c', 'import fontTools'], { encoding: 'utf8' }).status === 0;
const noFonts = !fs.existsSync(ROMAN) ? 'test fonts missing' : !hasFontTools ? `fontTools missing for ${PY} (set MT_PYTHON)` : false;

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-trust-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const lintOne = (name, text) => lint([write(name, text)]);
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));
const cache = new Map();
const run = (name, html) => {
  if (!cache.has(name)) cache.set(name, audit(write(name, html), { browser }));
  return cache.get(name);
};
const page = (body, css = '', lang = 'en') => `<!doctype html><html${lang ? ` lang="${lang}"` : ''}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { margin: 0 1.5rem; font: 1.125rem/1.5 Georgia, serif; color: #1a1a1a; background: #fff; } main { max-inline-size: 34em; } ${css}</style>
</head><body><main>${body}</main></body></html>`;

// ---------- T1 apostrophes ----------

test('T1 MT-QUOTES finds straight apostrophes in words of any length and straight single quotes', () => {
  const html = page(`<p>It's late. They didn't land. The readers' view was clear. She said 'yes' at once.</p>
<p>All curly here: it’s fine.</p><pre><code>const it's = 'code';</code></pre>`);
  const hits = find(lintOne('t1.html', html), 'MT-QUOTES').map((f) => f.measured);
  for (const word of ["It's", "didn't", "readers'", "'yes'"]) assert.ok(hits.some((m) => m.includes(word)), `${word} not reported: ${JSON.stringify(hits)}`);
  assert.ok(!hits.some((m) => /code/.test(m)), JSON.stringify(hits));
});

// ---------- T2 zoom range ----------

test('T2 the two-slope clamp that type-scale.js --fit recommends lints clean; a wide plain ramp still does not', () => {
  const fit = fitRange({ min: 48, max: 84, viewports: [360, 1440] });
  const two = fit.candidates.find((c) => c.form === 'two-slope');
  assert.ok(two && !two.failures.length, JSON.stringify(fit.candidates));
  const r = lintOne('t2-fit.css', `.hero { font-size: ${two.css}; }\n`);
  assert.deepEqual(r.findings.filter((f) => /^MT-ZOOM/.test(f.rule)), [], JSON.stringify(r.findings));
  const wide = lintOne('t2-wide.css', '.hero { font-size: clamp(2rem, 1rem + 4vw, 6rem); }\n');
  assert.ok(wide.findings.some((f) => /^MT-ZOOM/.test(f.rule)), JSON.stringify(wide.findings));
});

// ---------- T3 and T4 capitals ----------

const CAPS = page(`<h1>Orders</h1>
<p>Each order below lists its region, its product and the code the warehouse uses for it.</p>
<table><tbody><tr><td class="region">DACH</td><td class="sku" dir="rtl" lang="ar">رمز المنتج: 4471-BLK</td><td class="cable" dir="rtl" lang="ar">كابل USB-C بطول 2 م</td><td><code class="state">US-IL</code></td></tr></tbody></table>
<span class="label">Shipping status</span>
<p class="shout">Please read these instructions carefully before you submit the form, because an application without every page signed will be returned to you unprocessed.</p>
<div class="warn">ALL APPLICATIONS RECEIVED AFTER THE DEADLINE WILL BE HELD UNTIL THE NEXT ROUND OPENS IN THE SPRING.</div>`,
`td { font-size: 0.875rem; padding: 0.25rem; } .label { display: block; font-size: 0.75rem; text-transform: uppercase; }
.shout { text-transform: uppercase; } .warn { font-size: 0.875rem; }`);

test('T3 caseless scripts, acronyms and code are not capitals to track; a real caps label still is', async () => {
  const r = await run('t3.html', CAPS);
  const caps = find(r, 'MT-CAPS-TRACKING').map((f) => f.location);
  for (const cls of ['region', 'sku', 'cable', 'state']) assert.ok(!caps.some((l) => l.includes(cls)), `${cls} reported: ${JSON.stringify(caps)}`);
  assert.ok(caps.some((l) => l.includes('label')), `the uppercase label was not reported: ${JSON.stringify(caps)}`);
});

test('T4 running text in capitals is MT-CAPS-TEXT MEDIUM with lower case as the fix, never tracking', async () => {
  const r = await run('t3.html', CAPS);
  const text = find(r, 'MT-CAPS-TEXT', 'MEDIUM');
  for (const cls of ['shout', 'warn']) assert.ok(text.some((f) => f.location.includes(cls)), `${cls}: ${JSON.stringify(text)}`);
  assert.ok(text.every((f) => /lower case/i.test(f.fix) && !/letter-spacing/.test(f.fix)), JSON.stringify(text));
  assert.ok(!find(r, 'MT-CAPS-TRACKING').some((f) => /shout|warn/.test(f.location)), JSON.stringify(r.findings));
  const lint = lintOne('t4.css', '.pullquote p { text-transform: uppercase; }\n.eyebrow { text-transform: uppercase; }\n');
  assert.equal(find(lint, 'MT-CAPS-TEXT', 'MEDIUM').length, 1, JSON.stringify(lint.findings));
  assert.ok(find(lint, 'MT-CAPS-TEXT')[0].location.endsWith(':1'), JSON.stringify(lint.findings));
  assert.equal(find(lint, 'MT-CAPS-TRACKING').length, 1, JSON.stringify(lint.findings));
  assert.ok(find(lint, 'MT-CAPS-TRACKING')[0].location.endsWith(':2'), JSON.stringify(lint.findings));
});

// ---------- T5, T10 and T12 headings and sizes ----------

const HEADS = page(`<aside><h2 class="related">Related</h2><p>Two other services may help you.</p></aside>
<h1>Services</h1>
<h2 class="services">What we offer</h2>
<div class="cards"><h3 class="card">Planning</h3><p>We plan the work with you.</p><h3 class="card">Delivery</h3><p>We deliver it on time.</p></div>
<h2 class="contact">Contact</h2>
<h3 class="big">Call the office</h3><p>The office answers on weekdays.</p>
<h2 lang="ja" class="ruby">豆の<ruby>焙煎<rt>ばいせん</rt></ruby>と挽き方</h2>
<span class="token">Version 3.2</span>`,
`h1 { font-size: 2.5rem; } h2 { font-size: 1.75rem; font-weight: 700; } .related { font-size: 1rem; }
h3 { font-size: 1.25rem; font-weight: 700; } .contact { font-size: 1.125rem; } .big { font-size: 1.375rem; }
.token { display: block; font: 11.9994px/1.4 Georgia, serif; }`);

test('T5 heading order compares each heading with the nearest higher heading before it', async () => {
  const order = find(await run('t5.html', HEADS), 'MT-HEADING-ORDER');
  assert.ok(!order.some((f) => /card/.test(f.location)), JSON.stringify(order));
  assert.ok(order.some((f) => /big/.test(f.location) && /h2 above it 18px/.test(f.measured)), JSON.stringify(order));
});

test('T10 sizes within 0.01px of a floor pass it', async () => {
  const r = await run('t5.html', HEADS);
  assert.ok(!find(r, 'MT-UI-SIZE').some((f) => /token/.test(f.location)), JSON.stringify(find(r, 'MT-UI-SIZE')));
});

test('T12 ruby annotations are not counted as a line of the heading', async () => {
  const runts = find(await run('t5.html', HEADS), 'MT-HEADING-RUNT');
  assert.ok(!runts.some((f) => /ruby/.test(f.location)), JSON.stringify(runts));
});

// ---------- T11 justification ----------

const LONG = 'Justified text needs a dictionary for the language it is written in, because without one the browser cannot break words at syllables and the spaces between words stretch instead, opening rivers through the paragraph that the reader has to cross on every line of the measure.';
const JUSTIFY = page(`<h1>Notes</h1><p class="nolang">${LONG}</p>
<div lang="en"><p class="tagged">${LONG}</p></div>
<p lang="ja" class="cjk">日本語の本文は、行の長さいっぱいに文字を並べるのが普通で、単語の途中で切る必要はありません。そのため両端揃えにしても、英語のように語間が大きく開くことはありません。</p>`,
'p { text-align: justify; hyphens: auto; }', '');

test('T11 justified text without a lang is MT-JUSTIFY even with hyphens: auto; justified CJK is not', async () => {
  const j = find(await run('t11.html', JUSTIFY), 'MT-JUSTIFY');
  assert.ok(j.some((f) => /nolang/.test(f.location) && /lang/.test(f.measured)), JSON.stringify(j));
  assert.ok(!j.some((f) => /tagged|cjk/.test(f.location)), JSON.stringify(j));
});

// ---------- T9 fallback ----------

test('T9 a web font loaded under another name and a script face later in the stack are not fallbacks', { skip: noFonts || (process.platform !== 'darwin' && 'needs Geeza Pro (macOS)') }, async () => {
  const url = (f) => pathToFileURL(f).href;
  const html = page(`<h1 class="missing">A missing face</h1><h2 class="alias">Set in the brand serif, which is Source Serif under its own name</h2>
<h3 class="arabic" lang="ar" dir="rtl">يصل الطلب خلال ثلاثة أيام عمل</h3>`,
  `@font-face { font-family: "Halden Serif"; src: url("${url(ROMAN)}"); font-display: swap; }
@font-face { font-family: "Outfit"; src: url("${url(OUTFIT)}"); font-display: swap; }
.missing { font-family: "Nonexistent Grotesk", Georgia, serif; }
.alias { font-family: "Halden Serif", Georgia, serif; }
.arabic { font-family: "Outfit", "Geeza Pro", sans-serif; }`);
  const fb = find(await run('t9.html', html), 'MT-FONT-FALLBACK');
  assert.ok(fb.some((f) => /Nonexistent Grotesk/.test(f.measured)), JSON.stringify(fb));
  assert.ok(!fb.some((f) => /Halden|Outfit/.test(f.measured)), JSON.stringify(fb));
});

// ---------- T8 local() faces ----------

test('T8 an @font-face with only local() sources is not MT-FONT-DISPLAY; a url() face still is', () => {
  const r = lintOne('t8.css', '@font-face { font-family: "Body Fallback"; src: local("Georgia"); size-adjust: 104%; }\n@font-face { font-family: "Body"; src: url(body.woff2) format("woff2"); }\n');
  const hits = find(r, 'MT-FONT-DISPLAY');
  assert.equal(hits.length, 1, JSON.stringify(r.findings));
  assert.ok(hits[0].location.endsWith(':2'), JSON.stringify(hits));
});

test('T8 the faces fallback-metrics.py prints lint clean', { skip: noFonts || (!GEORGIA && 'Georgia not installed') }, () => {
  const out = spawnSync(PY, [path.join(SCRIPTS, 'fallback-metrics.py'), ROMAN, '--fallback', GEORGIA, '--name', 'Georgia'], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  assert.deepEqual(lintOne('t8-fallback.css', out.stdout).findings, []);
});

// ---------- T6 apca.js ----------

test('T6 apca.js prints Lc for two colours and exits 2 on anything else', () => {
  const ok = spawnSync(process.execPath, [path.join(SCRIPTS, 'apca.js'), '#888', '#fff'], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Lc\s+63\.1/);
  const bad = spawnSync(process.execPath, [path.join(SCRIPTS, 'apca.js'), 'grey'], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /usage/i);
  assert.equal(typeof require(path.join(SCRIPTS, 'apca.js')).apcaLc, 'function');
});

// ---------- T7 font collections ----------

test('T7 font-features.py and fallback-metrics.py open a collection, pick a face and refuse one past the end', { skip: noFonts || (!GEORGIA && 'Georgia not installed') }, () => {
  const ttc = path.join(tmp, 'pair.ttc');
  const build = spawnSync(PY, ['-c', 'import sys\nfrom fontTools.ttLib import TTFont\nfrom fontTools.ttLib.ttCollection import TTCollection\nc = TTCollection()\nc.fonts = [TTFont(p) for p in sys.argv[2:]]\nc.save(sys.argv[1])', ttc, ROMAN, OUTFIT], { encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);
  const ff = (...a) => spawnSync(PY, [path.join(SCRIPTS, 'font-features.py'), ttc, '--json', ...a], { encoding: 'utf8' });
  const first = ff();
  assert.equal(first.status, 0, first.stderr);
  const [f0] = JSON.parse(first.stdout);
  assert.deepEqual([f0.face.number, f0.face.count], [0, 2]);
  assert.match(f0.face.name, /Source Serif/);
  const second = ff('--font-number', '1');
  assert.equal(second.status, 0, second.stderr);
  assert.match(JSON.parse(second.stdout)[0].face.name, /Outfit/);
  const past = ff('--font-number', '2');
  assert.notEqual(past.status, 0);
  assert.match(past.stderr, /2 faces|face/);
  const fm = spawnSync(PY, [path.join(SCRIPTS, 'fallback-metrics.py'), ROMAN, '--fallback', ttc, '--font-number', '1', '--name', 'Outfit'], { encoding: 'utf8' });
  assert.equal(fm.status, 0, fm.stderr);
  assert.match(fm.stdout, /face 1 of 2/);
  assert.match(fm.stdout, /size-adjust:/);
});
