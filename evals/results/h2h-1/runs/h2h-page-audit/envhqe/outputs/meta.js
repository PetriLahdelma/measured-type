const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1280,height:900}});
await p.goto('file://' + process.cwd() + '/page.fixed.html');
console.log(await p.evaluate(()=>['p.meta','main>p:nth-of-type(3)','.lead','h2','th'].map(s=>{const e=document.querySelector(s);const c=getComputedStyle(e);return s+' '+c.fontSize+' '+c.lineHeight+' '+c.color})));
await b.close(); })();
