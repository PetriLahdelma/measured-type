# Typography audit: Release notes 4.2

Files: `page.html` + `page.css` (original), `page.fixed.html` + `page.fixed.css` (corrected).

Every number below was measured in Chromium (Playwright) at 320, 375, 768, 1280 and 1920 px wide with `measure.js`, which counts real rendered characters per line. Screenshots: `shot-page-1280.png` (before), `shot-page.fixed-1280.png` and `shot-page.fixed-375.png` (after), `table-375.png` and `table-1280.png`.

## Summary

The page is a short reference document whose job is to get one warning (older clients cannot open converted projects) in front of every reader. The original stylesheet does the opposite: it clips that warning, overlaps the title, overflows the lead paragraph off screen and sets body text at more than 90 characters per line. Nine problems, three of them severe enough to hide or garble content.

| # | Problem | Severity | Measured before | After |
|---|---------|----------|-----------------|-------|
| 1 | Callout has a fixed height and `overflow: hidden` | Critical | Warning text clipped at every width; at 375 px only 75 of 132 px of text visible | Box grows with its text; nothing clipped at any width |
| 2 | `h1` sized `6vw` with the body's fixed `22px` line-height | Critical | 76.8 px type on 22 px lines at 1280 px: "4.2" prints on top of "Release" | `clamp()` in rem, unitless 1.2 line-height; 28 to 44 px, one clean line |
| 3 | `.lead` is `width: 1100px; max-width: none` | Critical | Page scrolls sideways at every width below 1920 px (1124 px document at 375 px); 113 characters per line | Inherits the column; 54 to 57 characters per line on desktop |
| 4 | Body measure of `75ch` in Verdana | High | 91 to 92 characters per line from 768 px up | `56ch`: 68 average, 70 max |
| 5 | Fixed `22px` line-height everywhere | High | Lead at 18 px gets 1.22 leading; h2 at 22 px gets 1.0 | Unitless: body 1.6, lead 1.5, headings 1.2 |
| 6 | Meta line `#8a8a8a` on white at 13 px | High | 3.45:1, fails the 4.5:1 minimum for small text | `#595959`, 7.0:1 |
| 7 | All paragraphs `text-align: justify`, no hyphenation | Medium | Visible rivers and stretched word gaps, worst on 280 to 335 px columns | Ragged right (`text-align: start`) with `text-wrap: pretty` |
| 8 | Table: `white-space: nowrap` on every cell, units repeated in cells, numbers left aligned | Medium | 890 px wide table in a 327 px column (and still wider than the 763 px column at desktop) | Units moved to grouped headers, numbers right aligned in tabular figures; 335 px wide at 375 px; scroll container below that |
| 9 | Pixel font sizes and an arbitrary scale | Medium | 13 / 15 / 18 / 22 px plus `6vw`; ignores the reader's browser text size; at 375 px the h1 (22.5 px) was the same size as h2 (22 px) | rem scale 13 / 15 / 18 / 22 / 28 to 44 px at default settings; follows user text size |

## Findings in detail

### 1. The warning is cut off (critical)
`.callout { height: 5em; overflow: hidden; }` gives the box 75 px of content height. The callout paragraph needs 66 px at desktop (plus its 16 px bottom margin, which is clipped) and 132 to 154 px on phones. On a phone the reader sees the first three lines of the most important sentence on the page and the instruction to keep a copy of the folder disappears. There is no visual hint that anything is missing.

Fix: remove the height and overflow, use padding in rem, zero the last child's margin so inner spacing is even and add a 4 px start-edge bar so the box reads as a note rather than a grey slab. The markup gains `role="note"` so assistive tech announces it as an aside.

### 2. The title collides with itself (critical)
`h1 { font-size: 6vw }` inherits `line-height: 22px` from `body`. At 1280 px the h1 is 76.8 px on 22 px lines, so the second line ("4.2") is drawn over the first. At 1920 px it is 115 px. At 375 px it is 22.5 px, effectively the same as the 22 px h2, so the hierarchy collapses on phones. Pure viewport units also do not grow when the reader zooms text, which fails resize-text expectations.

Fix: `clamp(1.75rem, 1.25rem + 2.2vw, 2.75rem)`. The rem terms keep it zoomable, the clamp keeps it between 28 and 44 px and a unitless `line-height: 1.2` scales with it. `text-wrap: balance` and a small negative tracking (-0.01em) suit Verdana Bold at display size.

### 3. The lead runs off the page (critical)
`.lead { width: 1100px; max-width: none; }` breaks out of the column. Every viewport narrower than about 1400 px gets a horizontal scrollbar, the lead's right edge is off screen on phones and tablets. On a wide screen its 113-character lines are the hardest text on the page to read even though it is the paragraph meant to be read first.

Fix: delete both declarations. The lead now shares the column and, being 18 px, sets at 54 to 57 characters per line.

### 4. Lines are too long (high)
`max-width: 75ch` sounds right but `ch` is the width of the zero; Verdana's running text averages about 1.23 characters per `ch`. Result: 91 to 92 characters per line. Comfortable reading for a sans at this size is roughly 60 to 75.

Fix: `max-width: 56ch`, measured at 68 characters average and 70 maximum for body text. Side padding became 1.25rem so phones keep a usable 335 px column at 375 px.

### 5. Fixed leading (high)
A single `line-height: 22px` on `body` is inherited as an absolute value by everything. The 15 px body gets 1.47, which is tight for Verdana's large x-height; the 18 px lead gets 1.22; the 22 px h2 gets 1.0; the h1 gets less than 0.3.

Fix: unitless values set per role: body 1.6, lead and meta 1.5, table 1.4, headings 1.2.

### 6. Low-contrast meta line (high)
`#8a8a8a` on `#fff` is 3.45:1 at 13 px. Small text needs at least 4.5:1.

Fix: `#595959` (7.0:1), used for the table caption too. Size stays one step below body so the line still reads as secondary.

### 7. Justified text without hyphenation (medium)
On columns of 280 to 335 px a justified paragraph can only stretch word spaces, which opens rivers and makes the meta line visibly gappy even on desktop. Justification also gives no benefit on a page this short.

Fix: `text-align: start` with `text-wrap: pretty` to avoid one-word last lines.

### 8. The comparison table (medium, markup changed)
Every cell was `nowrap`, every value repeated its unit ("4.8 MB", "12 seconds") and the long headers ("Average size before") forced five wide columns. The table measured 890 px: wider than the desktop column and nearly three times the phone column, with no scroll container, so it widened the whole page. Numbers were left aligned in proportional spacing, so magnitudes could not be compared down a column.

Fix (this is why `page.fixed.html` exists):
- Two-level header: "Size (MB)" and "Export time (s)" each span a Before and After column. Units live in the header once; cells hold bare numbers.
- A `<caption>` names the table ("Average export size and time, before and after 4.2") so the word "Average" is not lost from the old headers.
- Row labels are `<th scope="row">`, group headers use `scope="colgroup"`.
- Numbers right aligned with `font-variant-numeric: tabular-nums lining-nums`; headers over number columns right aligned to match.
- Table text at 14 px (one notch under body), tighter cell padding, outer cell padding removed so the table aligns with the text edge.
- A 2 px rule under the header and 1 px rules between rows replace uniform hairlines, so the header is distinguished by weight rather than by colour.
- Non-breaking spaces keep each unit attached to its word so "(s)" never wraps alone.
- A focusable `role="region"` wrapper with `overflow-x: auto` and a visible focus ring. The table now fits at 375 px (335 px wide); below that, at 320 px, only the table scrolls instead of the page.

### 9. Pixel sizes and scale (medium)
All sizes were in px, so a reader who sets a larger default text size gets nothing. The scale had no relationship between steps and, because of `6vw`, the h1 dropped to h2 size on phones.

Fix: custom properties for a five-step scale in rem: 0.8125 / 0.9375 / 1.125 / 1.375rem and the clamped h1. At default settings these are the original 13 / 15 / 18 / 22 px, so the page keeps its intended density while honouring user settings. `text-size-adjust: 100%` stops iOS from inflating text in landscape.

## Spacing and hierarchy

- Headings have more space above than below (h2: 2.5rem above, 0.5rem below) so each heading binds to the section it introduces. The original 32 px above and 8 px below was close; the fix keeps the intent and moves it to rem.
- The meta line drops its bottom margin so the gap before the first h2 is set by the heading's top margin alone.
- Callout and table each get 1.5rem of breathing room, larger than paragraph spacing, so they read as separate objects.

## What was kept on purpose

- **Verdana.** It is a deliberate screen face with a large x-height, open apertures and clear figures, which suits a technical document read on screen. Its problems here came from measure and leading, not from the face. The fallback stack now names similar wide, large x-height sans faces (DejaVu Sans, Bitstream Vera Sans, Geneva) before the generic family, so readers without Verdana get close proportions and the `ch`-based measure stays close to its target.
- **One family.** Hierarchy comes from size and weight only. A second face would add noise to a page this short.
- **Colours** apart from the meta grey are unchanged.
- **Copy** is unchanged, except that units moved from table cells into headers.

## Verification (after)

| Width | Page scroll width | h1 | Body chars/line (avg) | Callout clipped | Table width / column |
|-------|-------------------|----|-----------------------|-----------------|----------------------|
| 320 | 320 (no overflow) | 28 px | 34 | No | 304 / 280, scrolls in its own region |
| 375 | 375 | 28.3 px | 40 | No | 335 / 335 |
| 768 | 768 | 36.9 px | 68 | No | 534 / 534 |
| 1280 | 1280 | 44 px | 68 | No | 534 / 534 |
| 1920 | 1920 | 44 px | 68 | No | 534 / 534 |

Before, the same table read: page width 1124 to 1382 px at every viewport under 1920, callout clipped at every width, body 91 characters per line on desktop, h1 overlapping itself from 768 px up.

To re-run: `NODE_PATH=<playwright node_modules> node measure.js page.fixed.html`.
