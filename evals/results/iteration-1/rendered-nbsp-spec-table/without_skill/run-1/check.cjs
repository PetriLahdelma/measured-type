const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:375,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+process.argv[2]);
  for (const lang of ['en','fi']) {
    await p.click(`button[data-lang=${lang}]`);
    const rows = await p.$$eval('#specs tr', trs => trs.map(tr => [...tr.children].map(c => c.textContent)));
    console.log(lang, await p.getAttribute('html','lang'));
    for (const r of rows) console.log('  ', r.map(c => JSON.stringify(c).replace(/ /g,'⍽')).join(' | '));
    const bad = rows.flat().filter(c => /[  ]/.test(c) && /\d/.test(c));
    console.log('  breakable spaces in numeric cells:', bad.length);
    await p.screenshot({path: `../shot-${lang}.png`, fullPage:true});
  }
  const sw = await p.evaluate(()=>document.documentElement.scrollWidth);
  console.log('scrollWidth@375', sw, 'errors', errs);
  await b.close();
})();
