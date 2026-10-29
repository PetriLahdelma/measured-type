const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 for (const css of ['html{font-size:200%}', '.doc *{letter-spacing:.12em!important;word-spacing:.16em!important}', 'html{font-size:200%} .doc *{letter-spacing:.12em!important;word-spacing:.16em!important}']) {
 const p = await b.newPage({ viewport: { width: 320, height: 900 } });
 await p.goto('file://' + path.resolve(__dirname, '../doc.html')); await p.addStyleTag({ content: css });
 console.log(css, await p.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('.doc *')].filter(e => !e.closest('pre') && e.getBoundingClientRect().right > W + 0.5).map(e => e.tagName + ':' + Math.round(e.getBoundingClientRect().right) + ':' + e.textContent.slice(0, 30)); }));
 await p.close(); }
 await b.close(); })();
