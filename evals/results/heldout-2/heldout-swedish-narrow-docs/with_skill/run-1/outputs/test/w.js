const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
await p.setContent('<div lang="sv" style="font:700 24px system-ui">x</div>');
console.log(await p.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); const out = {};
for (const s of [24, 22, 20]) { c.font = `700 ${s}px system-ui`; for (const t of ['Användarbehörighets-', 'Lagringsutrymmes-', 'Användarbehörighetsinställningar']) out[s + ' ' + t] = Math.round(c.measureText(t).width); } return out; }));
await b.close(); })();
