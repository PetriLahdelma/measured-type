const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = 'file://' + path.resolve(__dirname, '..', 'report.html');
  const browser = await chromium.launch();
  for (const [w, scheme] of [[1280,'light'],[375,'light'],[320,'dark']]) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 }, colorScheme: scheme });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type()==='error' && errors.push(m.text()));
    await page.goto(file); await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const loaded = [...document.fonts].map(f => f.family + ':' + f.status);
      const rows = [...document.querySelectorAll('tbody tr')];
      const cols = [1,2,3,4].map(i => rows.map(tr => {
        const n = tr.children[i].querySelector('.n'); const b = n.getBoundingClientRect();
        // position of the decimal point / end of integer part
        const txt = n.firstChild; const range = document.createRange();
        const s = txt.textContent; const dot = s.indexOf('.');
        let x;
        if (dot >= 0) { range.setStart(txt, dot); range.setEnd(txt, dot+1); x = range.getBoundingClientRect().left; }
        else { const pad = n.querySelector('.pad'); x = pad ? pad.getBoundingClientRect().left : b.right; }
        return { text: tr.children[i].textContent, dot: Math.round(x*100)/100, end: Math.round(b.right*100)/100 };
      }));
      const head = [...document.querySelectorAll('thead .n')].map(n => Math.round(n.getBoundingClientRect().right*100)/100);
      return { loaded, cols, head, docW: document.documentElement.scrollWidth, vw: innerWidth,
        wrapScroll: document.querySelector('.table-wrap').scrollWidth, wrapW: document.querySelector('.table-wrap').clientWidth,
        rendered: getComputedStyle(document.querySelector('td')).fontVariantNumeric };
    });
    // which face actually rendered
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'tbody td .n' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    console.log(`\n== ${w}px ${scheme}`, JSON.stringify({ ...r, platformFonts: fonts, errors }, null, 1));
    await page.screenshot({ path: path.join(__dirname, `shot-${w}-${scheme}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
})();
