# Typography audit: Release notes 4.2 (page.html + page.css)

Method: rendered both versions in headless Chromium (Playwright) at 320, 768 and 1440 px wide, read computed styles and counted characters per rendered line with DOM ranges. Numbers below are measured, not estimated. Verdana was the face actually used in the test environment.

Outputs: `page.fixed.css` (corrected stylesheet) and `page.fixed.html` (corrected markup, links `page.fixed.css`). The markup had to change for the table (see finding 8). `page.html` and `page.css` are untouched.

## Findings, by severity

### Critical

**1. The h1 overlaps itself and the lead paragraph on wide screens.**
`body { line-height: 22px }` is a fixed length, so every element inherits 22px whatever its own size. With `h1 { font-size: 6vw }` the heading is 86.4px at 1440 px, wraps to two lines and those lines sit 22px apart: "4.2" is drawn on top of "Release" and over the first line of the lead (box 44px tall, content 85px). h2 is also set solid (22px on 22px) and the 18px lead gets a cramped 1.22.
Fix: unitless line-heights (body 1.5, lead 1.45, h2 1.25, h1 1.15, table 1.4), so spacing follows each element's own size.

**2. The lead paragraph breaks the layout and the measure.**
`.lead { width: 1100px; max-width: none }` escapes the 75ch column. Result: horizontal page scroll at every tested width (document 1124px wide on a 320px phone, 1462px on a 1440px screen) and 111 to 117 characters per line, nearly double a comfortable measure. On a phone most of the lead is off screen.
Fix: removed the fixed width; the lead follows the column measure (48 to 51 characters per line at 18px).

**3. The warning callout is clipped.**
`.callout { height: 5em; overflow: hidden }` fixes the box at 99px. The text needs 194px at 320px wide, so the second half of the most important instruction on the page ("...or keep a copy of the folder until everyone has updated") is cut off with no indication. It also clips at 768 and above (106px needed) and gets worse with any text enlargement.
Fix: no fixed height, no overflow clipping; padding in rem; the last child's bottom margin removed so the box hugs its text.

### Major

**4. The h1 size is tied only to the viewport.**
`6vw` gives 19.2px at 320 px, smaller than the 22px h2, so the hierarchy inverts on phones; 86.4px at 1440 px is a poster, not a page title. Because vw ignores text size, browser zoom does not enlarge it either: at 200% zoom the CSS viewport halves, the h1 halves (76.8px to 38.4px) and the heading renders at the same physical size as before zooming.
Fix: `clamp(1.75rem, 1.25rem + 2.5vw, 2.5rem)`: 28px on a phone, 40px cap on desktop. The rem terms make it grow with zoom and with the reader's default text size (rendered 1.8x at 200% zoom).

**5. Body lines are too long.**
`.content { max-width: 75ch }` reads as a sensible measure, but ch is the width of the digit zero and Verdana's zero is wider than its average letter. 75ch produced 81 to 93 characters per line.
Fix: the prose measure is 31rem (about 52ch of 15px Verdana), measured at 58 to 66 characters per line. The column itself is 46rem so the table can use more width than the prose (finding 8).

**6. Justified text with no hyphenation.**
`p { text-align: justify }` on a narrow column with long words produced visibly stretched word gaps, worst on phones (24 to 37 characters per line) and in the narrow callout. The meta line at 1440 px was stretched across the full width.
Fix: `text-align: start` (ragged right), plus `text-wrap: pretty` on paragraphs and `text-wrap: balance` on headings as progressive enhancement against short last lines.

**7. The meta line fails contrast.**
`#8a8a8a` on white is 3.4:1, under the 4.5:1 required for body-size text, and at 13px it is also the smallest text on the page.
Fix: `#595959` (7:1) at 0.875rem (14px). It still reads as secondary through size and colour.

**8. The table forces horizontal page scroll and is hard to compare.**
`white-space: nowrap` on every cell makes the table 890px wide: wider than the 715px column at 768 px and nearly three phones wide at 320 px, with no way to contain it. Numbers are left aligned, so magnitudes cannot be compared down a column, and the row labels are plain `td`.
Fix (CSS): header text may wrap; figures and row labels stay on one line; numeric columns are right aligned with tabular lining figures; first and last cells lose their outer padding so the table edges line up with the text; a heavier rule under the header row.
Fix (markup, the reason `page.fixed.html` exists): the table sits in a `div.table-wrap` that scrolls on its own (`overflow-x: auto`), is a labelled region and is focusable so keyboard users can scroll it; a `caption` names the table; header cells have `scope`; row labels are `th scope="row"`; each value and unit is joined with a no-break space. Result: page scroll width equals the viewport at all three widths; the table scrolls inside its region on a phone (512px of table in a 288px region).

### Minor

**9. Every size is in px.** Body 15px, lead 18px, meta 13px and h2 22px ignore the reader's browser text size setting. With a 24px default set, the original page did not change at all; the fixed page scales every level (body 22.5px, lead 27px, h2 33px).
Fix: all sizes, margins and paddings converted to rem (same values at the 16px default).

**10. Single-platform font stack.** `Verdana, sans-serif` falls straight to the generic sans on most Android and Linux systems, where the metrics differ enough to change the measure.
Fix: `Verdana, "DejaVu Sans", "Bitstream Vera Sans", Geneva, sans-serif`, faces with similar wide proportions and a large x-height.

**11. Heading spacing.** Margins were px and identical above and below the page title. Fix: h2 gets 2.25rem above and 0.5rem below so each heading binds to the text it introduces; the h1 gets 0.75rem below to separate it from the larger lead.

**12. Small additions.** `text-size-adjust: 100%` stops iOS inflating text in landscape; `overflow-wrap: break-word` keeps long tokens from overflowing narrow screens; the callout is marked `role="note"`.

## Verification (fixed version)

| Check | 320 px | 768 px | 1440 px |
|---|---|---|---|
| Page scroll width | 320 (none) | 768 (none) | 1440 (none) |
| h1 size / line height | 28 / 32.2px | 39.2 / 45.1px | 40 / 46px |
| Body characters per line | 26 to 39 | 58 to 66 | 58 to 66 |
| Lead characters per line | 25 to 29 | 48 to 51 | 48 to 51 |
| Callout clipped | no (182px box, 182px content) | no | no |
| Meta contrast | 7:1 | 7:1 | 7:1 |

Body text at 320 px is limited by the screen, not by the stylesheet; 15px Verdana fits about 35 characters in 288px.

## Not changed

Copy, heading structure, colours other than the meta line, and the 15px body size (Verdana's large x-height makes 15px read like 16 to 17px in most faces). The caption text "Export size and time by format" is the one piece of new copy; it only restates the column headers.
