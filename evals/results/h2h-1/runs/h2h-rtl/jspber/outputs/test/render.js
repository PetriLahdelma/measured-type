// Renders help.html with the old and new stylesheets, LTR and RTL, and checks geometry.
const { chromium, firefox, webkit } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(__dirname, '..');
const url = 'file://' + path.join(dir, 'help.html');
const AR = {
  crumbs: ['مساعدة', 'المشاريع', 'التصدير'],
  h2: 'تصدير مشروع', tag: 'جديد',
  p1: 'تحوّل عمليات التصدير المشروع إلى ملفات يمكنك مشاركتها. اختر التنسيق أولًا، ثم الصفحات التي تريد تضمينها.',
  steps: ['افتح المشروع واختر «تصدير» من قائمة «ملف».', 'اختر تنسيقًا والصفحات المراد تضمينها.', 'اختر مكان حفظ الملف ثم أكّد.'],
  note: 'قد يستغرق تصدير المشاريع الكبيرة دقيقة. يمكنك مواصلة العمل أثناء التصدير.',
  next: 'التالي: مشاركة ملف مُصدَّر',
};
async function setup(page, css, rtl) {
  await page.goto(url);
  await page.evaluate(async ({ css, rtl, AR }) => {
    const link = document.querySelector('link[rel=stylesheet]');
    const nl = document.createElement('link'); nl.rel = 'stylesheet';
    await new Promise(r => { nl.onload = r; nl.href = css; link.replaceWith(nl); });
    if (rtl) {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      const lis = document.querySelectorAll('.crumbs li');
      lis[0].firstChild.textContent = AR.crumbs[0]; lis[1].firstChild.textContent = AR.crumbs[1]; lis[2].textContent = AR.crumbs[2];
      document.querySelector('h2').textContent = AR.h2;
      document.querySelector('.tag').textContent = AR.tag;
      document.querySelector('main > p').textContent = AR.p1;
      document.querySelectorAll('.steps li').forEach((li, i) => li.textContent = AR.steps[i]);
      document.querySelector('.note p').textContent = AR.note;
      document.querySelector('.next').textContent = AR.next;
    }
  }, { css, rtl, AR });
  await page.evaluate(() => document.fonts.ready);
}
async function measure(page) {
  return page.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    const cs = (s, p, pe) => getComputedStyle(document.querySelector(s), pe || null)[p];
    const h2 = r('h2'), tag = r('.tag'), main = r('main');
    const range = document.createRange(); range.selectNodeContents(document.querySelector('h2'));
    const h2text = range.getBoundingClientRect();
    return {
      dir: document.documentElement.dir,
      mainLeft: main.left, mainRight: main.right,
      h2textLeft: h2text.left, h2textRight: h2text.right,
      tagLeft: tag.left, tagRight: tag.right,
      tagOverlapsH2Text: !(tag.right <= h2text.left || tag.left >= h2text.right),
      stepsPadL: cs('.steps', 'paddingLeft'), stepsPadR: cs('.steps', 'paddingRight'),
      noteBorderL: cs('.note', 'borderLeftWidth'), noteBorderR: cs('.note', 'borderRightWidth'),
      notePadL: cs('.note', 'paddingLeft'), notePadR: cs('.note', 'paddingRight'),
      nextAfter: cs('.next', 'content', '::after'),
      sepContent: cs('.crumbs li + li', 'content', '::before'),
      bodyFont: cs('body', 'fontFamily'),
      crumbsX: [...document.querySelectorAll('.crumbs li')].map(li => Math.round(li.getBoundingClientRect().left)),
    };
  });
}
(async () => {
  const out = path.join(__dirname, 'shots'); fs.mkdirSync(out, { recursive: true });
  for (const [name, bt] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
    let browser;
    try { browser = await bt.launch(); } catch (e) { console.log(name, 'unavailable'); continue; }
    const page = await browser.newPage({ viewport: { width: 700, height: 520 } });
    await setup(page, 'help.css', false); const a = await page.screenshot();
    await setup(page, 'help.rtl.css', false); const b = await page.screenshot();
    console.log(`[${name}] LTR old vs new screenshots identical:`, a.equals(b));
    fs.writeFileSync(path.join(out, `${name}-ltr-new.png`), b);
    console.log(`[${name}] LTR new`, JSON.stringify(await measure(page)));
    await setup(page, 'help.css', true);
    fs.writeFileSync(path.join(out, `${name}-rtl-old.png`), await page.screenshot());
    console.log(`[${name}] RTL old`, JSON.stringify(await measure(page)));
    await setup(page, 'help.rtl.css', true);
    fs.writeFileSync(path.join(out, `${name}-rtl-new.png`), await page.screenshot());
    console.log(`[${name}] RTL new`, JSON.stringify(await measure(page)));
    await browser.close();
  }
})();
