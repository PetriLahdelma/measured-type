// Spec 0002 part G and H2: rendered checks from Latin and Saltz in scripts/page-audit.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const FIX = path.join(__dirname, 'audit');
const { audit } = require(path.join(__dirname, '..', 'page-audit.js'));
const NEW = ['MT-CODE-XHEIGHT', 'MT-CODE-BOX', 'MT-KERN-OFF', 'MT-CONFUSABLE', 'MT-HEADING-ORDER', 'MT-FAMILY-COUNT',
  'MT-PAIR-XHEIGHT', 'MT-HEADING-SPACE', 'MT-WEIGHT-THIN', 'MT-DARK-HAIRLINE', 'MT-ICON-ALIGN'];

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });

const cache = new Map();
const run = (name) => {
  if (!cache.has(name)) cache.set(name, audit(path.join(FIX, name), { browser }));
  return cache.get(name);
};
const find = (r, rule, severity) => r.findings.filter((f) => f.rule === rule && (!severity || f.severity === severity));
const num = (s, re) => Number((re.exec(s) || [])[1]);

test('G1 Menlo at 1em beside Georgia is MT-CODE-XHEIGHT LOW with the ratio and a matching em size', async () => {
  const hit = find(await run('code-xheight.html'), 'MT-CODE-XHEIGHT', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  const ratio = num(hit[0].measured, /ratio (\d+\.\d+)/);
  assert.ok(ratio > 1.1, hit[0].measured);
  assert.match(hit[0].fix, /font-size: 0\.\d+em/);
});

test('G1 code sized to the body x-height is not flagged', async () => {
  assert.equal(find(await run('code-box.html'), 'MT-CODE-XHEIGHT').length, 0);
});

test('G2 inline code boxes that collide across lines are MT-CODE-BOX LOW with the overlap', async () => {
  const hit = find(await run('code-box.html'), 'MT-CODE-BOX', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.ok(num(hit[0].measured, /(\d+(\.\d+)?)px/) > 0, hit[0].measured);
});

test('G3 font-kerning: none on a kerning face is MT-KERN-OFF LOW with the width difference', async () => {
  const hit = find(await run('kern-off.html'), 'MT-KERN-OFF', 'LOW');
  assert.ok(hit.length, JSON.stringify((await run('kern-off.html')).findings));
  assert.ok(num(hit[0].measured, /(\d+(\.\d+)?)% wider/) > 0.5, hit[0].measured);
});

test('G4 Arial body text is MT-CONFUSABLE LOW; Georgia is not', async () => {
  const hit = find(await run('confusable.html'), 'MT-CONFUSABLE', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.ok(num(hit[0].measured, /I and l overlap (\d\.\d+)/) >= 0.82, hit[0].measured);
  assert.equal(find(await run('clean.html'), 'MT-CONFUSABLE').length, 0);
});

test('G5 an h3 as large as and heavier than its h2 is MT-HEADING-ORDER MEDIUM', async () => {
  const hit = find(await run('heading-order.html'), 'MT-HEADING-ORDER', 'MEDIUM');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].location, /h3/);
  assert.match(hit[0].measured, /20px.*700.*20px.*400/);
});

test('G6 five rendered families are MT-FAMILY-COUNT LOW naming them', async () => {
  const hit = find(await run('families.html'), 'MT-FAMILY-COUNT', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].measured, /^5 families/);
  assert.match(hit[0].measured, /Georgia/);
  assert.match(hit[0].measured, /Times New Roman/, 'family names keep words like Roman');
  assert.equal(find(await run('code-xheight.html'), 'MT-FAMILY-COUNT').length, 0, 'code fonts do not count');
});

test('G7 Verdana headings over Georgia text are MT-PAIR-XHEIGHT LOW with both x-heights', async () => {
  const hit = find(await run('pair-xheight.html'), 'MT-PAIR-XHEIGHT', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].measured, /Verdana 0\.5\d+em.*Georgia 0\.4\d+em/);
});

test('G8 equal space above and below a heading is MT-HEADING-SPACE LOW with both gaps', async () => {
  const hit = find(await run('heading-space.html'), 'MT-HEADING-SPACE', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].measured, /(\d+)px above, (\d+)px below/);
  assert.equal(find(await run('heading-order.html'), 'MT-HEADING-SPACE').length, 0, '2.5em above 0.5em passes');
});

test('G9 reading text at weight 300 is MT-WEIGHT-THIN MEDIUM with WCAG and APCA figures', async () => {
  const hit = find(await run('thin.html'), 'MT-WEIGHT-THIN', 'MEDIUM');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].measured, /weight 300/);
  assert.match(hit[0].measured, /\d+\.\d+:1/);
  assert.match(hit[0].measured, /APCA Lc -?\d+/);
});

test('G10 Didot at 17px light on dark is MT-DARK-HAIRLINE LOW with the stroke width', async () => {
  const hit = find(await run('dark-hairline.html'), 'MT-DARK-HAIRLINE', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.ok(num(hit[0].measured, /(\d\.\d+)px/) < 0.45, hit[0].measured);
  assert.match(hit[0].fix, /0\.01 to 0\.02em/);
});

test('G11 a baseline-aligned icon is MT-ICON-ALIGN LOW; one centred on the capitals is not', async () => {
  const hit = find(await run('icon.html'), 'MT-ICON-ALIGN', 'LOW');
  assert.equal(hit.length, 1, JSON.stringify(hit));
  assert.match(hit[0].location, /\.bad/);
  assert.ok(Math.abs(num(hit[0].measured, /(-?\d+(\.\d+)?)px/)) > 1, hit[0].measured);
  assert.match(hit[0].fix, /vertical-align: -?\d/);
});

test('H2 the clean page triggers none of the new rules', async () => {
  const r = await run('clean.html');
  const hits = r.findings.filter((f) => NEW.includes(f.rule));
  assert.deepEqual(hits, []);
});
