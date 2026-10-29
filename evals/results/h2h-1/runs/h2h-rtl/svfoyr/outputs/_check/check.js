const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const dir = path.resolve(__dirname, '..');
const AR = {
  crumbs: ['المساعدة', 'المشاريع', 'التصدير'],
  h2: 'تصدير مشروع', tag: 'جديد',
  p: 'تحوّل عمليات التصدير المشروع إلى ملفات يمكنك مشاركتها. اختر التنسيق أولاً، ثم الصفحات التي تريد تضمينها.',
  steps: ['افتح المشروع واختر «تصدير» من قائمة «ملف».', 'اختر تنسيقًا والصفحات التي تريد تضمينها.', 'اختر مكان حفظ الملف ثم أكّد.'],
  note: 'قد يستغرق تصدير المشاريع الكبيرة دقيقة. يمكنك مواصلة العمل أثناء التصدير.',
  next: 'التالي: مشاركة ملف مُصدَّر',
};
(async () => {
  const browser = await require('playwright')[process.env.ENGINE || 'chromium'].launch();
  async function shot(name, css, rtl, arabic) {
    const page = await browser.newPage({ viewport: { width: 640, height: 520 } });
    await page.route('**/help.css', r => r.fulfill({ path: path.join(dir, css), contentType: 'text/css' }));
    await page.goto('file://' + path.join(dir, 'help.html'));
    await page.evaluate(({ rtl, arabic, AR }) => {
      if (rtl) { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; }
      if (arabic) {
        const lis = document.querySelectorAll('.crumbs li');
        lis[0].firstChild.textContent = AR.crumbs[0]; lis[1].firstChild.textContent = AR.crumbs[1]; lis[2].textContent = AR.crumbs[2];
        document.querySelector('h2').textContent = AR.h2; document.querySelector('.tag').textContent = AR.tag;
        document.querySelector('main > p').textContent = AR.p;
        document.querySelectorAll('.steps li').forEach((li, i) => li.textContent = AR.steps[i]);
        document.querySelector('.note p').textContent = AR.note; document.querySelector('.next').textContent = AR.next;
      }
    }, { rtl, arabic, AR });
    const buf = await page.screenshot({ path: path.join(__dirname, name + '.png') });
    const geo = await page.evaluate(() => {
      const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; };
      const cs = getComputedStyle(document.querySelector('.steps'));
      return { h2: r('h2'), tag: r('.tag'), steps: [cs.paddingLeft, cs.paddingRight], note: getComputedStyle(document.querySelector('.note')).borderRightWidth + '/' + getComputedStyle(document.querySelector('.note')).borderLeftWidth, after: getComputedStyle(document.querySelector('.next'), '::after').content, sw: document.documentElement.scrollWidth };
    });
    console.log(name, JSON.stringify(geo));
    await page.close(); return buf;
  }
  const a = await shot('ltr-old', 'help.css', false, false);
  const b = await shot('ltr-new', 'help.rtl.css', false, false);
  console.log('LTR identical bytes:', Buffer.compare(a, b) === 0);
  await shot('rtl-old-en', 'help.css', true, false);
  await shot('rtl-new-en', 'help.rtl.css', true, false);
  await shot('rtl-old-ar', 'help.css', true, true);
  await shot('rtl-new-ar', 'help.rtl.css', true, true);
  await browser.close();
})();
