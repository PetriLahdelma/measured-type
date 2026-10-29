const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://' + path.resolve(process.argv[2]));
 const c = await p.context().newCDPSession(p); await c.send('DOM.enable'); await c.send('CSS.enable');
 const { root } = await c.send('DOM.getDocument');
 for (const s of ['h1','.lead','.meta','main > p:nth-of-type(3)','.callout p','th','td']) {
  const { nodeId } = await c.send('DOM.querySelector', { nodeId: root.nodeId, selector: s }); if (!nodeId) { console.log(s,'none'); continue; }
  const r = await c.send('CSS.getPlatformFontsForNode', { nodeId }); console.log(s, JSON.stringify(r.fonts)); }
 await b.close(); })();
