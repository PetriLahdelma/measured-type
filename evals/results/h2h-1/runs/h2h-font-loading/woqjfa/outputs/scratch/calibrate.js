// Shaped-width ratio of Source Serif 4 to Georgia on generic English prose (kerning on),
// at the size/weight/style each fallback face serves. Gives the size-adjust to use.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(__dirname, '..');
const text = [
  'The measure is the length of a line. Somewhere between forty-five and seventy-five characters the eye can travel to the end of a line and return to the next without losing its place.',
  'Typography exists to honor content. Like oratory, music, dance, calligraphy, or anything else that can lend its grace to language, typography is an art that can be deliberately misused.',
  'When the weather turned in late October, the village held its market indoors. Farmers brought apples, honey, wool and cheese; children ran between the stalls while their parents argued about prices.',
  'Quick zephyrs blow, vexing daft Jim. We asked whether the report would be ready by Wednesday, and they replied that it would, provided the figures from the northern office arrived in time.',
  'Most of what we read on screens is read in passing. Long reading is different in kind, not only in length: it asks the reader to hold a thread across pages and to trust that the page will not shift under the eye.',
].join(' ');
const cases = [
  { name: 'regular', size: 18, weight: 400, style: 'normal', local: 'Georgia' },
  { name: 'italic', size: 18, weight: 400, style: 'italic', local: 'Georgia Italic' },
  { name: 'bold h1', size: 36, weight: 700, style: 'normal', local: 'Georgia Bold' },
  { name: 'bold 18', size: 18, weight: 700, style: 'normal', local: 'Georgia Bold' },
  { name: 'bold italic', size: 18, weight: 700, style: 'italic', local: 'Georgia Bold Italic' },
];
const html = `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:W;src:url("../fonts/SourceSerif4%5Bopsz,wght%5D.ttf");font-weight:200 900}
@font-face{font-family:W;src:url("../fonts/SourceSerif4-Italic%5Bopsz,wght%5D.ttf");font-weight:200 900;font-style:italic}
${cases.map((c, i) => `@font-face{font-family:G${i};src:local("${c.local}")}`).join('\n')}
span{white-space:nowrap;font-kerning:normal;font-synthesis:none}
</style>${cases.map((c, i) => `<div><span id=w${i} style="font:${c.style} ${c.weight} ${c.size}px W">${text}</span></div><div><span id=g${i} style="font:${c.size}px G${i}">${text}</span></div>`).join('')}`;
fs.writeFileSync(path.join(dir, 'scratch', 'calibrate.html'), html);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(dir, 'scratch', 'calibrate.html').replace('/scratch/', '/scratch/'));
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate((n) => [...Array(n).keys()].map((i) => document.getElementById('w' + i).getBoundingClientRect().width / document.getElementById('g' + i).getBoundingClientRect().width), cases.length);
  cases.forEach((c, i) => console.log(c.name.padEnd(12), 'size-adjust', (r[i] * 100).toFixed(3) + '%'));
  await b.close();
})();
