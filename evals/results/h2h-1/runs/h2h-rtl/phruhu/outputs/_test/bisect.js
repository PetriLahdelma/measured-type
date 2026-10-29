const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:900,height:100}});
const variants = {
 none: '',
 plain203A: '.crumbs li + li::before{content:"\\203A" !important;direction:inherit !important;unicode-bidi:normal !important}',
 iso2039: '.crumbs li + li::before{content:"\\2039" !important;direction:ltr !important;unicode-bidi:isolate !important}',
};
for (const [k,css] of Object.entries(variants)) {
await p.goto('file://' + __dirname + '/ar.html'); await p.addStyleTag({content:'.crumbs{font-size:48px} main{display:none}'+css});
// crop separator: find pixels
const s = await p.evaluate(() => { const st = getComputedStyle(document.querySelector('.crumbs li+li'),'::before'); return st.content+' '+st.direction+' '+st.unicodeBidi; });
await p.screenshot({path: __dirname + '/bis-' + k + '.png'}); console.log(k, s); }
await b.close(); })();
