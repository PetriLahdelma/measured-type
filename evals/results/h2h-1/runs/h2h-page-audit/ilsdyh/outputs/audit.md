# Typography audit: Release notes 4.2

Files audited: `page.html` with `page.css`.
Deliverables: `page.fixed.css` (corrected stylesheet) and `page.fixed.html` (corrected markup, links `page.fixed.css`). `page.html` and `page.css` are unchanged.

## How this was checked

The page was rendered in headless Chromium at 320, 390, 768, 1280 and 1920 px wide. For each width the script recorded document scroll width, computed font sizes and line heights, characters per rendered line (counted glyph by glyph from layout rects), whether the callout's content overflows its box, and the table's width. Before and after screenshots were taken at 1280 and 320. The measuring scripts and screenshots are in `scratch/`.

## Findings, worst first

### 1. The warning callout is cut off (critical)

`.callout { height: 5em; overflow: hidden; }` fixes the box at 5em while the text needs more. Measured content height against box height:

| Width | Box | Content | Result |
|---|---|---|---|
| 320 | 99 px | 194 px | half the warning hidden |
| 390 | 99 px | 172 px | last two lines hidden |
| 768 and up | 99 px | 106 px | bottom of last line clipped |

This is the one paragraph that tells people how to avoid breaking a shared workspace, and on a phone the instruction "or keep a copy of the folder until everyone has updated" disappears entirely. A text container should never have a fixed height.

**Fix:** removed `height` and `overflow`; the box now grows with its text at every width. The paragraph's bottom margin inside the box is zeroed so the padding is even, a 4px rule on the left edge separates the box from the page (the #f3f3f3 tint alone is barely distinguishable from white), and the markup marks it `role="note"`.

### 2. Headline lines collide, and the headline size has no limits (critical)

`h1 { font-size: 6vw; }` with no line height of its own inherits the body's fixed `line-height: 22px`.

- At 1280 px the headline is 76.8 px on 22 px leading. It wraps to two lines and "4.2" is drawn on top of "Release" (see `scratch/page-1280.png`).
- At 1920 px it is 115 px, a poster size for a document title.
- At 320 px it is 19.2 px, smaller than the 22 px `h2`, so the hierarchy inverts on phones.
- A pure viewport unit ignores the reader's default font size, and browser zoom barely enlarges it, which works against resizing text to 200%.

**Fix:** `font-size: clamp(1.75rem, 1.25rem + 1.6vw, 2.5rem)`, giving 28 px on phones and 40 px at most, always larger than `h2`. The rem term keeps it responsive to zoom and user settings. Headings get unitless line heights (1.15 for `h1`, 1.25 for `h2`) and `text-wrap: balance`, so a two-line headline at 320 px breaks evenly. A slight negative tracking (-0.01em) tightens Verdana, which is spaced for small sizes, at display size.

### 3. The lead paragraph is 1100 px wide and pushes the page sideways (critical)

`.lead { width: 1100px; max-width: none; }` breaks out of the 75ch column.

- Document scroll width was 1124 px on a 320 px phone and 1382 px on a 1280 px laptop: a horizontal scrollbar on every width below 1920.
- On desktop the lead ran up to 117 characters a line (avg 80), far beyond a comfortable measure, and its left edge aligned with the column while its right edge did not.
- 18 px text on the inherited 22 px leading is a 1.22 ratio, cramped for a multi-line paragraph.

**Fix:** removed the width override so the lead sits in the text column; set `font-size: 1.125rem; line-height: 1.5`. Scroll width now equals the viewport at every tested width.

### 4. Running text is too long a line on desktop

`.content { max-width: 75ch; }` measured 82 characters a line on average, 93 at most. Verdana's "0" is wider than its average character, so 75ch of Verdana holds far more than 75 characters.

**Fix:** `max-width: 60ch`. Measured body text is now 66 characters a line on average (78 at most) on desktop, inside the 45 to 75 range. The 18 px lead in the same column averages 48 to 62 per line.

### 5. Justified text with no hyphenation makes rivers

`p { text-align: justify; }` with no `hyphens` stretches word spaces. At 320 px (about 33 characters a line) the gaps are wide and uneven, and even at desktop widths the meta line and the callout show visible holes (see the "Older clients cannot open converted projects" line in the original screenshot).

**Fix:** `text-align: start`. Ragged right keeps word spacing even at every width and is the better default for screen text that reflows.

### 6. Secondary text fails contrast

`.meta { color: #8a8a8a; font-size: 13px; }` is 3.45:1 on white, below the 4.5:1 minimum for normal text, and 13 px Verdana is the smallest text on the page.

**Fix:** `color: #5f5f5f` (about 6.4:1) and `font-size: 0.875rem` (14 px). It still reads as secondary because of size and tone, not because it is hard to see.

### 7. Every size and leading is in fixed pixels

`body { font-size: 15px; line-height: 22px; }` and pixel sizes on every other rule ignore the reader's browser font-size preference. The fixed 22 px leading is also inherited by everything, which caused findings 2 and 3.

**Fix:** all sizes moved to rem (15 px becomes `0.9375rem` at the default root size), spacing to rem/em, and line height to unitless values (1.55 for body, which suits Verdana's wide set and tall x-height). `text-size-adjust: 100%` stops mobile Safari inflating text in landscape.

### 8. The table forces page overflow and its figures do not line up

- `white-space: nowrap` on every cell plus long headings ("Average size before") made the table 890 px wide, wider than the column at every width and wider than the viewport below about 900 px.
- All cells were left-aligned, so "4.8 MB" and "220 MB" did not line up on their digits.
- Five long column headings repeated "before" and "after" in every heading, which is what made the table so wide.
- The table had no title, and the row labels ("PDF") were plain data cells.

**Fix (markup and CSS):**
- Headings regrouped into two column groups, "Average size" and "Export time", each spanning "Before" and "After" (`scope="colgroup"` and `scope="col"`). Row labels are `th scope="row"`. Width drops from 890 px to 519 px, so it now fits the column on tablets and desktop.
- Figures and their headings are right-aligned with `font-variant-numeric: tabular-nums`, so units and digits stack. The group headings sit centred over their pair with a rule beneath to show the span.
- A title above the table names what it compares. It is a paragraph rather than a `<caption>` because a caption takes the table's width and was cut off inside the scroll box on phones; the table and its wrapper reference it with `aria-labelledby`.
- The table sits in a `div` with `overflow-x: auto`, `tabindex="0"` and a visible focus outline, so on a 320 px phone it scrolls inside its own box (and from the keyboard) instead of widening the page.

### 9. Smaller points

- Font stack was `Verdana, sans-serif`. On systems without Verdana that falls to a much narrower face with different metrics, changing every line length. Added DejaVu Sans and Bitstream Vera Sans, the closest relatives of Verdana, before the generic fallback.
- Heading spacing was the same 32 px above at both levels with 8 px below. Now 2.25rem above and 0.5rem below `h2`, so each heading is clearly attached to the section it introduces.
- The page had no bottom padding, so the table touched the bottom edge. Added 3rem.
- The publication date is now a `<time datetime="2026-10-29">` element.

## Result

| Check | Before | After |
|---|---|---|
| Horizontal page scroll at 320 px | 1124 px document | none |
| Horizontal page scroll at 1280 px | 1382 px document | none |
| Callout text hidden | at every width | none |
| `h1` size, 320 to 1920 px | 19 to 115 px, lines overlapping | 28 to 40 px, leading 1.15 |
| Body characters per line, desktop | avg 82, max 93 | avg 66, max 78 |
| Lead characters per line, desktop | avg 80, max 117 | avg 48, max 62 |
| Meta text contrast | 3.45:1 | 6.4:1 |
| Table width | 890 px | 519 px (scrolls in its own box below about 570 px) |

## Remaining note

On a 320 px phone the table still needs horizontal scrolling inside its box; five columns of figures with units do not fit in 272 px without abbreviating "seconds" to "s", which would be a content decision for the authors.
