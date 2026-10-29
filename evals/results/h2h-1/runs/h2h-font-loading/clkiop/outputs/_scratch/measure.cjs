const { chromium } = require('playwright');
(async()=>{
const { readFileSync } = require('fs');
const path = require('path');
const dir = path.resolve('.');
const html = readFileSync('article.html','utf8');
const texts = {
  body: [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m=>m[1].replace(/<[^>]+>/g,'')).join(' '),
  h1: 'Notes from the field',
  em: 'nothing else',
};
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + dir + '/article.html');
const res = await page.evaluate(async ({texts}) => {
  const ff = (n,u,d)=>{ const f=new FontFace(n,`url(${u})`,d); document.fonts.add(f); return f.load(); };
  await ff('SSR','fonts/SourceSerif4[opsz,wght].ttf'.replace('[','%5B').replace(']','%5D'),{weight:'200 900'});
  await ff('SSI','fonts/SourceSerif4-Italic[opsz,wght].ttf'.replace('[','%5B').replace(']','%5D'),{weight:'200 900',style:'italic'});
  const w=(fam,size,weight,style,t)=>{const s=document.createElement('span');s.style.cssText=`font:${style} ${weight} ${size}px ${fam};white-space:nowrap;position:absolute;font-optical-sizing:auto`;s.textContent=t;document.body.append(s);const r=s.getBoundingClientRect().width;s.remove();return r;};
  const cases=[['body',18,400,'normal','SSR','Georgia'],['h1',36,700,'normal','SSR','Georgia'],['em',18,400,'italic','SSI','Georgia'],['bodyItalic',18,400,'italic','SSI','Georgia'],['bodyBoldItalic',18,700,'italic','SSI','Georgia'],['bodyBold',18,700,'normal','SSR','Georgia']];
  return cases.map(([k,sz,wt,st,a,b])=>{const t=texts[k]||texts.body;const wa=w(a,sz,wt,st,t),wb=w(b,sz,wt,st,t);return {k,sz,wt,st,web:wa,geo:wb,ratio:wa/wb};});
},{texts});
console.table(res);
await browser.close();
})();
