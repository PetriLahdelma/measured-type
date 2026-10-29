const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const c = await p.context().newCDPSession(p);
  for (const f of ['ar-original', 'ar-new']) {
    await p.goto('file://' + path.join(__dirname, f + '.html'));
    await c.send('DOM.enable'); await c.send('CSS.enable');
    const { root } = await c.send('DOM.getDocument');
    for (const sel of ['main > p', '.crumbs li:nth-child(2)']) {
      const { nodeId } = await c.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      const { fonts } = await c.send('CSS.getPlatformFontsForNode', { nodeId });
      console.log(f, sel, JSON.stringify(fonts));
    }
  }
  await b.close();
})();
