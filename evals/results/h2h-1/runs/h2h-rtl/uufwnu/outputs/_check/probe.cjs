const { chromium } = require('playwright'); (async () => {
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 200 }, deviceScaleFactor: 4 });
await p.goto('file://' + process.argv[2] + '/ar-text.html');
console.log(await p.evaluate(() => { const li = document.querySelectorAll('.crumbs li')[1]; const s = getComputedStyle(li, '::before'); return [s.content, s.direction, s.unicodeBidi, [...s.content].map(c=>c.codePointAt(0).toString(16))]; }));
// control: plain spans
await p.setContent('<div dir="rtl" style="font:40px system-ui"><span>أ ‹ ب › ج</span> | <span dir="ltr">‹ ›</span></div>');
await p.screenshot({ path: process.argv[2] + '/probe.png' });
await b.close(); })();
