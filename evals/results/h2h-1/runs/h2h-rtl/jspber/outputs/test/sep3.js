// Close-up of the breadcrumb trail: English LTR and Arabic RTL with help.rtl.css, both engines.
const { chromium, webkit } = require('playwright');
const path = require('path');
const fs = require('fs');
const css = fs.readFileSync(path.resolve(__dirname, '..', 'help.rtl.css'), 'utf8');
(async () => {
  for (const [n, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await bt.launch(); const p = await b.newPage({ viewport: { width: 360, height: 100 }, deviceScaleFactor: 3 });
    await p.setContent(`<style>${css}</style><div lang="en" dir="ltr"><nav class="crumbs"><ol><li><a href="#">Help</a></li><li><a href="#">Projects</a></li><li>Exporting</li></ol></nav></div>
      <div lang="ar" dir="rtl"><nav class="crumbs"><ol><li><a href="#">مساعدة</a></li><li><a href="#">المشاريع</a></li><li>التصدير</li></ol></nav></div>`);
    const f = path.join(__dirname, 'shots', `sep3-${n}.png`); await p.screenshot({ path: f }); console.log(f);
    await b.close();
  }
})();
