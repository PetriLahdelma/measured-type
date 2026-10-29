const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 const p = await b.newPage({ viewport: { width: 320, height: 900 }, colorScheme: 'dark' });
 await p.goto('file://' + path.resolve(__dirname, '../doc.html'));
 const pre = await p.$('pre'); await pre.screenshot({ path: 'pre-dark.png' });
 // 200% zoom at 640 window = 320 CSS px with doubled text -> emulate by root font 32px
 const p2 = await b.newPage({ viewport: { width: 320, height: 900 } });
 await p2.goto('file://' + path.resolve(__dirname, '../doc.html'));
 await p2.addStyleTag({ content: 'html{font-size:200%} .doc *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} .doc p{margin-block-end:2em!important}' });
 console.log('200% text + 1.4.12 overrides hscroll:', await p2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
 await p2.screenshot({ path: 'stress.png', fullPage: true });
 await b.close(); })();
