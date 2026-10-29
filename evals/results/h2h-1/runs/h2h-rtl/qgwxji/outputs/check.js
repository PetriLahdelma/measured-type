const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 600 } });
  const dir = __dirname;
  // compare English with original vs new css
  const geo = async () => p.evaluate(() => {
    const q = s => document.querySelector(s).getBoundingClientRect();
    const r = x => [Math.round(x.left), Math.round(x.top), Math.round(x.width), Math.round(x.height)];
    return ['.crumbs', '.title h2', '.tag', '.steps', '.steps li', '.note', '.next'].map(s => s + ' ' + r(q(s)).join(','));
  });
  await p.goto('file://' + dir + '/help.html'); const a = await geo(); await p.screenshot({ path: dir + '/shot-en-orig.png' });
  await p.goto('file://' + dir + '/ltr-check.html'); const c = await geo(); await p.screenshot({ path: dir + '/shot-en-new.png' });
  console.log('EN identical geometry:', JSON.stringify(a) === JSON.stringify(c)); if (JSON.stringify(a) !== JSON.stringify(c)) console.log(a, c);
  await p.goto('file://' + dir + '/rtl-check.html'); console.log(await geo()); await p.screenshot({ path: dir + '/shot-ar.png' });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  for (const s of ['p', '.steps li', 'h2']) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: s });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    console.log(s, JSON.stringify(fonts));
  }
  console.log(await p.evaluate(() => getComputedStyle(document.querySelector('.next'), '::after').content));
  await b.close();
})();
