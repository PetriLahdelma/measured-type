const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
 for (const w of [320, 1280]) { const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
  const r = await p.evaluate(() => { const bad = []; for (const el of document.querySelectorAll('main *')) { const cs = getComputedStyle(el); if ((cs.overflow==='hidden'||cs.overflowY==='hidden') && el.scrollHeight > el.clientHeight) bad.push(el.className||el.tagName); }
   const wrap = document.querySelector('.table-wrap'); return { clipped: bad, pageScrollW: document.documentElement.scrollWidth, vw: innerWidth, wrap: wrap && [wrap.clientWidth, wrap.scrollWidth] }; });
  console.log('spacing', w, JSON.stringify(r));
  await p.close(); }
 // 200% text: set root font-size 32px
 const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto('file://' + path.resolve(process.argv[2]));
 await p.addStyleTag({ content: 'html { font-size: 32px; }' });
 console.log('root32', JSON.stringify(await p.evaluate(() => ({ h1: getComputedStyle(document.querySelector('h1')).fontSize, body: getComputedStyle(document.body).fontSize, sw: document.documentElement.scrollWidth }))));
 await b.close(); })();
