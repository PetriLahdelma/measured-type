const pw = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve('doc.html');
(async()=>{
for (const name of ['chromium','webkit']) {
  let browser; try { browser = await pw[name].launch(); } catch(e){ console.log(name,'unavailable'); continue; }
  for (const w of [320,360,400]) {
    const page = await browser.newPage({ viewport:{width:w,height:800}, deviceScaleFactor:2 });
    await page.goto(url);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const over = [...document.querySelectorAll('.doc *')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX!=='visible' || el.getBoundingClientRect().right > de.clientWidth - 15.5).map(el=>el.tagName+':'+el.textContent.slice(0,20));
      const vals = [...document.querySelectorAll('td:last-child')].map(td => { const lh=parseFloat(getComputedStyle(td).lineHeight); const rg=document.createRange(); rg.selectNodeContents(td); return td.textContent+'='+rg.getClientRects().length+'line'; });
      const h1 = document.querySelector('h1'); const lh = parseFloat(getComputedStyle(h1).lineHeight);
      return { pageOverflow: de.scrollWidth - de.clientWidth, over, vals, h1Lines: Math.round(h1.getBoundingClientRect().height/lh), h1Size:getComputedStyle(h1).fontSize, firstColW: document.querySelector('td').getBoundingClientRect().width|0 };
    });
    console.log(name, w, JSON.stringify(r));
    await page.screenshot({ path:`test/${name}-${w}.png`, fullPage:true });
    await page.close();
  }
  await browser.close();
}

})();