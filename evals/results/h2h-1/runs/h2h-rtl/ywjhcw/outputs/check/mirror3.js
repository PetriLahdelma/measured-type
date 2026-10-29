const pw = require('playwright'); const path = require('path');
(async () => { const b = await pw.chromium.launch(); const p = await b.newPage({viewport:{width:300,height:340}, deviceScaleFactor: 3});
 await p.goto('file://' + path.join(__dirname, 'mirror.html'));
 await p.screenshot({ path: path.join(__dirname, 'row0.png'), clip: {x:200,y:8,width:100,height:42} });
 await p.screenshot({ path: path.join(__dirname, 'row5.png'), clip: {x:200,y:302,width:100,height:42} });
 await b.close(); })();
