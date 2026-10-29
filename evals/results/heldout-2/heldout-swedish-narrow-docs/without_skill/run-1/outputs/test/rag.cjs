const pw=require('playwright'),path=require('path');
(async()=>{for(const name of ['webkit','chromium']){const b=await pw[name].launch();
for(const mode of ['pretty','wrap']){const p=await b.newPage({viewport:{width:320,height:800},deviceScaleFactor:2});
await p.goto('file://'+path.resolve('doc.html'));
if(mode==='wrap')await p.addStyleTag({content:'p,li{text-wrap:wrap!important}'});
const lines=await p.evaluate(()=>[...document.querySelectorAll('p')].map(el=>{const w=el.clientWidth;const r=document.createRange();r.selectNodeContents(el);const rects=[...r.getClientRects()];const byTop={};rects.forEach(x=>{const k=Math.round(x.top);byTop[k]=Math.max(byTop[k]||0,x.right)-0});const xs=Object.values(byTop).slice(0,-1).map(v=>Math.round(v-el.getBoundingClientRect().left));return xs.join(',')+' /'+w}));
console.log(name,mode,lines.join(' | '));
await p.screenshot({path:`test/${name}-320-${mode}.png`});await p.close();}await b.close();}})();
