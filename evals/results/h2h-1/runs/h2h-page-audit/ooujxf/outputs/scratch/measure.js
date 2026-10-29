const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const browser = await chromium.launch();
  const cases = [[320,1],[375,1],[768,1],[1280,1],[1920,1],[640,2,'1280@200%']];
  for (const [w,dpr,label] of cases) {
    const page = await browser.newPage({ viewport:{width:w,height:900}, deviceScaleFactor:dpr });
    await page.goto(file);
    const r = await page.evaluate(() => {
      const cs = el => getComputedStyle(el);
      const lines = el => {
        // chars per line via text node ranges
        const tn = [...el.childNodes].filter(n=>n.nodeType===3);
        const out=[]; let cur=null, curTop=null;
        for (const n of tn) for (let i=0;i<n.length;i++){ const rg=document.createRange(); rg.setStart(n,i); rg.setEnd(n,i+1); const rc=rg.getClientRects()[0]; if(!rc) continue; const t=Math.round(rc.top); if(curTop===null||Math.abs(t-curTop)>3){ if(cur!==null) out.push(cur); cur=0; curTop=t;} cur++; }
        if(cur!==null) out.push(cur); return out;
      };
      const q = s => document.querySelector(s);
      const ps = [...document.querySelectorAll("main > p, .callout p")];
      const callout = q('.callout'); const table = q('table'); const main=q('main');
      const h1=q('h1'), h2=q('h2');
      const h1l = h1.getClientRects(); 
      return {
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: cs(document.body).fontSize + '/' + cs(document.body).lineHeight,
        h1: cs(h1).fontSize + '/' + cs(h1).lineHeight + ' h=' + Math.round(h1.getBoundingClientRect().height),
        h2: cs(h2).fontSize + '/' + cs(h2).lineHeight,
        lead: cs(q('.lead')).fontSize + ' w=' + Math.round(q('.lead').getBoundingClientRect().width) + ' right=' + Math.round(q('.lead').getBoundingClientRect().right),
        meta: cs(q('.meta')).fontSize + ' ' + cs(q('.meta')).color,
        mainW: Math.round(main.getBoundingClientRect().width),
        cpl: ps.map(p => { const l=lines(p); const body=l.slice(0,-1); return (p.className||'p')+': max '+Math.max(...l)+' avg '+(body.length?Math.round(body.reduce((a,b)=>a+b,0)/body.length):l[0])+' lines '+l.length; }),
        calloutClipped: callout.scrollHeight - callout.clientHeight,
        tableRight: Math.round(table.getBoundingClientRect().right), tableW: Math.round(table.getBoundingClientRect().width),
        tableWrapOverflow: table.parentElement.scrollWidth - table.parentElement.clientWidth,
      };
    });
    console.log('== '+(label||w+'px'), JSON.stringify(r,null,1));
    await page.close();
  }
  await browser.close();
})();
