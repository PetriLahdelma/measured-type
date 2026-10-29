// Final check of article.html with the shipped fonts.css vs. an unmatched Georgia fallback.
import { compare, cls, close } from './harness.mjs';
import fs from 'node:fs';
const real = fs.readFileSync(new URL('../fonts.css', import.meta.url), 'utf8');
const plain = real.replace(/"Source Serif 4 (Text|Heading) Fallback", /g, '');
const widths = []; for (let w = 320; w <= 800; w += 6) widths.push(w); widths.push(1024, 1280);
const summary = async (name, css) => {
  const r = await compare(css, widths);
  const s = { name, widths: r.length, widthsWithRewrap: r.filter(x => x.lineDiffs).length, rewrappedLines: r.reduce((a, x) => a + x.lineDiffs, 0), widthsWithBlockMove: r.filter(x => x.blockShift > 0.01).length, maxBlockMovePx: Math.max(...r.map(x => x.blockShift)) };
  const c = []; for (const w of [320, 390, 768, 1280]) c.push((await cls(css, w, 1500)).cls);
  s.clsAt320_390_768_1280 = c.join(' / ');
  if (name === 'shipped') { s.facesUsed = r[0].loadedFaces.join('; '); s.rewrapWidths = r.filter(x => x.lineDiffs).map(x => `${x.width}(${x.lineDiffs})`).join(' '); }
  return s;
};
console.log(await summary('plain Georgia', plain));
console.log(await summary('shipped', real));
close(); process.exit(0);
