# Typography audit: Release notes 4.2

Files: `page.html` + `page.css` (original), `page.fixed.html` + `page.fixed.css` (corrected).

All numbers below were measured in Chromium (Playwright) with `measure.js`, which counts real characters per rendered line and checks overflow and clipping. Screenshots: `shot-page-*.png` (before) and `shot-page.fixed-*.png` (after) at 320 and 1280 px.

## Verdict

**Before: 3/10. After: 10/10** on a ten-point readability checklist (body size, measure, leading, level contrast, tested at real widths, font payload, fallbacks, 200% zoom, heading breaks, link distinction).

| Check | Before | After |
|---|---|---|
| Body text 16 px or larger | Fail: 15 px, fixed in px | Pass: 1rem (16 px), follows the reader's default size |
| Line length under 75 characters | Fail: body 92, lead 114 | Pass: body 63, lead 48 to 57 |
| Body leading 1.4 or more | Fail: lead 1.22, h2 1.0, h1 0.29 (lines overlap) | Pass: body 1.6, lead 1.5, headings 1.2 |
| Clear contrast between levels | Fail: h1 is smaller than h2 at 320 px (19 vs 22 px), 115 px at 1920 px | Pass: h1 30 to 44, h2 22 to 28, lead 18 to 20, body 16, meta 14 |
| Works at real widths | Fail: horizontal scroll at 320, 768 and 1280 px; callout clipped | Pass: no page overflow at any width tested |
| Font payload under 200 KB | Pass: system font, 0 KB | Pass: unchanged |
| Fallbacks set | Pass (weak): `Verdana, sans-serif` | Pass: metric-compatible fallbacks added |
| Survives 200% zoom | Fail: h1 ignores zoom, lead and table overflow, callout clips | Pass |
| Headings break cleanly | Fail: h1 wraps into itself at 1280 px | Pass: balanced wrapping |
| Links distinct | Not applicable (no links) | Not applicable |

## Findings, worst first

### 1. The warning callout hides its own text (critical)
`.callout { height: 5em; overflow: hidden; }` fixes the box to 75 px. The only migration warning on the page is cut off: 7 px clipped on desktop, **95 px clipped at 320 px** (more than half the message, including "keep a copy of the folder until everyone has updated"). Any zoom or larger default font makes it worse. The box is also marked only by a #f3f3f3 tint, which is 1.11:1 against white and nearly invisible.

**Fix:** remove `height` and `overflow`; let the box grow with its content. Zero the last child's bottom margin so padding stays even. Add a 4 px dark inline-start rule so the note is visible without relying on a faint tint. In the markup, the callout gets `role="note"`.

### 2. The lead paragraph is 1100 px wide (critical)
`.lead { width: 1100px; max-width: none; }` breaks out of the column. It caused horizontal scrolling of 804 px at 320 px wide and 102 px even at 1280 px, ran to **114 characters a line** and, being justified, spread its words unevenly.

**Fix:** delete the width override so the lead inherits the column measure. At 18 to 20 px it now sets 48 to 57 characters a line, a comfortable shorter measure for intro text.

### 3. The h1 is sized in raw viewport units with a fixed 22 px line height (critical)
`h1 { font-size: 6vw; }` plus the inherited `line-height: 22px`:
- 320 px: 19.2 px, **smaller than the h2** (22 px), so the hierarchy inverts on phones.
- 1280 px: 76.8 px on a 22 px line, leading 0.29. The title wraps and "4.2" prints on top of "Release" (see `shot-page-1280.png`).
- 1920 px: 115 px.
- Browser zoom does not enlarge `vw` text, so the title fails text-resize expectations.

**Fix:** `clamp(1.875rem, 1.45rem + 1.8vw, 2.75rem)` (30 to 44 px), unitless `line-height: 1.2`, `text-wrap: balance`. The rem floor and ceiling respond to zoom and to the user's default font size.

### 4. Line height is a fixed pixel value inherited by everything
`body { line-height: 22px; }` is passed down as an absolute length, so every larger element is cramped: lead 1.22, h2 1.0, h1 0.29. **Fix:** unitless values per role: body 1.6 (Verdana is wide with a tall x-height and needs the extra air), lead 1.5, headings 1.2, table and meta 1.4 to 1.5.

### 5. Measure is set in `ch`, which overshoots badly in Verdana
`max-width: 75ch` looks like 75 characters but `ch` is the width of the zero, which in Verdana is narrower than an average letter plus word space. Measured result: **92 characters a line** for body text. **Fix:** `max-width: 34em` on the column, which measures 63 to 65 characters a line at every viewport, at 200% zoom and at a 32 px default font size (the column scales with the text, so the count holds).

### 6. Body text is 15 px, fixed in pixels
Below the 16 px floor, and `px` ignores the reader's browser font setting. All sizes were in px. **Fix:** every size moved to rem on one scale: meta 0.875rem, body 1rem, lead 1.125 to 1.25rem, h2 1.375 to 1.75rem, h1 1.875 to 2.75rem. Verified: with a 32 px default font the whole page scales and still has no horizontal scroll.

### 7. Justified text without hyphenation
`p { text-align: justify; }` on a narrow column with long words produces uneven word gaps and rivers, worst at 320 px (34 characters a line) and in the 13 px meta line. **Fix:** `text-align: start` with `text-wrap: pretty` to avoid one-word last lines where supported.

### 8. Meta line is too small and too faint
13 px in #8a8a8a: contrast 3.45:1, below the 4.5:1 needed for normal text. **Fix:** 0.875rem (14 px) in #595959 (7.0:1). It stays visibly secondary through size and tone, not by being hard to read.

### 9. The table forces the page sideways and reads poorly
`white-space: nowrap` on every cell with five long headers ("Average size before" and so on) made the table 890 px wide, wider than the column at every viewport and 570 px wider than a phone. Numbers were left-aligned, so digits did not line up, and the header row looked like another data row.

**Fix (CSS and markup):**
- Wrap the table in a scroll box (`.table-scroll`, `overflow-x: auto`, keyboard-focusable with a visible focus ring, `role="region"` with an accessible name). Only the table scrolls on small screens; the page never does.
- Regroup the header into two rows: "Average size" and "Export time" spanning "Before / After". This removes the repeated words, so the table drops from 890 px to 513 px and fits the column on desktop and tablet with no wrapped headers.
- Right-align numeric columns, `font-variant-numeric: tabular-nums lining-nums`, non-breaking spaces between value and unit (replacing blanket `nowrap`).
- Row labels become `<th scope="row">` in regular weight; a 2 px rule under the header separates it from data; the group rules stop short of the gutter so the two groups read apart.
- A visible title, "Export size and time, before and after 4.2", sits above the scroll box (outside it, so it never scrolls out of view) and names both the region and the table.

### 10. Heading spacing and smaller items
- h1 and h2 shared `margin: 32px 0 8px` in px. Now em-based: h2 `1.75em 0 0.5em` keeps more space above than below so each heading binds to its section; h1 sits at the top of padded content.
- `.content` had side padding only, so the h1 margin did all the top spacing and the table touched the page bottom. Now fluid padding on all sides.
- Font stack extended to `Verdana, Geneva, "DejaVu Sans", "Bitstream Vera Sans", sans-serif`. Without Verdana (most Linux and Android), the old stack fell to a generic sans with much narrower letters, which would change the measure. DejaVu Sans and Bitstream Vera share Verdana's wide proportions.
- `overflow-wrap: break-word` on body and `text-size-adjust: 100%` to stop iOS from inflating text in landscape.

## Kept on purpose
- **Verdana.** A system face with zero download cost, a tall x-height and clearly distinct letterforms. It suits utility content like release notes. The fix is to set it properly (generous leading, measure tuned to its width), not to replace it.
- **Colors** #222 on white for text (15.9:1) and the #f3f3f3 callout surface.

## Markup changes (`page.fixed.html`)
Only what the CSS could not do on its own:
1. Stylesheet link points to `page.fixed.css`.
2. Callout `div` gains `role="note"`.
3. Table wrapped in a labelled, focusable scroll region, with a title paragraph above it.
4. Header restructured into two rows with `scope="colgroup"` and `scope="col"`; first cell of each body row is a `<th scope="row">`; non-breaking spaces between values and units.

No copy was changed. One content issue to raise with the author: the lead says "Read the migration section", but the page has no section with that name. The callout under Storage is the closest match; either add a "Migration" heading or link the phrase to the callout.

## Measurements after the fix

| Viewport | Page h-scroll | h1 | h2 | Lead | Body chars/line | Callout clipped |
|---|---|---|---|---|---|---|
| 320 px | 0 | 30 px / 1.2 | 22 px | 18 px | 34 (column-limited) | 0 |
| 768 px | 0 | 37 px | 24.6 px | 19.1 px | 63 | 0 |
| 1280 px | 0 | 44 px | 27.7 px | 20 px | 63 | 0 |
| 1920 px | 0 | 44 px | 28 px | 20 px | 63 | 0 |
| 1280 px at 200% zoom | 0 | 34.7 px | 23.8 px | 18.7 px | 63 | 0 |
| 1280 px, 32 px default font | 0 | 69.4 px | 47.7 px | 37.4 px | 63 | 0 |
