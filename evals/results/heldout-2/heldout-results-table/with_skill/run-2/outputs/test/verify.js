const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = 'file://' + path.resolve(__dirname, '..', 'report.html');
  const browser = await chromium.launch();
  for (const [w, scheme] of [[1280,'light'], [320,'light'], [1280,'dark']]) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 }, colorScheme: scheme });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type()==='error' && errors.push(m.text()));
    await page.goto(file); await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const t = document.getElementById('results');
      const out = { fontLoaded: [...document.fonts].map(f => f.family + ':' + f.status), cells: [], cols: {} };
      out.fvn = getComputedStyle(t).fontVariantNumeric;
      out.prose = getComputedStyle(document.querySelector('.prose')).fontVariantNumeric;
      const rows = [...t.tBodies[0].rows];
      for (let c = 1; c <= 4; c++) { if (c<4) { out.cols[c] = { cellRight: rows.map(r => { const cell=r.cells[c]; const rg=document.createRange(); rg.selectNodeContents(cell); return +rg.getBoundingClientRect().right.toFixed(2); }) }; continue; }
        const heads = rows.map(r => r.cells[c].querySelector('.head').getBoundingClientRect().right);
        const cellsR = rows.map(r => r.cells[c].querySelector('.fig').getBoundingClientRect().right);
        const hdr = t.tHead.rows[0].cells[c].getBoundingClientRect().right - parseFloat(getComputedStyle(t.tHead.rows[0].cells[c]).paddingRight);
        out.cols[c] = { headRight: heads.map(x => +x.toFixed(2)), figRight: cellsR.map(x=>+x.toFixed(2)), headerTextRight: +hdr.toFixed(2) };
      }
      out.text = rows.map(r => [...r.cells].map(c => c.textContent));
      out.codepoints = rows.map(r => [...r.cells[4].textContent].map(ch => ch.codePointAt(0).toString(16)).join(' '));
      out.docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      out.wrapOverflow = (() => { const w = document.querySelector('.table-wrap'); return w.scrollWidth - w.clientWidth; })();
      return out;
    });
    console.log(`\n== ${w}px ${scheme}`, JSON.stringify(r, null, 1), 'errors:', errors);
    await page.screenshot({ path: path.join(__dirname, `shot-${w}-${scheme}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
})();
// WCAG 1.4.12 text-spacing override check
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, '..', 'report.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }' });
  const r = await page.evaluate(() => [...document.querySelectorAll('td.change')].map(td => {
    const f = td.querySelector('.fig').getBoundingClientRect(), c = td.getBoundingClientRect();
    return { overflow: +(f.right - c.right).toFixed(2), head: +td.querySelector('.head').getBoundingClientRect().right.toFixed(2) };
  }));
  console.log('\n== text-spacing override', JSON.stringify(r));
  await page.screenshot({ path: path.join(__dirname, 'shot-text-spacing.png'), fullPage: true });
  await browser.close();
})();
