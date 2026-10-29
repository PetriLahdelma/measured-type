// Spec 0003 M1-M3: the linter reads Sass and Less, single-file components and
// Tailwind classes, with file and line for every finding.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { lint } = require(path.join(__dirname, '..', 'lint-css.js'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-sources-'));
const write = (name, text) => { const p = path.join(dir, name); fs.writeFileSync(p, text); return p; };
const hits = (file) => lint([file]).findings.map((f) => `${f.line} ${f.rule} ${f.severity}`).sort();

test('M1 nested Sass with variables, mixins and line comments is linted with the CSS rules', () => {
  const file = write('prose.scss', [
    '$base: 16px; // root size: do not change',
    '.prose {',
    '  p { text-align: justify; } // see https://example.com/a;b',
    "  // don't set the size in vw here",
    '  @include respond(md) { font-size: 4vw; }',
    '  &__eyebrow { text-transform: uppercase; }',
    '}',
    '',
  ].join('\n'));
  assert.deepEqual(hits(file), ['3 MT-JUSTIFY MEDIUM', '5 MT-ZOOM-VW HIGH', '6 MT-CAPS-TRACKING LOW']);
});

test('M1 Less files are collected from a directory', () => {
  write('theme.less', '@size: 1rem;\n.note { letter-spacing: 2px; }\n');
  const found = lint([dir]).findings.filter((f) => f.file.endsWith('theme.less'));
  assert.deepEqual(found.map((f) => `${f.line} ${f.rule}`), ['2 MT-LS-PX']);
});

test('M2 a Vue component lints its style block at the right line and leaves template text alone', () => {
  const file = write('Card.vue', [
    '<template>',
    '  <p>Prices from 1990-2004 rose -5% and "quotes" stay straight in code</p>',
    '</template>',
    '<style scoped lang="scss">',
    '.card {',
    '  p { text-align: justify; } // no hyphens',
    '}',
    '</style>',
    '',
  ].join('\n'));
  assert.deepEqual(hits(file), ['6 MT-JUSTIFY MEDIUM']);
});

test('M3 Tailwind classes in JSX are linted with file and line', () => {
  const file = write('Card.tsx', [
    'export const Card = () => (',
    '  <div className="md:ml-4 text-left">',
    '    <p className="text-justify font-light">Body</p>',
    '    <span className="uppercase text-xs">Label</span>',
    '    <h1 className="text-[5vw]">Hi</h1>',
    '    <article className="max-w-prose">x</article>',
    "    <p className={'text-justify hyphens-auto tracking-[2px] leading-tight'}>ok</p>",
    '    <span className="uppercase tracking-wide">ok</span>',
    '  </div>',
    ');',
    '',
  ].join('\n'));
  assert.deepEqual(hits(file), [
    '2 MT-PHYSICAL LOW', '2 MT-PHYSICAL LOW',
    '3 MT-JUSTIFY MEDIUM', '3 MT-WEIGHT-THIN MEDIUM',
    '4 MT-CAPS-TRACKING LOW',
    '5 MT-ZOOM-VW HIGH',
    '6 MT-MEASURE-CH LOW',
    '7 MT-LH-TIGHT MEDIUM', '7 MT-LS-PX LOW',
  ]);
});

test('M3 a physical utility names its logical replacement, and --rtl raises it to HIGH', () => {
  const file = write('Nav.jsx', '<nav className="pl-6 rounded-r-lg float-right">x</nav>\n');
  const r = lint([file], { rtl: true }).findings;
  assert.ok(r.every((f) => f.rule === 'MT-PHYSICAL' && f.severity === 'HIGH'), JSON.stringify(r));
  const fixes = r.map((f) => f.fix).join(' ');
  for (const logical of ['ps-6', 'rounded-e-lg', 'float-end']) assert.match(fixes, new RegExp(logical));
});

test('M3 Tailwind classes in plain HTML are linted too, and ordinary class names are not', () => {
  const file = write('page.html', '<!doctype html><html lang="en"><body><p class="label text-justify">A</p><p class="left right uppercase-label">B</p></body></html>\n');
  assert.deepEqual(lint([file]).findings.map((f) => f.rule), ['MT-JUSTIFY']);
});
