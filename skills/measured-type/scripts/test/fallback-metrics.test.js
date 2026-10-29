// Spec 0001 part D1-D3: scripts/fallback-metrics.py, judged in Chromium.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const SCRIPT = path.join(__dirname, '..', 'fallback-metrics.py');
const PY = process.env.MT_PYTHON || 'python3';
const FONTS = path.join(__dirname, '..', '..', '..', '..', 'evals', 'ofl-feature-check', 'files', 'fonts');
const WEB = path.join(FONTS, 'SourceSerif4[opsz,wght].ttf');
const GEORGIA = ['/System/Library/Fonts/Supplemental/Georgia.ttf', '/usr/share/fonts/truetype/msttcorefonts/Georgia.ttf'].find((f) => fs.existsSync(f));
const hasFontTools = spawnSync(PY, ['-c', 'import fontTools'], { encoding: 'utf8' }).status === 0;
const skip = !fs.existsSync(WEB) ? 'test font missing' : !GEORGIA ? 'Georgia not installed' : !hasFontTools ? `fontTools missing for ${PY} (set MT_PYTHON)` : false;

const runPy = (args) => spawnSync(PY, [SCRIPT, ...args], { encoding: 'utf8' });

test('D1 prints an @font-face fallback with all four overrides and the Safari note', { skip }, () => {
  const r = runPy([WEB, '--fallback', GEORGIA, '--name', 'Georgia']);
  assert.equal(r.status, 0, r.stderr);
  for (const d of ['src: local("Georgia")', 'size-adjust:', 'ascent-override:', 'descent-override:', 'line-gap-override:']) {
    assert.ok(r.stdout.includes(d), `missing ${d}\n${r.stdout}`);
  }
  assert.match(r.stdout, /Safari/);
});

test('D2 the generated fallback is closer to the web font than plain Georgia, within a line', { skip }, async () => {
  const css = runPy([WEB, '--fallback', GEORGIA, '--name', 'Georgia', '--family', 'Web Fallback']).stdout;
  const text = 'The measure is the length of a line. Somewhere between forty-five and seventy-five characters the eye can travel to the end of a line and return to the next without losing its place. Narrower lines break phrases apart and wider ones make the return sweep uncertain, especially when the leading is tight. '.repeat(3);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-fallback-'));
  const html = path.join(dir, 'p.html');
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: "Web"; src: url("${pathToFileURL(WEB).href}"); font-weight: 200 900; }
    ${css}
    p { inline-size: 600px; font-size: 18px; line-height: normal; margin: 0 0 40px; }
    #web { font-family: "Web"; } #plain { font-family: Georgia; } #matched { font-family: "Web Fallback"; }
  </style><p id="web">${text}</p><p id="plain">${text}</p><p id="matched">${text}</p>`);
  const { chromium } = require('playwright');
  const { measureLines } = require('../measure-line.js');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(html).href);
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: measureLines.toString() });
    const m = await page.evaluate(() => Object.fromEntries(['web', 'plain', 'matched'].map((id) => {
      const el = document.getElementById(id);
      return [id, { h: el.getBoundingClientRect().height, cpl: measureLines(`#${id}`).avgCharsPerLine, line: el.getBoundingClientRect().height / el.getClientRects().length }];
    })));
    const dh = (k) => Math.abs(m[k].h - m.web.h);
    const dc = (k) => Math.abs(m[k].cpl - m.web.cpl);
    const lineH = m.web.h / Math.max(1, Math.round(m.web.h / (18 * 1.3)));
    assert.ok(dh('matched') < dh('plain'), `height: matched ${m.matched.h}, plain ${m.plain.h}, web ${m.web.h}`);
    assert.ok(dc('matched') < dc('plain'), `chars/line: matched ${m.matched.cpl}, plain ${m.plain.cpl}, web ${m.web.cpl}`);
    assert.ok(dh('matched') <= lineH, `height off by ${dh('matched')}px, more than a line (${lineH}px)`);
  } finally {
    await browser.close();
  }
});

test('D3 a missing file exits nonzero with a message', { skip: !hasFontTools && 'fontTools missing' }, () => {
  const r = runPy(['missing.ttf', '--fallback', 'also-missing.ttf', '--name', 'X']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /missing\.ttf/);
});

test('D1 every override is a valid CSS percentage', { skip }, () => {
  const out = runPy([WEB, '--fallback', GEORGIA, '--name', 'Georgia']).stdout;
  for (const prop of ['size-adjust', 'ascent-override', 'descent-override', 'line-gap-override']) {
    const v = new RegExp(`${prop}: ([^;]+);`).exec(out)[1];
    assert.match(v, /^\d+(\.\d+)?%$/, `${prop}: ${v}`);
  }
});
