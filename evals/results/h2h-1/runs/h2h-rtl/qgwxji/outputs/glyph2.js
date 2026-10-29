const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:900,height:400}, deviceScaleFactor:2});
  for (const f of process.argv.slice(2)) {
    await p.goto('file://' + __dirname + '/' + f);
    await p.addStyleTag({ content: `.crumbs li{color:transparent!important} .crumbs a{color:transparent!important}` });
    const items = p.locator('.crumbs li'); const out = [];
    for (let i = 1; i < await items.count(); i++) {
      const buf = await items.nth(i).screenshot();
      out.push(await p.evaluate(async (b64) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img,0,0);
        const d = x.getImageData(0,0,c.width,c.height).data; let minX=1e9,maxX=-1,pts=[];
        for (let y=0;y<c.height;y++) for (let X=0;X<c.width;X++){const k=(y*c.width+X)*4; if(d[k]>180&&d[k+1]<80&&d[k+2]<80){pts.push([X,y]);minX=Math.min(minX,X);maxX=Math.max(maxX,X);}}
        if(!pts.length) return 'no red';
        const ys = x => pts.filter(p=>p[0]===x).map(p=>p[1]); const spread = a => a.length? Math.max(...a)-Math.min(...a):0;
        return spread(ys(minX)) > spread(ys(maxX)) ? '›' : '‹';
      }, buf.toString('base64')));
    }
    console.log(f, out.join(' '));
  }
  await b.close();
})();
