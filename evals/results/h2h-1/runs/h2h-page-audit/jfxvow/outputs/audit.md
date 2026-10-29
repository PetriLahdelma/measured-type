# Typography audit: Release notes 4.2

Files audited: `page.html` + `page.css`.
Fix: `page.fixed.css` (all type changes) and `page.fixed.html` (small markup changes for the table and the callout, links `page.fixed.css`). `page.html` and `page.css` are unchanged.

Method: rendered both versions in Chromium (Playwright) at 320, 375, 768, 1280 and 1920 px wide and read computed styles, line counts, characters per line, element boxes and document scroll width. Script: `measure.js`; screenshots: `shot-*.png`.

## Measured before / after

| Check | Before | After |
|---|---|---|
| Page scroll width at 320 px | 1124 px (horizontal scroll) | 320 px |
| Page scroll width at 1280 px | 1382 px | 1280 px |
| h1 size at 320 / 1280 / 1920 px | 19.2 / 76.8 / 115.2 px | 28 / 44 / 44 px |
| h1 line-height at 1280 px | 22 px for 76.8 px type (lines overlap) | 50.6 px (1.15) |
| h2 line-height | 22 px for 22 px type (1.0) | 27.5 px (1.25) |
| Lead line-height | 22 px for 18 px type (1.22) | 1.45 |
| Lead width | 1100 px fixed, ~80 chars/line, past the viewport | follows the column, ~60 chars/line |
| Body chars per line (desktop) | ~82 | ~66 |
| Callout | 99 px box, 106 to 194 px of text: clipped at every width | grows with content, never clipped |
| Meta text contrast | #8a8a8a on white, 3.4:1 at 13 px | #595959, 7.0:1 at 14 px |
| Table at 375 px | 890 px wide, pushes the whole page sideways | scrolls inside its own region; page stays 375 px |

## Findings and fixes, by severity

### Critical

1. **Fixed 22px line-height inherited by everything.** `body { line-height: 22px }` is a computed length, so every child inherits 22px regardless of its own size. The h1 at 76.8px wraps onto two lines at 1280px with 22px of leading, so "Release notes" and "4.2" are drawn on top of each other (see `shot-page-1280.png`). h2 gets 1.0 leading and the lead paragraph 1.22.
   Fix: unitless `line-height: 1.5` on body, and per-role values: h1 1.15, h2 1.25, lead 1.45, table headers 1.3.

2. **Warning callout is clipped.** `.callout { height: 5em; overflow: hidden }` cuts off the migration warning, the most important sentence on the page. Even at desktop width the paragraph overflows (106px of content in 99px); on a phone almost half the text is hidden.
   Fix: remove the fixed height and overflow; let the box size to its content, and remove the trailing paragraph margin inside it.

3. **Lead paragraph is 1100px wide.** `width: 1100px; max-width: none` breaks it out of the 75ch column, giving ~80 characters per line at 18px and a horizontal scroll on every viewport below ~1150px.
   Fix: delete the width override so the lead follows the column.

### High

4. **Unbounded viewport-unit h1.** `font-size: 6vw` gives 19.2px at 320px (smaller than the 22px h2, so the hierarchy inverts on phones) and 115px at 1920px. A pure vw size also ignores the reader's font-size preference and text-only zoom.
   Fix: `clamp(1.75rem, 1.25rem + 2.5vw, 2.75rem)`: 28px minimum, 44px maximum, with a rem term so it scales with user settings. Light negative tracking (-0.01em) for the bold display size, and balanced wrapping on headings.

5. **Table overflows and its numbers are hard to compare.** `white-space: nowrap` on every cell, including the long column headers, makes the table 890px wide, wider than the text column at every size and the reason the page scrolls sideways on phones. Numeric columns are left-aligned, so magnitudes do not line up.
   Fix (CSS): headers may wrap (balanced, bottom-aligned); values stay unbroken; numeric columns are right-aligned with tabular lining figures; cells sit on a common baseline; outer cell padding removed so the table edges match the text column.
   Fix (markup, `page.fixed.html`): the table sits in a `.table-wrap` scroll container (`role="region"`, labelled, `tabindex="0"` so keyboard users can scroll it) so only the table scrolls on narrow screens. A visible title labels the table; it is outside the scroller so it is never cut off. Header cells get `scope="col"`, the first cell of each row becomes `<th scope="row">` (styled at normal weight), and the space inside values such as "4.8 MB" is a non-breaking space.

6. **Justified text without hyphenation.** `p { text-align: justify }` at 33 to 41 characters per line on phones produces wide, uneven word gaps and rivers, and it also hit the small meta line and the callout.
   Fix: `text-align: left`, plus `text-wrap: pretty` to avoid one-word last lines where supported.

7. **Low-contrast, undersized meta line.** #8a8a8a on white is 3.4:1, below the 4.5:1 needed for text this size, and 13px Verdana is the smallest text on the page.
   Fix: #595959 (7.0:1) at 0.875rem.

### Medium

8. **Pixel font sizes everywhere.** Body 15px, h2 22px, lead 18px and meta 13px ignore the reader's browser default font size.
   Fix: rem throughout (0.9375rem body keeps the same 15px rendering at the default setting; Verdana's large x-height makes that a comfortable reading size).

9. **Line length too long.** `max-width: 75ch` in Verdana measures about 82 characters per line because Verdana's average lowercase is wider than its zero.
   Fix: 62ch, which measures about 66 characters per line at desktop widths.

10. **Single-font fallback.** `Verdana, sans-serif` drops straight to the platform sans on systems without Verdana (most Linux and Android), changing width and wrapping a lot.
    Fix: `Verdana, "DejaVu Sans", "Bitstream Vera Sans", Geneva, sans-serif`; DejaVu Sans / Vera share Verdana's proportions closely.

### Low

11. **Callout reads as body copy.** Only a pale grey fill separates it. Added a 4px left rule and `role="note"` on the container so the warning is set apart visually and for assistive tech.
12. **Heading spacing.** Space above headings is now clearly larger than below (h2 2.25rem / 0.5rem) so each heading belongs to the text that follows it.
13. **Mobile text inflation.** Added `text-size-adjust: 100%` so iOS does not enlarge text unpredictably in landscape.

## Not changed

- Copy and section order are untouched, apart from the new table title, which labels the existing data.
- Body colour #222 on white (15.9:1) and the overall Verdana voice are kept.
- The lead says "Read the migration section" but the page has no section with that name. That is a content issue for the authors, not something to fix in the stylesheet.
