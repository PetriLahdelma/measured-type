// Spec 0022: checks for what the guidance already says.
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

const { PY, FONTS, GEORGIA, fontToolsReady, NO_FONTTOOLS, NO_TEST_FONTS } = require('./helpers.js');
const ROMAN = path.join(FONTS, 'SourceSerif4[opsz,wght].ttf');
const ITALIC = path.join(FONTS, 'SourceSerif4-Italic[opsz,wght].ttf');
const OUTFIT = path.join(FONTS, 'Outfit[wght].ttf');
const noFonts = !fs.existsSync(ROMAN) || !fs.existsSync(OUTFIT) ? NO_TEST_FONTS : false;
const noGeorgia = noFonts || (!GEORGIA ? 'Georgia not installed' : false);
const url = (f) => pathToFileURL(f).href;

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-parity-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const lintOne = (name, text) => lint([write(name, text)]);
const find = (r, rule, severity) => r.findings.filter((f) => (!rule || f.rule === rule) && (!severity || f.severity === severity));
const cache = new Map();
const run = (name, html) => {
  if (!cache.has(name)) cache.set(name, audit(write(name, html), { browser }));
  return cache.get(name);
};
const page = (body, css = '', lang = 'en') => `<!doctype html><html${lang === null ? '' : ` lang="${lang}"`}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { margin: 0 1.5rem; font: 1.125rem/1.5 Georgia, serif; color: #1a1a1a; background: #fff; } main { max-inline-size: 34em; } ${css}</style>
</head><body><main>${body}</main></body></html>`;
const PROSE = 'Reading text needs a measure the eye can follow, leading that keeps the lines apart and a size the reader chose.';

// ---------- V1 the verdict ----------

test('V1 the linter says "Approve, N to fix" with MEDIUM rows open, "Approve" with only LOW and Block with HIGH', () => {
  assert.equal(lintOne('v1-medium.css', 'p { font-size: 14px; }\n').verdict, 'Approve, 1 to fix');
  assert.equal(lintOne('v1-low.css', '.x { letter-spacing: 1px; }\n').verdict, 'Approve');
  assert.match(lintOne('v1-high.css', 'h1 { font-size: 4vw; }\n').verdict, /^Block \(1 HIGH\)$/);
  const cli = spawnSync('node', [path.join(SCRIPTS, 'lint-css.js'), write('v1-cli.css', 'p { font-size: 14px; }\n')], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /Verdict: Approve, 1 to fix/);
});

test('V1 the rendered audit and lite mode count MEDIUM rows the same way', async () => {
  const html = page(`<p>${PROSE}</p>`, 'p { font-size: 14px; }');
  const r = await run('v1.html', html);
  const rows = new Set(find(r, null, 'MEDIUM').map((f) => `${f.rule}|${f.measured}`)).size;
  assert.ok(rows > 0, JSON.stringify(r.findings));
  assert.equal(r.verdict, `Approve, ${rows} to fix`);
  const lite = await audit(write('v1-lite.html', html), { lite: true });
  assert.match(lite.verdict, /^Approve, [1-9]\d* to fix$/, lite.verdict);
});

// ---------- L1 to L3 language ----------

test('L1 a document without lang on <html> is MT-LANG, in the source and in the rendered page', async () => {
  const html = page(`<p>${PROSE}</p>`, '', null);
  assert.ok(find(lintOne('l1.html', html), 'MT-LANG', 'MEDIUM').length, 'lint missed it');
  const r = await run('l1.html', html);
  assert.ok(find(r, 'MT-LANG', 'MEDIUM').some((f) => /no lang/.test(f.measured)), JSON.stringify(r.findings));
  assert.equal(find(lintOne('l1-ok.html', page(`<p>${PROSE}</p>`)), 'MT-LANG').length, 0);
});

test('L2 a lang value that is not a language tag is MT-LANG; lang on script, style and template is not a language', async () => {
  const bad = lintOne('l2.html', page(`<p lang="en_US">${PROSE}</p>`));
  assert.ok(find(bad, 'MT-LANG').some((f) => /en_US/.test(f.measured)), JSON.stringify(bad.findings));
  const sfc = lintOne('l2.vue', '<template lang="pug">\n  p Hello\n</template>\n<script lang="ts">\nexport default {};\n</script>\n<style lang="scss">\np { color: #111; }\n</style>\n');
  assert.equal(find(sfc, 'MT-LANG').length, 0, JSON.stringify(sfc.findings));
  const r = await run('l2.html', page(`<p>${PROSE} <span lang="english">Colour</span></p>`));
  assert.ok(find(r, 'MT-LANG').some((f) => /english/.test(f.measured)), JSON.stringify(r.findings));
});

const JA = '日本語の文章は、漢字と仮名を組み合わせて書かれます。読みやすい行の長さと行間を選ぶことが大切です。';
test('L3 text in another script than its lang declares is MT-LANG; the right lang, a brand name and two-script languages are not', async () => {
  const wrong = await run('l3-wrong.html', page(`<p>${JA}${JA}</p>`));
  assert.ok(find(wrong, 'MT-LANG', 'MEDIUM').some((f) => /en/.test(f.measured) && /CJK|Japanese|Han/i.test(f.measured)), JSON.stringify(wrong.findings));
  const right = await run('l3-right.html', page(`<p>${JA}iPhone ${JA}</p><p lang="sr">Ovo je tekst na srpskom jeziku pisan latinicom, sasvim ispravno.</p>`, '', 'ja'));
  assert.equal(find(right, 'MT-LANG').length, 0, JSON.stringify(right.findings));
  assert.ok(right.notVerified.some((n) => /language of text/i.test(n)), JSON.stringify(right.notVerified));
});

// ---------- P1 to P3 punctuation ----------

test('P1 the rendered audit checks punctuation in the text the reader gets, including text a script inserted', async () => {
  const r = await run('p1.html', page(`<p id="host"></p><p><code>it's -12 1990-2004</code></p>
<script>document.getElementById('host').textContent = "It's the season: -12% from 1990-2004.";</script>`));
  for (const rule of ['MT-QUOTES', 'MT-MINUS', 'MT-RANGE']) assert.ok(find(r, rule).length, `${rule} missing: ${JSON.stringify(r.findings)}`);
  assert.ok(find(r, 'MT-QUOTES').every((f) => !/code/.test(f.location)), JSON.stringify(find(r, 'MT-QUOTES')));
});

const PUNCT = `<p>The answer -- if there is one -- came late. Wait... the screen is 1920x1080 and she is 5'11" tall.</p>
<p>Run it with --verbose. The value is 0x1F and the price CHF 1'000.</p><pre>a -- b... 3x4</pre>`;
test('P2 MT-PUNCT finds two hyphens for a dash, three full stops, x for times and straight primes, in source and rendered text', async () => {
  const check = (findings, where) => {
    const m = findings.filter((f) => f.rule === 'MT-PUNCT').map((f) => f.measured).join(' | ');
    for (const s of ['--', '...', '1920x1080', `5'11"`]) assert.ok(m.includes(s), `${where}: ${s} not reported in ${m}`);
    for (const s of ['--verbose', '0x1F', `1'000`, '3x4']) assert.ok(!m.includes(s), `${where}: ${s} reported in ${m}`);
  };
  check(lintOne('p2.html', page(PUNCT)).findings, 'lint');
  check((await run('p2.html', page(PUNCT))).findings, 'rendered');
  assert.ok(find(lintOne('p2-fix.html', page(PUNCT)), 'MT-PUNCT').every((f) => /U\+/.test(f.fix)), 'each fix names the character');
});

test('P3 an opening quote that is not the language\'s own is MT-QUOTES; each language\'s own marks are not', async () => {
  const r = await run('p3.html', page(`<p lang="fi" class="fi-wrong">Hän sanoi “hei” ja lähti.</p>
<p lang="fi" class="fi-right">Hän sanoi ”hei” ja lähti.</p><p class="en-right">She said “hello” and left.</p>
<p lang="de" class="de-right">Sie sagte „Hallo“ und ging.</p><p class="en-wrong">She said „hello“ and left.</p>`));
  const at = find(r, 'MT-QUOTES').map((f) => `${f.location} ${f.measured}`).join(' | ');
  assert.ok(/fi-wrong/.test(at) && /en-wrong/.test(at), at);
  for (const ok of ['fi-right', 'en-right', 'de-right']) assert.ok(!at.includes(ok), `${ok} reported: ${at}`);
});

// ---------- U1 numbers and units ----------

test('U1 a price, unit or period the page breaks across lines is MT-NUM-BREAK; a no-break space is not reported', async () => {
  const r = await run('u1.html', page(`<p class="box eur">Price 99 €</p><p class="box nb">Price 99&nbsp;€</p>
<p class="box gb">Disk 250 GB</p><p class="box mo">Only €29 / month</p><p class="box cats">Seen 99 cats</p>`,
  '.box { font: 16px/1.5 monospace; inline-size: 9ch; }'));
  const hits = find(r, 'MT-NUM-BREAK', 'MEDIUM');
  const at = hits.map((f) => `${f.location} ${f.measured}`).join(' | ');
  for (const cls of ['eur', 'gb', 'mo']) assert.ok(at.includes(cls), `${cls} not reported: ${at}`);
  for (const cls of ['nb', 'cats']) assert.ok(!at.includes(cls), `${cls} reported: ${at}`);
  assert.ok(hits.some((f) => /99 €/.test(f.measured) && /375px/.test(f.measured)), at);
  assert.ok(hits.every((f) => /U\+00A0|nowrap/.test(f.fix)), at);
});

// ---------- S1 and S2 synthesized styles ----------

const STYLES = () => page(`<p class="plain">Regular text and <strong>bold text</strong> in one face.</p>
<p class="var">Outfit text with <b>bold</b> and <em class="var-em">italic words</em> here.</p>
<p class="ss"><b class="ss-b">Bold</b> and <i class="ss-i">italic</i> from real faces.</p>
<p class="off">Synthesis off: <b class="off-b">not bold</b>.</p>`,
`@font-face { font-family: Plain; src: url("${url(GEORGIA)}"); font-display: swap; }
@font-face { font-family: Var; src: url("${url(OUTFIT)}"); font-display: swap; }
@font-face { font-family: SS; src: url("${url(ROMAN)}"); font-weight: 200 900; font-display: swap; }
@font-face { font-family: SS; src: url("${url(ITALIC)}"); font-weight: 200 900; font-style: italic; font-display: swap; }
.plain { font-family: Plain, serif; } .var { font-family: Var, sans-serif; } .ss { font-family: SS, serif; }
.off { font-family: Plain, serif; font-synthesis: none; }`);

test('S1 bold drawn by thickening a lighter face is MT-BOLD-SYNTH; a variable weight axis and synthesis off are not', { skip: noGeorgia }, async () => {
  const r = await run('s.html', STYLES());
  const at = find(r, 'MT-BOLD-SYNTH', 'MEDIUM').map((f) => `${f.location} ${f.measured}`).join(' | ');
  assert.ok(/strong/.test(at) && /Plain/.test(at), at);
  for (const cls of ['var', 'ss-b', 'off-b']) assert.ok(!at.includes(cls), `${cls} reported: ${at}`);
});

test('S2 italic drawn as a slanted roman is MT-ITALIC-SYNTH; a real italic face is not', { skip: noGeorgia }, async () => {
  const r = await run('s.html', STYLES());
  const at = find(r, 'MT-ITALIC-SYNTH', 'MEDIUM').map((f) => `${f.location} ${f.measured}`).join(' | ');
  assert.ok(/var-em/.test(at), at);
  assert.ok(!/ss-i/.test(at), at);
});

// ---------- F1 to F3 font loading ----------

test('F1 font-display: block and an explicit auto are MT-FONT-DISPLAY, in the source and in the rendered page', { skip: noFonts }, async () => {
  const face = (display) => `@font-face { font-family: A; src: url("a.woff2") format("woff2"); font-display: ${display}; }\n`;
  assert.ok(find(lintOne('f1-block.css', face('block')), 'MT-FONT-DISPLAY').some((f) => /block/.test(f.measured)));
  assert.ok(find(lintOne('f1-auto.css', face('auto')), 'MT-FONT-DISPLAY').length);
  assert.equal(find(lintOne('f1-swap.css', face('swap')), 'MT-FONT-DISPLAY').length, 0);
  const r = await run('f1.html', page(`<p>${PROSE}</p>`, `@font-face { font-family: Var; src: url("${url(OUTFIT)}"); font-display: block; } p { font-family: Var, sans-serif; }`));
  assert.ok(find(r, 'MT-FONT-DISPLAY').some((f) => /block/.test(f.measured) && /Var/.test(f.location + f.measured)), JSON.stringify(r.findings));
});

test('F2 font-optical-sizing: none on a face with an opsz axis is MT-OPSZ-OFF; a face without one is not', { skip: noFonts }, async () => {
  const r = await run('f2.html', page(`<p class="ss-off">${PROSE}</p><p class="var-off">${PROSE}</p><p class="ss-set">${PROSE}</p>`,
  `@font-face { font-family: SS; src: url("${url(ROMAN)}"); font-weight: 200 900; font-display: swap; }
@font-face { font-family: Var; src: url("${url(OUTFIT)}"); font-display: swap; }
.ss-off { font-family: SS, serif; font-optical-sizing: none; } .var-off { font-family: Var, sans-serif; font-optical-sizing: none; }
.ss-set { font-family: SS, serif; font-optical-sizing: none; font-variation-settings: "opsz" 12; }`));
  const at = find(r, 'MT-OPSZ-OFF', 'LOW').map((f) => f.location).join(' | ');
  assert.ok(/ss-off/.test(at), at);
  for (const cls of ['var-off', 'ss-set']) assert.ok(!at.includes(cls), `${cls} reported: ${at}`);
});

// The generic serif (Times on macOS) is about 10% narrower than Outfit, so lines rewrap when it swaps.
const SWAP = (css, family = 'Web, serif') => page(`<h1>A heading that wraps onto a second line at phone width</h1>
<p>${PROSE} ${PROSE} ${PROSE}</p><p>${PROSE} ${PROSE}</p><p>${PROSE}</p>`, `${css} body { font-family: ${family}; }`);

test('F3 text that moves when the web font replaces its fallback is MT-FONT-SWAP; optional faces and system fonts are not', { skip: noFonts }, async () => {
  const moved = await run('f3-swap.html', SWAP(`@font-face { font-family: Web; src: url("${url(OUTFIT)}"); font-display: swap; }`));
  const hits = find(moved, 'MT-FONT-SWAP', 'MEDIUM');
  assert.ok(hits.length && hits.every((f) => /\d+px/.test(f.measured)), JSON.stringify(moved.findings));
  assert.ok(hits.every((f) => /fallback-metrics\.py/.test(f.fix)), JSON.stringify(hits));
  const optional = await run('f3-optional.html', SWAP(`@font-face { font-family: Web; src: url("${url(OUTFIT)}"); font-display: optional; }`));
  assert.equal(find(optional, 'MT-FONT-SWAP').length, 0, JSON.stringify(optional.findings));
  const system = await run('f3-system.html', SWAP('', 'Georgia, serif'));
  assert.equal(find(system, 'MT-FONT-SWAP').length, 0, JSON.stringify(system.findings));
});

test('F3 the metric-matched fallback fallback-metrics.py prints is not reported, though a line on a break may still rewrap', { skip: noGeorgia || (!fontToolsReady() && NO_FONTTOOLS) }, async () => {
  const fb = spawnSync(PY, [path.join(SCRIPTS, 'fallback-metrics.py'), ROMAN, '--fallback', GEORGIA, '--name', 'Georgia', '--family', 'Web Fallback'], { encoding: 'utf8' });
  assert.equal(fb.status, 0, fb.stderr);
  const plain = await run('f3-plain.html', SWAP(`@font-face { font-family: Web; src: url("${url(ROMAN)}"); font-weight: 200 900; font-display: swap; }`));
  assert.ok(find(plain, 'MT-FONT-SWAP').length, `the plain serif fallback should move: ${JSON.stringify(plain.findings)}`);
  // The fallback face is regular only; rules.md 2.1.9 says each weight needs its own, so the heading is regular here.
  const matched = await run('f3-matched.html', SWAP(`@font-face { font-family: Web; src: url("${url(ROMAN)}"); font-weight: 200 900; font-display: swap; }\n${fb.stdout} h1 { font-weight: 400; }`, '"Web", "Web Fallback", serif'));
  assert.equal(find(matched, 'MT-FONT-SWAP').length, 0, JSON.stringify(find(matched, 'MT-FONT-SWAP')));
});
