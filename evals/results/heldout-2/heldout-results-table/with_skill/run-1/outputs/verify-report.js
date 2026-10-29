// Verifies report.html in Chromium: font loaded, figures, decimal alignment,
// change values match the data, minus signs, hard spaces, reflow at 320 px.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.join(__dirname, 'report.html');
  const browser = await chromium.launch();
  const results = [];
  const ok = (name, pass, detail = '') => results.push({ name, pass, detail });

  for (const width of [1280, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);

    const r = await page.evaluate(() => {
      const fontOk = document.fonts.check('16px "Source Serif 4"') &&
        [...document.fonts].some(f => f.family.includes('Source Serif 4') && f.status === 'loaded');
      const table = document.getElementById('results');
      const body = table.tBodies[0];
      const cs = getComputedStyle(table);
      const cols = table.tHead.rows[0].cells.length;
      // Right edge of the integer part in every row, per numeric column.
      const align = [];
      for (let c = 1; c < cols; c++) {
        const edges = [...body.rows].map(r => r.cells[c].querySelector('.int').getBoundingClientRect().right);
        align.push(Math.max(...edges) - Math.min(...edges));
      }
      const cells = [...body.rows].map(r => [...r.cells].map(td => td.textContent));
      const changeCells = [...body.rows].map(r => r.cells[cols - 1]);
      const wraps = [...body.querySelectorAll('td')].filter(td => {
        const rects = td.querySelector('.int').getClientRects();
        return td.getBoundingClientRect().height > 2 * parseFloat(getComputedStyle(td).lineHeight) + 30;
      }).length;
      return {
        fontOk,
        numeric: cs.fontVariantNumeric,
        theadCaps: getComputedStyle(table.tHead.rows[0].cells[0]).fontVariantCaps,
        align,
        cells,
        hyphenMinus: changeCells.some(td => td.textContent.includes('-')),
        nbspPP: changeCells.filter(td => td.textContent.includes('pp')).every(td => td.textContent.includes(' pp')),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scrollerOverflow: (() => { const s = document.querySelector('.scroller'); return s.scrollWidth - s.clientWidth; })(),
        wraps,
      };
    });

    ok(`[${width}] Source Serif 4 loaded`, r.fontOk);
    ok(`[${width}] table figures lining tabular`, /lining-nums/.test(r.numeric) && /tabular-nums/.test(r.numeric), r.numeric);
    ok(`[${width}] header small caps`, r.theadCaps === 'all-small-caps', r.theadCaps);
    ok(`[${width}] decimal points align per column (px spread)`, r.align.every(d => d < 0.5), r.align.map(d => d.toFixed(2)).join(', '));
    ok(`[${width}] no hyphen-minus in change column`, !r.hyphenMinus);
    ok(`[${width}] pp bound with no-break space`, r.nbspPP);
    ok(`[${width}] page has no sideways scroll`, r.pageOverflow <= 0, `overflow ${r.pageOverflow}px, table scroller ${r.scrollerOverflow}px`);
    if (width === 1280) {
      const expected = [
        ['Revenue (EUR)', '1,234,567', '1,310,050', '1,288,400', '−1.7%'],
        ['Operating margin', '12.4%', '13.1%', '11.8%', '−1.3 pp'],
        ['Headcount', '48', '52', '51', '−1'],
        ['Churn', '3.2%', '2.9%', '3.4%', '+0.5 pp'],
      ];
      ok('rendered cells match the brief', JSON.stringify(r.cells) === JSON.stringify(expected), JSON.stringify(r.cells));
    }
    await page.screenshot({ path: path.join(__dirname, `report-${width}.png`), fullPage: true });
    await page.close();
  }

  // Change column equals Q3 vs Q2 for every row.
  const d = { rev: [1310050, 1288400], om: [13.1, 11.8], hc: [52, 51], ch: [2.9, 3.4] };
  const pct = Math.round(((d.rev[1] / d.rev[0]) - 1) * 1000) / 10;
  ok('change = Q3 vs Q2', pct === -1.7 && Math.round((d.om[1] - d.om[0]) * 10) / 10 === -1.3 &&
    d.hc[1] - d.hc[0] === -1 && Math.round((d.ch[1] - d.ch[0]) * 10) / 10 === 0.5, `revenue ${pct}%`);

  await browser.close();
  let failed = 0;
  for (const t of results) {
    if (!t.pass) failed++;
    console.log(`${t.pass ? 'PASS' : 'FAIL'}  ${t.name}${t.detail ? '  (' + t.detail + ')' : ''}`);
  }
  process.exit(failed ? 1 : 0);
})();
