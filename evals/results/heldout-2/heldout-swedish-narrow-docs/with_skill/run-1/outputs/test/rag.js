const { webkit, chromium } = require('playwright'); const path = require('path');
(async () => { for (const bt of [webkit, chromium]) { const b = await bt.launch();
 for (const extra of ['', '.doc p{text-wrap:wrap}', '.doc :not(pre)>code{display:inline}']) {
  const p = await b.newPage({ viewport: { width: 320, height: 900 } });
  await p.goto('file://' + path.resolve(__dirname, '../doc.html')); if (extra) await p.addStyleTag({ content: extra });
  const lines = await p.evaluate(() => { const el = document.querySelectorAll('.doc > p')[1]; const r = document.createRange(); const out = []; let cur = '', top = null;
   const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = walker.nextNode())) for (let i = 0; i < n.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1); const rc = r.getClientRects()[0]; if (!rc) continue; if (top !== null && rc.top > top + 5) { out.push(cur); cur = ''; } top = rc.top; cur += n.data[i]; } out.push(cur); return out; });
  console.log(bt.name(), extra || 'current'); lines.forEach(l => console.log('   |' + l)); await p.close(); }
 await b.close(); } })();
