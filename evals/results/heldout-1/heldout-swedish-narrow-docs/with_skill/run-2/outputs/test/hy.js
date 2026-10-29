const { chromium, webkit } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '..', 'doc.html');
const variants = process.argv.slice(2);
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await bt.launch();
    for (const v of variants) {
      const [c,bf,af] = v.split(',');
      const row = [];
      for (const w of [320, 340, 360, 375, 390, 400]) {
        const p = await b.newPage({ viewport: { width: w, height: 800 } });
        await p.goto(file);
        await p.addStyleTag({ content: `.doc{hyphenate-limit-chars:${c} ${bf} ${af};-webkit-hyphenate-limit-before:${bf};-webkit-hyphenate-limit-after:${af}}` });
        const r = await p.evaluate(() => [...document.querySelectorAll('.doc > p, li')].map(el => {
          let ends=[], top=null, prev=null; const tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let n, lines=1, hy=0, run=0, maxrun=0;
          while((n=tw.nextNode())) for(let i=0;i<n.length;i++){const rg=document.createRange();rg.setStart(n,i);rg.setEnd(n,i+1);const rc=rg.getClientRects()[0]; if(!rc) continue; if(top!==null && rc.top>top+8){lines++; const isHy=/\S/.test(prev)&&/\S/.test(n.data[i]); if(isHy){hy++;run++;maxrun=Math.max(maxrun,run);} else run=0;} top=rc.top; prev=n.data[i];}
          return `${hy}/${lines}${maxrun>2?'!':''}`; }).join(' '));
        row.push(`${w}:[${r}]`);
        await p.close();
      }
      console.log(name, v.padEnd(8), row.join(' '));
    }
    await b.close();
  }
})();
