// For each gray (#6b6b6b-ish) glyph in the image, report on which side its apex (mid-height extreme) lies.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
for (const f of process.argv.slice(2)) {
 const data = fs.readFileSync(__dirname + '/' + f).toString('base64');
 const r = await p.evaluate(async (d) => { const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img,0,0);
  const px = x.getImageData(0,0,c.width,c.height).data; const gray = [];
  for (let yy=0; yy<c.height; yy++) for (let xx=0; xx<c.width; xx++) { const i=(yy*c.width+xx)*4; const R=px[i],G=px[i+1],B=px[i+2];
    if (Math.abs(R-G)<6 && Math.abs(G-B)<6 && R>70 && R<200) gray.push([xx,yy]); }
  // cluster by x gaps
  gray.sort((a,b)=>a[0]-b[0]); const cl=[]; let cur=[];
  for (const g of gray) { if (cur.length && g[0]-cur[cur.length-1][0]>4) { cl.push(cur); cur=[]; } cur.push(g); } if (cur.length) cl.push(cur);
  return cl.filter(k=>k.length>30).map(k => { const ys=k.map(g=>g[1]); const y0=Math.min(...ys), y1=Math.max(...ys), mid=(y0+y1)/2;
    const xs=k.map(g=>g[0]); const minx=Math.min(...xs), maxx=Math.max(...xs);
    const atMinX = k.filter(g=>g[0]<=minx+1).map(g=>g[1]); const spread = Math.max(...atMinX)-Math.min(...atMinX);
    return { x: minx, h: y1-y0, w: maxx-minx, apex: spread < (y1-y0)/2 ? 'left-pointing ‹' : 'right-pointing ›' }; });
 }, data); console.log(f, JSON.stringify(r)); }
await b.close(); })();
