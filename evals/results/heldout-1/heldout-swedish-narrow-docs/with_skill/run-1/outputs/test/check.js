const { chromium, webkit } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../doc.html');
(async () => {
  for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
    let b; try { b = await bt.launch(); } catch (e) { console.log(name, 'launch failed', e.message.split('\n')[0]); continue; }
    for (const w of [320, 360, 400]) {
      for (const zoom of [1]) {
      const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
      await p.goto(file);
      const r = await p.evaluate(() => {
        const de = document.documentElement;
        const out = { scrollW: de.scrollWidth, clientW: de.clientWidth };
        const doc = document.querySelector('.doc');
        const cr = doc.getBoundingClientRect();
        out.overflow = [...doc.querySelectorAll('*')].filter(el => {
          if (el.closest('pre')) return false;
          const r = el.getBoundingClientRect(); return r.right > cr.right - parseFloat(getComputedStyle(doc).paddingRight) + 0.5;
        }).map(el => el.tagName + ':' + el.textContent.slice(0, 30));
        // lines per heading and line breaks: use Range per character
        const lines = el => {
          const t = el.firstChild; const res = []; let cur = '', top = null;
          for (let i = 0; i < t.length; i++) { const rg = document.createRange(); rg.setStart(t, i); rg.setEnd(t, i + 1); const b = rg.getClientRects()[0]; if (!b) continue; if (top !== null && b.top > top + 2) { res.push(cur); cur = ''; } top = b.top; cur += t.data[i]; }
          res.push(cur); return res;
        };
        out.h = [...doc.querySelectorAll('h1,h2,td:first-child,li,p')].map(el => lines(el).join(' | '));
        out.gaps = [...doc.children].slice(1).map(el => { const pr = el.previousElementSibling.getBoundingClientRect(); return el.tagName + ' ' + Math.round(el.getBoundingClientRect().top - pr.bottom) + ' top=' + Math.round(el.getBoundingClientRect().top - doc.getBoundingClientRect().top); });
        out.pre = (() => { const pre = document.querySelector('pre'); return pre.scrollWidth + '/' + pre.clientWidth; })();
        out.code = lines(document.querySelector('p code')).join(' | ');
        return out;
      });
      console.log(`\n== ${name} ${w}px  page ${r.scrollW}/${r.clientW}  pre ${r.pre}`);
      console.log('overflow:', r.overflow);
      r.h.forEach(x => console.log('  ' + x));
      console.log('  code:', r.code);
      console.log('  gaps:', r.gaps.join(', '));
      await p.screenshot({ path: path.join(__dirname, `${name}-${w}.png`), fullPage: true });
      await p.close();
      }
    }
    await b.close();
  }
})();
