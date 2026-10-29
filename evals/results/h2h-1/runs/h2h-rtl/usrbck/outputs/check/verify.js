const { chromium, webkit, firefox } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(dir, 'help.html'), 'utf8');
const ar = s => s
  .replace('<html lang="en" dir="ltr">', '<html lang="ar" dir="rtl">')
  .replace('>Help</a>', '>المساعدة</a>').replace('>Projects</a>', '>المشاريع</a>').replace('<li>Exporting</li>', '<li>التصدير</li>')
  .replace('Exporting a project', 'تصدير مشروع').replace('>New<', '>جديد<')
  .replace(/Exports turn[^<]+/, 'تحوّل عمليات التصدير المشروع إلى ملفات يمكنك مشاركتها. اختر التنسيق أولاً، ثم الصفحات المراد تضمينها.')
  .replace('Open the project and choose Export from the File menu.', 'افتح المشروع واختر تصدير من قائمة ملف.')
  .replace('Pick a format and the pages to include.', 'اختر تنسيقاً والصفحات المراد تضمينها.')
  .replace('Choose where to save the file and confirm.', 'اختر مكان حفظ الملف ثم أكّد.')
  .replace(/Large projects[^<]+/, 'قد يستغرق تصدير المشاريع الكبيرة دقيقة. يمكنك متابعة العمل أثناء التصدير.')
  .replace('Next: sharing an export', 'التالي: مشاركة ملف مُصدَّر');
const variants = {
  'en-orig': src,
  'en-new': src.replace('help.css', 'help.rtl.css'),
  'ar-orig': ar(src),
  'ar-new': ar(src).replace('help.css', 'help.rtl.css'),
  'ar-dir-only-new': src.replace('<html lang="en" dir="ltr">', '<html lang="ar" dir="rtl">').replace('help.css', 'help.rtl.css'),
};
for (const [k, v] of Object.entries(variants)) fs.writeFileSync(path.join(dir, `check/${k}.html`), v.replace(/href="help/, 'href="../help'));
(async () => {
  for (const [bname, btype] of [['chromium', chromium], ['webkit', webkit], ['firefox', firefox]]) {
    let browser; try { browser = await btype.launch(); } catch (e) { console.log(bname, 'not available'); continue; }
    for (const width of [1280, 375]) {
      const page = await browser.newPage({ viewport: { width, height: 700 } });
      const shots = {};
      for (const k of Object.keys(variants)) {
        await page.goto('file://' + path.join(dir, `check/${k}.html`));
        shots[k] = await page.screenshot({ fullPage: true });
        if (width === 1280) await page.screenshot({ path: path.join(dir, `check/${bname}-${k}.png`), fullPage: true });
        if (k.startsWith('ar') || k === 'en-new') {
          const g = await page.evaluate(() => {
            const r = el => { const b = document.querySelector(el).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; };
            const h2 = document.querySelector('.title h2'), cs = getComputedStyle(h2);
            const note = getComputedStyle(document.querySelector('.note'));
            const steps = getComputedStyle(document.querySelector('.steps'));
            const li = document.querySelector('.steps li').getBoundingClientRect();
            const ol = document.querySelector('.steps').getBoundingClientRect();
            const next = getComputedStyle(document.querySelector('.next'), '::after').content;
            const crumbs = [...document.querySelectorAll('.crumbs li')].map(l => Math.round(l.getBoundingClientRect().left));
            return { main: r('.help'), tag: r('.tag'), h2: r('.title h2'), h2pad: [cs.paddingLeft, cs.paddingRight], noteBorder: [note.borderLeftWidth, note.borderRightWidth], notePad: [note.paddingLeft, note.paddingRight], stepsPad: [steps.paddingLeft, steps.paddingRight], liInset: [Math.round(li.left - ol.left), Math.round(ol.right - li.right)], next, crumbLefts: crumbs, scrollW: document.documentElement.scrollWidth };
          });
          console.log(bname, width, k, JSON.stringify(g));
        }
      }
      console.log(bname, width, 'LTR identical:', Buffer.compare(shots['en-orig'], shots['en-new']) === 0);
      await page.close();
    }
    await browser.close();
  }
})();
