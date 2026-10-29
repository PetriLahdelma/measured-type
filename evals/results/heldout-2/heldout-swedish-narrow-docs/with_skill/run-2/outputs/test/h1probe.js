const { chromium, webkit } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '..', 'doc.html');
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await bt.launch();
    for (const size of ['1.5rem', '1.625rem', '1.75rem']) for (const w of [320, 360, 400]) {
      const page = await browser.newPage({ viewport: { width: w, height: 400 } });
      await page.goto(url);
      await page.addStyleTag({ content: `.doc h1{font-size:${size}}` });
      // find where the h1 word breaks: use Range rects per char
      const brk = await page.evaluate(() => {
        const t = document.querySelector('h1').firstChild; const s = t.data; let prev = null, out = '';
        for (let i = 0; i < s.length; i++) { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); const top = Math.round(r.getBoundingClientRect().top); if (prev !== null && top !== prev) out += '|'; out += s[i]; prev = top; }
        return out;
      });
      console.log(name, size, w, brk);
      await page.close();
    }
    await browser.close();
  }
})();
