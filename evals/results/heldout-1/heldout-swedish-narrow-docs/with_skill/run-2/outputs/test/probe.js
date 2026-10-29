const { chromium, webkit, firefox } = require('playwright');
const words = ['Användarbehörighetsinställningar','Lagringsutrymmesbegränsningar','användarbehörighetsinställningarna','säkerhetskopieringsschemat','lagringsutrymmesgräns','Behörighetsförändringar','granskningsloggen','administratören','systemet','arbetsytan'];
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const b = await bt.launch(); const p = await b.newPage();
    await p.setContent(`<html lang="sv"><body>${words.map(w=>`<p style="width:1px;hyphens:auto;-webkit-hyphens:auto;hyphenate-limit-chars:auto 1 1;-webkit-hyphenate-limit-before:1;-webkit-hyphenate-limit-after:1;font:16px system-ui">${w}</p>`).join('')}</body></html>`);
    const r = await p.evaluate(() => [...document.querySelectorAll('p')].map(el => { const n = el.firstChild; let res=[],cur='',top=null; for (let i=0;i<n.length;i++){const rg=document.createRange();rg.setStart(n,i);rg.setEnd(n,i+1);const rc=rg.getClientRects()[0]; if(top!==null&&rc.top>top+4){res.push(cur);cur='';} top=rc.top; cur+=n.data[i];} res.push(cur); return res.join('-'); }));
    console.log(name, '\n ' + r.join('\n '));
    await b.close();
  }
})();
