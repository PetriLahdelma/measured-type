const { chromium, webkit } = require('playwright');
(async()=>{ for (const [n,b] of [['chromium',chromium],['webkit',webkit]]) {
 const br=await b.launch(); const p=await br.newPage({viewport:{width:820,height:900}});
 await p.goto('file://'+process.argv[2]); await p.evaluate(()=>document.fonts.ready);
 const r=await p.evaluate(()=>{
   const fonts=[...document.fonts].map(f=>f.family+' '+f.style+' '+f.status);
   const w=t=>{const s=document.createElement('span');s.textContent=t;document.querySelector('td:nth-child(2)').appendChild(s);const x=s.getBoundingClientRect().width;s.remove();return x.toFixed(2)};
   const cs=getComputedStyle(document.querySelector('em abbr'));
   return {fonts, tdOnes:w('111'), tdZeros:w('000'), emAbbrCaps:cs.fontVariantCaps, synth:getComputedStyle(document.querySelector('.prose')).fontSynthesis};
 });
 console.log(n, JSON.stringify(r));
 await p.screenshot({path:process.argv[3]+'-'+n+'.png',fullPage:true}); await br.close(); } })();
