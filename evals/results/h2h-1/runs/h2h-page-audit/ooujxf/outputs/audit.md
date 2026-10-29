# Typography audit: Release notes 4.2

Files: `page.html` + `page.css` (original), `page.fixed.html` + `page.fixed.css` (corrected).

All numbers below were measured in headless Chromium (Playwright) at 320, 375, 768, 1280 and 1920 px wide, plus 1280 px at 200% zoom (640 CSS px at 2x). Characters per line were counted from rendered line boxes, not estimated. Scripts are in `scratch/`.

## Verdict

| | Original | Fixed |
|---|---|---|
| Readability checklist (10 rows, see end) | **3 / 10** | **10 / 10** |
| Horizontal page overflow at 375 px | 749 px | 0 |
| Horizontal page overflow at 1280 px | 102 px | 0 |
| Body characters per line (desktop) | 86 to 93 | 60 to 70 |
| Callout text hidden by clipping (375 px) | 73 px | 0 |
| H1 lines overlapping | yes (desktop) | no |

The page is short and simple, but almost every rule in the stylesheet works against reading. The worst problems are not cosmetic: the migration warning is cut off, the lead paragraph runs off screen at every width below 1148 px, and the title overprints itself on desktop.

## Findings, by severity

### Critical

**1. The migration warning is clipped (`.callout { height: 5em; overflow: hidden }`).**
The callout is the single most important sentence on the page, and a fixed height in `em` cannot hold a paragraph whose line count depends on viewport width and zoom. Measured hidden text: 95 px at 320, 73 px at 375, 7 px even at desktop (the last line is shaved). Readers on phones never see "or keep a copy of the folder until everyone has updated".
Fix: remove the height and overflow; let the box size to its content. Also removed the trailing paragraph margin inside the box, added a left rule so the note reads as a note without relying on a faint grey fill, and bolded the first sentence (markup change) so the warning itself is the first thing the eye lands on. `role="note"` added.

**2. The lead paragraph is forced to 1100 px (`.lead { width: 1100px; max-width: none }`).**
This overrides the container and produces 114 to 117 characters per line, and the page scrolls sideways by 749 px on a 375 px phone and by 102 px on a 1280 px laptop. At 200% zoom it overflows by 484 px.
Fix: delete both declarations; the lead now inherits the text column. Because the measure is in `ch`, the larger lead naturally gets slightly fewer characters per line (about 50), which suits a larger size.

**3. Title lines overprint (`body { line-height: 22px }` inherited by `h1`).**
A fixed pixel line height is inherited by everything. At 1280 px the 76.8 px title gets 22 px lines, so "4.2" wraps on top of "Release notes" (see `scratch/page-1280.png`). The 22 px H2 is also set solid (1.0).
Fix: every line height is now unitless and set per role: body 1.6, lead and metadata 1.5, table 1.4, H2 1.25, H1 1.15.

### Serious

**4. Body text is 15 px in fixed pixels.**
Below the 16 px floor for reading, and `px` ignores the reader's browser font-size preference. Verdana's large x-height helps, but 15 px is still small for a page of continuous prose.
Fix: body at `1rem` (16 px default, and it follows the user's setting). All sizes are now in `rem` on a small scale (14 / 16 / 18 to 20 / 24 / 32 to 44).

**5. Line length is too long (`max-width: 75ch` with Verdana).**
`ch` is the width of the zero, and Verdana's zero is wide relative to its average letter, so 75ch produced 86 to 93 characters per line, well past the 75 limit where the eye starts losing the return sweep.
Fix: 54ch, which measures 60 to 70 characters per line in body text at 768 px and up. The comment in the stylesheet explains the number so nobody "corrects" it back to a round 65 or 75.

**6. Title size is pure viewport units (`h1 { font-size: 6vw }`).**
Unbounded: 19 px at 320 (smaller than the 18 px lead and the 22 px H2, so the hierarchy inverts on phones), 115 px at 1920. Pure `vw` text also does not grow with browser zoom: at 200% zoom it renders at exactly the same physical size, which fails the resize-text requirement for low-vision users.
Fix: `clamp(2rem, 1.25rem + 2.5vw, 2.75rem)`, 32 px on phones to 44 px on desktop. The rem bounds respond to zoom and the max is well under 2.5x the min, so 200% is always reachable.

**7. Metadata line is too faint and too small (`#8a8a8a`, 13 px).**
Contrast is 3.45:1 on white, below the 4.5:1 needed for normal-size text, and 13 px Verdana at that grey is hard to read.
Fix: `#595959` (7.0:1) at `0.875rem` (14 px). It stays clearly secondary through size and colour without becoming illegible.

**8. The table forces the whole page sideways (`white-space: nowrap` on headers and cells).**
Unwrappable headers made the table 890 px wide; on a phone the entire page scrolled, taking the prose with it.
Fix (markup + CSS): the table sits in a scroll container (`role="region"`, labelled by the caption, `tabindex="0"` so keyboard users can scroll it, visible focus ring). Headers may wrap; cells keep `nowrap` so "12 seconds" never splits. Only the table scrolls on small screens and the caption stays pinned in view while it does.

### Moderate

**9. Justified text without hyphenation (`p { text-align: justify }`).**
On a narrow column with no hyphenation, justification stretches word gaps unevenly and opens rivers; at 320 px with about 34 characters per line it is especially visible. It also applied to the small metadata line.
Fix: ragged right (`text-align: start`), plus `text-wrap: pretty` to avoid one-word last lines where supported.

**10. Hierarchy between levels was unreliable.**
On phones the title (19 to 22 px) was the same size as or smaller than the H2 (22 px). The H2 spacing (32 px above, 8 px below) was in the right proportion but fixed in pixels.
Fix: a consistent ratio (body 16, H2 24, H1 32 to 44), heading margins with more space above than below so each heading binds to its section, `text-wrap: balance` on headings, and slight negative tracking on the large bold Verdana title, which is loosely spaced at display sizes.

**11. Numbers in the table were hard to compare.**
Left-aligned figures of different lengths ("4.8 MB" vs "220 MB") do not line up by magnitude.
Fix: numeric columns right-aligned (headers too), `font-variant-numeric: tabular-nums lining-nums`, a heavier rule under the header row. The table may extend wider than the prose column (up to 44rem, centred on it), so header labels need two lines instead of three; tables are scanned, not read, so the prose measure does not apply to them. A `<caption>` and `scope="col"` were added (markup).

### Minor

**12. Thin fallback stack (`Verdana, sans-serif`).** Verdana is missing on most Linux and Android systems, where the generic sans has very different widths, so the tuned measure would drift. Fix: `Verdana, "DejaVu Sans", "Bitstream Vera Sans", Geneva, Tahoma, sans-serif`; DejaVu and Vera are close in width and x-height, Tahoma is Verdana's narrower sibling.

**13. Mobile text inflation.** Added `text-size-adjust: 100%` so iOS does not enlarge text unpredictably on rotation.

**Kept as is:** Verdana itself. It is a sturdy screen face with a large x-height, open apertures and distinct `Il1` forms, it costs nothing to load (no web font payload, no flash of invisible text), and a release-notes page does not need a second face. Body colour `#222` on white is fine.

## Markup changes (`page.fixed.html`)

The stylesheet alone could not fix the table overflow or give it an accessible name, so a corrected copy of the markup was saved. Changes, nothing else touched:

1. Links `page.fixed.css`.
2. Callout: `role="note"`, first sentence wrapped in `<strong>`.
3. Table wrapped in `<div class="table-scroll" role="region" aria-labelledby="export-table-caption" tabindex="0">`.
4. Added `<caption id="export-table-caption">Export size and time by format, before and after 4.2</caption>`.
5. Header cells get `scope="col"`.

## Measurements after the fix

| Width | Page overflow | Body size / line height | H1 | Body chars per line (avg / max) | Callout clipped | Table |
|---|---|---|---|---|---|---|
| 320 | 0 | 16 / 25.6 px | 32 px, 2 lines, no overlap | 34 / 37 | 0 | scrolls in its box |
| 375 | 0 | 16 / 25.6 px | 32 px | 40 / 43 | 0 | scrolls in its box |
| 768 | 0 | 16 / 25.6 px | 39 px | 65 / 70 | 0 | fits, 2-line headers |
| 1280 | 0 | 16 / 25.6 px | 44 px | 65 / 70 | 0 | fits, 2-line headers |
| 1920 | 0 | 16 / 25.6 px | 44 px (capped) | 65 / 70 | 0 | fits |
| 1280 at 200% | 0 | 16 / 25.6 px | 36 px CSS (72 px physical) | 65 / 70 | 0 | fits |

Phone line lengths (34 to 43) sit below the ideal range because the screen is narrow; that is expected and the type stays at 16 px rather than shrinking to fit more.

## Checklist score

| Check | Original | Fixed |
|---|---|---|
| Body text 16 px or larger | fail (15 px) | pass (1rem) |
| Line length under 75 characters | fail (86 to 93) | pass (60 to 70) |
| Body line height 1.4 or more, no collisions | fail (1.47 body, but fixed px collides in H1, H2 at 1.0) | pass |
| Clear contrast between type levels | fail (H1 <= H2 on phones) | pass |
| Tested at real use sizes | fail (breaks at every width) | pass (6 viewports measured) |
| Font payload under 200 KB | pass (system font) | pass |
| Fallback fonts specified | pass (generic only) | pass (metric-close stack) |
| Works at 200% zoom | fail (484 px overflow, vw title does not scale) | pass |
| Headings free of orphaned words | fail | pass (`text-wrap: balance`; Chromium, Safari, Firefox) |
| Links visually distinct | n/a (no links) | n/a |

Original **3 / 10** (counting the n/a row as a pass), fixed **10 / 10**. One caveat: `text-wrap: pretty` on paragraphs is a progressive enhancement and is ignored by browsers without support, with no harm.
