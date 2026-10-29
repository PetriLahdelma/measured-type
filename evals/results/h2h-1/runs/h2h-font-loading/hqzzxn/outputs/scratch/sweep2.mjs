import { compare, close } from './harness.mjs';
import { gen } from './sweep.mjs';
const widths = []; for (let w = 320; w <= 640; w += 8) widths.push(w); widths.push(1024);
for (const reg of JSON.parse(process.argv[2])) {
  const p = { reg, ita: 93.8, bold: 86.6 };
  const r = await compare(gen(p), widths);
  const totalDiff = r.reduce((a, x) => a + x.lineDiffs, 0), shifted = r.filter(x => x.blockShift > 0).length;
  const drifts = r.filter(x => x.meanEndDrift !== null).map(x => x.meanEndDrift);
  console.log(`reg=${reg} widthsWithBreakChange=${r.filter(x => x.lineDiffs).length}/${r.length} changedLines=${totalDiff} widthsWithBlockShift=${shifted} meanDrift=${(drifts.reduce((a, b) => a + b, 0) / drifts.length).toFixed(2)}`);
}
close();
