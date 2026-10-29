// Identify which face renders Arabic under each stack by comparing advance widths.
const { chromium, webkit } = require('playwright');
const txt = 'تحوّل عمليات التصدير المشروع إلى ملفات يمكنك مشاركتها';
const stacks = ['system-ui, sans-serif', 'sans-serif', 'system-ui', '"SF Arabic"', '"SF Arabic Rounded"', '"Geeza Pro"', '"Noto Sans Arabic"', '"Noto Naskh Arabic"', 'Tahoma', '"Damascus"', '"Arial"',
 'system-ui, "Segoe UI", "SF Arabic", "Geeza Pro", "Noto Sans Arabic", "Noto Naskh Arabic", Tahoma, sans-serif'];
(async () => {
  for (const [n, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await bt.launch(); const p = await b.newPage();
    await p.setContent('<html lang="ar" dir="rtl"><body></body></html>');
    const r = await p.evaluate(({ txt, stacks }) => stacks.map(s => {
      const e = document.createElement('span'); e.style.font = '16px ' + s; e.textContent = txt; document.body.append(e);
      const w = e.getBoundingClientRect().width; const h = e.getBoundingClientRect().height; e.remove();
      return `${w.toFixed(2)} x ${h.toFixed(1)}  ${s}`;
    }), { txt, stacks });
    console.log(n); r.forEach(x => console.log('  ' + x)); await b.close();
  }
})();
