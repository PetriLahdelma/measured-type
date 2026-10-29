// Measures which way each breadcrumb separator points, from pixels.
const pw = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.resolve(__dirname, '..');
const variants = {
  plain: `.crumbs li + li::before { content: "›"; }`,
  current: null, // help.rtl.css as written
};
async function measure(t, cssFile, extra, rtl, arabic) {
  const b = await pw[t].launch(); const p = await b.newPage({ viewport: { width: 640, height: 200 }, deviceScaleFactor: 3 });
  await p.route('**/help.css', r => r.fulfill({ body: fs.readFileSync(path.join(dir, cssFile), 'utf8') + (extra || ''), contentType: 'text/css' }));
  await p.goto('file://' + path.join(dir, 'help.html'));
  const boxes = await p.evaluate(({ rtl, arabic }) => {
    if (rtl) { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; }
    if (arabic) { const l = document.querySelectorAll('.crumbs li'); l[0].firstChild.textContent = 'المساعدة'; l[1].firstChild.textContent = 'المشاريع'; l[2].textContent = 'التصدير'; }
    const s = document.createElement('style'); s.textContent = '.crumbs li, .crumbs a { color: transparent !important; text-decoration: none !important; }'; document.head.append(s);
    const ol = document.querySelector('.crumbs ol').getBoundingClientRect(); return { x: ol.left, y: ol.top, width: ol.width, height: ol.height };
  }, { rtl, arabic });
  const buf = await p.screenshot({ clip: boxes }); await b.close(); return buf;
}
(async () => {
  const { PNG } = (() => { try { return require('pngjs'); } catch { return {}; } })();
  const out = [];
  for (const t of ['chromium', 'webkit']) for (const [vn, extra] of Object.entries(variants)) for (const [rtl, ar] of [[false, false], [true, false], [true, true]]) {
    const css = vn === 'plain' ? 'help.css' : 'help.rtl.css';
    const f = path.join(__dirname, `o-${t}-${vn}-${rtl ? 'rtl' : 'ltr'}-${ar ? 'ar' : 'en'}.png`);
    fs.writeFileSync(f, await measure(t, css, vn === 'plain' && rtl ? '' : '', rtl, ar)); out.push(f);
  }
  console.log(out.join('\n'));
})();
