const { chromium, webkit } = require('playwright');
(async()=>{ for (const [n,b] of [['chromium',chromium],['webkit',webkit]]) { try{
 const br=await b.launch(); const p=await br.newPage({viewport:{width:1400,height:330}});
 await p.goto('file://'+process.argv[2]); await p.waitForTimeout(500);
 await p.screenshot({path:process.argv[3]+'-'+n+'.png'}); await br.close(); }catch(e){console.log(n,e.message.split('\n')[0])} } })();
