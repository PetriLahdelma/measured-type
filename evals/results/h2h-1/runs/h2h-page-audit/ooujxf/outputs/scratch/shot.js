const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();
for (const [f,w] of [['page.html',1280],['page.fixed.html',1280],['page.fixed.html',375]]){const p=await b.newPage({viewport:{width:w,height:900}});await p.goto('file://'+path.resolve(f));await p.screenshot({path:`scratch/${f.replace('.html','')}-${w}.png`,fullPage:true});
if(f==='page.fixed.html'){console.log(w, await p.evaluate(()=>[...document.querySelectorAll('th')].map(t=>Math.round(t.getBoundingClientRect().width)+':'+Math.round(t.getBoundingClientRect().height))))}
await p.close();}
await b.close();})();
