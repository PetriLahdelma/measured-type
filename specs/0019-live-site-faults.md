# Spec 0019: faults found by auditing a live site

Status: accepted 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/dogfood.test.js`).

## Why

`page-audit.js` was run, read-only, on 14 pages of digitaltableteur.com, a
production Next.js site with scroll reveals, responsive components and
icon-only controls. The first run crashed on the homepage and blocked every
other page. Most of the 48 HIGH contrast findings and 17 HIGH truncation
findings were the tool's own mistakes, and for the contrast ones its
suggested fix would have made readable text lighter. Each fault below was
confirmed on the live page before it was fixed.

## Requirements

- **D1** The zoom check pairs elements across its 1280, 640 and 256px loads
  by path and occurrence, not by position. A page that renders different
  elements at different widths made the lists differ in length: the
  homepage crashed, and on
  other pages elements could be compared with the wrong neighbour. Elements
  present at only some widths are listed under Not verified.
- **D2** Before any check reads the page, the audit scrolls through it once,
  returns to the top and finishes running animations, so a section that fades
  in when it scrolls into view is measured as the reader sees it. The site's
  contact form sat at opacity 0 until scrolled to, and every label in it was
  reported at 1.00:1.
- **D3** Text still at opacity 0 after that pass is not shown, so its
  contrast is listed under Not verified instead of reported at 1:1 with a
  fix that lightens it. Text at a partial opacity is measured as before: faint
  text still fails.
- **D4** An element without text is never reported as truncated text. Every
  page's icon-only menu button was MT-TRUNCATE HIGH (`""` cut at 200% zoom)
  because its icon overflows a box that sets `text-overflow: ellipsis`.
