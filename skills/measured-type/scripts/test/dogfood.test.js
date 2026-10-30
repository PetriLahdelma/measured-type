// Spec 0019: faults found by auditing a live site (digitaltableteur.com).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const SCRIPTS = path.join(__dirname, '..');
const { audit } = require(path.join(SCRIPTS, 'page-audit.js'));

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser.close(); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-dogfood-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };

// A script adds a notice above the title only on wide screens, as
// responsive components do, so the three zoom loads hold different elements.
const RESPONSIVE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { font: 1rem/1.5 Georgia, serif; margin: 0 1rem; } h1 { font-size: 6vw; } .wide { font-size: 1rem; }</style>
</head><body>
<script>if (innerWidth >= 1000) { const n = document.createElement('p'); n.textContent = 'Open on weekdays.'; document.body.prepend(n); }</script>
<h1>Harbour timetable</h1>
<p>Ferries leave every hour from the north quay, and the last one waits for the train.</p>
<p class="wide">Tickets are sold on board.</p>
</body></html>`;

test('D1 the zoom check pairs elements by path, so a page that changes with width neither crashes nor compares the wrong elements', async () => {
  const r = await audit(write('responsive.html', RESPONSIVE), { browser });
  const vw = r.findings.filter((f) => f.rule === 'MT-ZOOM-VW');
  assert.deepEqual(vw.map((f) => f.location), ['h1'], JSON.stringify(r.findings.map((f) => [f.rule, f.location])));
  assert.ok(!r.findings.some((f) => /^MT-ZOOM/.test(f.rule) && /p/.test(f.location)), 'a paragraph in rem was flagged');
  assert.ok(r.notVerified.some((n) => /zoom growth of 1 text element/.test(n)), r.notVerified.join('; '));
});

// A section below the fold that fades in when it scrolls into view, one that
// never appears, and faint text that is meant to stay faint.
const REVEAL = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { font: 1rem/1.5 Georgia, serif; color: #041b23; background: #fff; margin: 0 1rem; }
.reveal { opacity: 0; transition: opacity 0.4s; margin-top: 2400px; } .reveal.in { opacity: 1; }
.never { opacity: 0; } .faint { opacity: 0.3; }</style>
</head><body>
<p>Ferries leave every hour from the north quay.</p>
<p class="faint">Timetable subject to weather.</p>
<p class="never">Thank you, your message was sent.</p>
<form class="reveal"><label for="n">Name</label> <input id="n"><p>We reply within two working days.</p></form>
<script>new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); })).observe(document.querySelector('.reveal'));</script>
</body></html>`;

test('D2 text that fades in on scroll is measured after it appears, not as 1:1', async () => {
  const r = await audit(write('reveal.html', REVEAL), { browser });
  const contrast = r.findings.filter((f) => f.rule === 'MT-CONTRAST');
  assert.ok(!contrast.some((f) => /reveal|label|form/.test(f.location)), JSON.stringify(contrast));
});

test('D3 text still at opacity 0 is not verified, while faint text still fails', async () => {
  const r = await audit(write('reveal.html', REVEAL), { browser });
  const contrast = r.findings.filter((f) => f.rule === 'MT-CONTRAST');
  assert.ok(!contrast.some((f) => /never/.test(f.location)), JSON.stringify(contrast));
  assert.ok(contrast.some((f) => /faint/.test(f.location) && f.severity === 'HIGH'), JSON.stringify(contrast));
  assert.ok(r.notVerified.some((n) => /contrast of 1 text element still at opacity 0/.test(n)), r.notVerified.join('; '));
});

// An icon-only menu button whose icon overflows its box, inside a toolbar
// that sets text-overflow: ellipsis, beside a label that really is cut.
const ICON = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { font: 1rem/1.5 Georgia, serif; margin: 0 1rem; }
.bar > * { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: inline-block; }
.menu { inline-size: 2rem; } .menu svg { inline-size: 3rem; block-size: 1rem; } .label { inline-size: 6rem; }</style>
</head><body><p>Harbour timetable for the north quay.</p>
<div class="bar"><button class="menu" aria-label="Open navigation menu"><svg viewBox="0 0 48 16"><rect width="48" height="16"/></svg></button>
<span class="label">Departures from the north quay</span></div>
</body></html>`;

test('D4 an element without text is never reported as truncated text', async () => {
  const r = await audit(write('icon.html', ICON), { browser });
  const cut = r.findings.filter((f) => f.rule === 'MT-TRUNCATE');
  assert.ok(!cut.some((f) => /menu/.test(f.location)), JSON.stringify(cut));
  assert.ok(cut.some((f) => /label/.test(f.location)), JSON.stringify(cut));
});

// Screen-reader-only text, the usual pattern, and a section that a script
// fades in over 1.2 seconds with requestAnimationFrame (no CSS animation).
const HIDDEN = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { font: 1rem/1.5 Georgia, serif; color: #041b23; background: #fff; margin: 0 1rem; }
.sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; white-space: nowrap; clip-path: inset(50%); color: #ccc; }
.slow { opacity: 0; margin-top: 2400px; }</style>
</head><body>
<p>Ferries leave every hour from the north quay.<span class="sr-only">From the north quay to the outer islands, every hour</span></p>
<section class="slow"><p>The last ferry waits for the evening train.</p></section>
<script>new IntersectionObserver((es, o) => es.forEach((e) => { if (!e.isIntersecting) return; o.disconnect();
  const t0 = performance.now(); const tick = (t) => { const k = Math.min(1, (t - t0) / 1200); e.target.style.opacity = k; if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }))
  .observe(document.querySelector('.slow'));</script>
</body></html>`;

test('D5 visually hidden text is neither truncated text nor a contrast failure', async () => {
  const r = await audit(write('hidden.html', HIDDEN), { browser });
  assert.ok(!r.findings.some((f) => /sr-only/.test(f.location)), JSON.stringify(r.findings.map((f) => [f.rule, f.location])));
});

test('D6 a fade a script runs is measured once it settles', async () => {
  const r = await audit(write('hidden.html', HIDDEN), { browser });
  assert.ok(!r.findings.some((f) => f.rule === 'MT-CONTRAST' && /slow/.test(f.location)), JSON.stringify(r.findings.filter((f) => f.rule === 'MT-CONTRAST')));
});

// A video wider than a phone inside a box that hides overflow, with the usual
// fallback sentence inside it that a browser that plays video never draws.
const VIDEO = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { font: 1rem/1.5 Georgia, serif; margin: 0 1rem; } .wrap { overflow: hidden; } video { inline-size: 600px; block-size: 200px; }</style>
</head><body><p>Level meter on the master bus.</p>
<div class="wrap"><video muted>Your browser does not play this video.</video></div>
</body></html>`;

test('D7 fallback text inside a video is not text on the page', async () => {
  const r = await audit(write('video.html', VIDEO), { browser });
  assert.ok(!r.findings.some((f) => /video/.test(f.location)), JSON.stringify(r.findings.map((f) => [f.rule, f.location])));
});
