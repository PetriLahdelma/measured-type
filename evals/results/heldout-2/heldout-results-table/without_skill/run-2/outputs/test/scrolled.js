const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:375,height:640}});
await p.goto('file://'+path.resolve(__dirname,'../report.html'));await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>{const r=document.querySelector('.table-scroll');r.scrollLeft=r.scrollWidth;});
await p.screenshot({path:path.join(__dirname,'mobile-scrolled.png')});await b.close();})();
