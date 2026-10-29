import { compare, cls, close } from './harness.mjs';
const ASC = 103.6, DESC = 33.5;
const face = (style, weight, locals, sa) => `@font-face { font-family: "Source Serif 4 Fallback"; font-style: ${style}; font-weight: ${weight}; src: ${locals.map(l => `local("${l}")`).join(', ')}; size-adjust: ${sa}%; ascent-override: ${(ASC / sa * 100).toFixed(2)}%; descent-override: ${(DESC / sa * 100).toFixed(2)}%; line-gap-override: 0%; }`;
export const gen = (p, { fallback = true } = {}) => `
@font-face { font-family: "Source Serif 4"; font-style: normal; font-weight: 200 900; font-display: swap; src: url("fonts/SourceSerif4[opsz,wght].ttf") format("truetype"); }
@font-face { font-family: "Source Serif 4"; font-style: italic; font-weight: 200 900; font-display: swap; src: url("fonts/SourceSerif4-Italic[opsz,wght].ttf") format("truetype"); }
${fallback ? [face('normal', 400, ['Georgia'], p.reg), face('italic', 400, ['Georgia Italic', 'Georgia-Italic'], p.ita), face('normal', 700, ['Georgia Bold', 'Georgia-Bold'], p.bold), face('italic', 700, ['Georgia Bold Italic', 'Georgia-BoldItalic'], p.boldIta ?? p.bold)].join('\n') : ''}
.prose { font-family: "Source Serif 4", ${fallback ? '"Source Serif 4 Fallback", ' : ''}Georgia, serif; }
`;
const mode = import.meta.url.endsWith("sweep.mjs") && process.argv[1].endsWith("sweep.mjs") ? process.argv[2] : null;
if (mode === 'baseline') {
  console.log('PLAIN GEORGIA (no metric matching)');
  console.table(await compare(gen({}, { fallback: false })).then(r => r.map(({ loadedFaces, fams, ...x }) => x)));
  console.log(await cls(gen({}, { fallback: false })));
} else if (mode === 'one') {
  const p = JSON.parse(process.argv[3]);
  const r = await compare(gen(p), undefined, { verbose: process.argv[4] === 'v' });
  console.log(r[0].loadedFaces, r[0].fams);
  console.table(r.map(({ loadedFaces, fams, ...x }) => x));
}
if (mode) close();
