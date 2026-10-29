const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();
for (const f of ['../page.html','../page.fixed.html']) {
 const p=await b.newPage({viewport:{width:640,height:900}}); // 1280px window at 200% zoom
 await p.goto('file://'+path.resolve(f));
 await p.addStyleTag({content:'html{font-size:24px}'}); // reader with 24px default
 const r=await p.evaluate(()=>({scrollW:document.documentElement.scrollWidth,body:getComputedStyle(document.querySelector('main>p:nth-of-type(3)')).fontSize,h1:getComputedStyle(document.querySelector('h1')).fontSize}));
 console.log(f,JSON.stringify(r)); await p.close();}
await b.close();})();
