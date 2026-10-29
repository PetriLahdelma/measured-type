import { compare, cls, close } from './harness.mjs';
import fs from 'node:fs';
const real = fs.readFileSync(new URL('../fonts.css', import.meta.url), 'utf8');
const w = JSON.parse(process.argv[2]);
const r = await compare(real, w, { verbose: true });
console.table(r.map(({ loadedFaces, fams, ...x }) => x));
for (const x of w) console.log(x, (await cls(real, x, 1500)).cls);
close(); process.exit(0);
