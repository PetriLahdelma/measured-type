const pw = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.resolve(__dirname, '..');
(async () => {
  for (const t of ['chromium', 'webkit']) for (const [css, rtl, ar] of [['help.css', false, false], ['help.rtl.css', false, false], ['help.rtl.css', true, false], ['help.rtl.css', true, true]]) {
    const b = await pw[t].launch(); const p = await b.newPage({ viewport: { width: 640, height: 600 }, deviceScaleFactor: 3 });
    await p.route('**/help.css', r => r.fulfill({ path: path.join(dir, css), contentType: 'text/css' }));
    await p.goto('file://' + path.join(dir, 'help.html'));
    const clip = await p.evaluate(({ rtl, ar }) => {
      if (rtl) { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; }
      const a = document.querySelector('.next'); if (ar) a.textContent = 'التالي: مشاركة ملف مُصدَّر';
      const s = document.createElement('style'); s.textContent = '.next { color: transparent; text-decoration: none; } .next::after { color: #000; }'; document.head.append(s);
      const r = a.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height };
    }, { rtl, ar });
    fs.writeFileSync(path.join(__dirname, `a-${t}-${css.replace('.css','')}-${rtl ? 'rtl' : 'ltr'}-${ar ? 'ar' : 'en'}.png`), await p.screenshot({ clip })); await b.close();
  }
})();
