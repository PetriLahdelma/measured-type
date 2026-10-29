// For each row, crop the separator (between item text boxes) and report whether the chevron apex points left or right.
const pw = require('playwright'); const path = require('path');
(async () => { for (const n of ['chromium','webkit']) { const b = await pw[n].launch(); const p = await b.newPage({viewport:{width:300,height:340}});
 for (const [file, sel] of [['mirror.html','ol'], ['rtl-ar.html','.crumbs ol'], ['ltr-new.html','.crumbs ol']]) {
  await p.goto('file://' + path.join(__dirname, file));
  const n2 = await p.evaluate(s => document.querySelectorAll(s).length, sel);
  for (let i = 0; i < n2; i++) {
   const clip = await p.evaluate(([s, i]) => { const ol = document.querySelectorAll(s)[i]; const li = ol.children[1]; if (getComputedStyle(ol).display !== 'flex') return null;
     const r = li.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(li); const rects = [...rg.getClientRects()];
     const txt = document.createRange(); txt.selectNodeContents(li.lastChild.nodeType === 3 ? li.lastChild : li.lastChild); const t = txt.getBoundingClientRect();
     const rtl = getComputedStyle(li).direction === 'rtl';
     // separator sits at the item's start side
     const x0 = rtl ? t.right : r.left, x1 = rtl ? r.right : t.left;
     return { x: Math.floor(x0), y: Math.floor(r.top), width: Math.max(1, Math.ceil(x1 - x0)), height: Math.ceil(r.height) }; }, [sel, i]);
   if (!clip) continue;
   const buf = await p.screenshot({ clip });
   const verdict = await p.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
     const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
     const d = g.getImageData(0, 0, c.width, c.height).data; let top = 1e9, bot = -1; const rowsInk = [];
     for (let y = 0; y < c.height; y++) { let xs = []; for (let x = 0; x < c.width; x++) { const k = (y * c.width + x) * 4; if (d[k] + d[k+1] + d[k+2] < 450) xs.push(x); } rowsInk.push(xs); if (xs.length) { top = Math.min(top, y); bot = Math.max(bot, y); } }
     if (bot < 0) return 'no ink'; const mid = Math.round((top + bot) / 2); const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
     return avg(rowsInk[mid]) > avg(rowsInk[top]) ? 'points right ›' : 'points left ‹'; }, buf.toString('base64'));
   console.log(n, file, i, verdict);
  } } await b.close(); } })();
