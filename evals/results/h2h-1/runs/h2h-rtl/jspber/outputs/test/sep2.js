// Probe how the angle separator renders next to Arabic text, one row per variant.
const { chromium, webkit } = require('playwright');
const path = require('path');
const rows = {
  'A iso ›': 'content:"›";direction:ltr;unicode-bidi:isolate',
  'B iso ‹': 'content:"‹";direction:ltr;unicode-bidi:isolate',
  'C ib ›': 'content:"›";display:inline-block',
  'D ib ‹': 'content:"‹";display:inline-block',
  'E plain ‹': 'content:"‹"',
  'F 2039esc': 'content:"\\2039";display:inline-block;direction:ltr',
};
(async () => {
  for (const [n, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await bt.launch(); const p = await b.newPage({ viewport: { width: 420, height: 40 * Object.keys(rows).length + 10 }, deviceScaleFactor: 2 });
    let html = '<html dir="rtl" lang="ar"><style>body{margin:8px;font:16px/1.6 system-ui,sans-serif}ol{list-style:none;display:flex;margin:0 0 8px;padding:0}li+li::before{margin:0 .5em}';
    let body = '';
    Object.entries(rows).forEach(([k, css], i) => { html += `.r${i} li+li::before{${css}}`; body += `<ol class="r${i}"><li>${k}</li><li><a href="#">مساعدة</a></li><li><a href="#">المشاريع</a></li><li>التصدير</li></ol>`; });
    await p.setContent(html + '</style>' + body + '</html>');
    const f = path.join(__dirname, 'shots', `sep2-${n}.png`); await p.screenshot({ path: f }); console.log(f);
    await b.close();
  }
})();
