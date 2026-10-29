# Typography audit: page.html / page.css

Scope: `page.html` (Release notes 4.2) and `page.css`. Fixes are in `page.fixed.css`. The markup also needed changes (a scroll container for the table plus non-breaking spaces), so `page.fixed.html` is a corrected copy that links `page.fixed.css`. `page.html` and `page.css` are untouched.

## How this was checked

Rendered in headless Chromium (Playwright) with the real Verdana installed, at 320, 375, 640, 768, 1280 and 1440 px wide. The 640 px run stands in for a 1280 px window at 200% zoom. For every text block the script (`measure.js`) reads computed font size, line-height, weight and alignment, counts characters on each rendered line and checks page overflow and clipping. `shot.js` captures full-page screenshots (`shot-*.png`).

Measured before and after:

| Check | Original | Fixed |
| --- | --- | --- |
| Page width at 320 px viewport | 1124 px (horizontal scroll) | 320 px |
| Callout text clipped | Yes, at every width | No |
| Longest body line (characters) | 93 | 75 |
| Longest lead line (characters) | 117 | 60 |
| h1 size at 320 / 1440 px | 19.2 px / 86.4 px | 28 px / 40 px |
| h1 line-height ratio at 1440 px | 0.25 (two lines overlap) | 1.15 |
| h1 vs h2 at 320 px | 19.2 px h1 below 22 px h2 | 28 px over 22 px |
| h1 under 200% zoom (1280 px window) | 76.8 px rendered either way, never grows | 40 px to 70 px |
| Lead line-height ratio | 1.22 over 3+ lines | 1.5 |

## Findings

### Text must stay inside the viewport and readable at 320 px and 200% zoom

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | page.css:5 | `.lead { width: 1100px; max-width: none; }` | Width and max-width removed; the lead follows the column measure | The intro paragraph is forced to 1100 px. At 320 px the page is 1124 px wide and most of every line sits off screen, and on desktop it runs 117 characters per line, past what the eye can track back across. |
| HIGH | page.css:10, page.html:19-25 | `th, td { white-space: nowrap; padding: 6px 16px }` on every cell; bare `<table>` | Headers may wrap (balanced, bottom-aligned); cells stay on one line; the table sits in `<div class="table-scroll" role="region" aria-label="…" tabindex="0">` with `overflow-x: auto` | Unbreakable headers make the table 890 px wide, which widens the whole page on phones. Now the table scrolls inside its own keyboard-reachable box and the page stays 320 px wide. |
| HIGH | page.css:3, page.css:1 | `h1 { font-size: 6vw }` inheriting `line-height: 22px` | `font-size: clamp(1.75rem, 1.2rem + 2.5vw, 2.5rem); line-height: 1.15` | At 1280 to 1440 px the title is 77 to 86 px on a 22 px line box (ratio 0.25), so its two lines draw on top of each other. A pure `vw` size also ignores browser zoom: at 200% the title stays the same rendered size, failing text resize. The clamp keeps a rem floor and ceiling so it grows with zoom and stays between 28 and 40 px. |

### Truncation needs a way back to the full text

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | page.css:8 | `.callout { height: 5em; overflow: hidden; }` | Fixed height and overflow removed; padding in rem; last paragraph margin zeroed | The box is 75 px tall but the warning needs 3 to 7 lines, so the end of the most important sentence on the page (what to do before updating) is cut off with no ellipsis and no way to reveal it. |

### Heading sizes descend with level

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | page.css:3-4 | h1 `6vw`, h2 `22px` | h1 28 to 40 px, h2 `1.375rem` (22 px); scale tokens on `:root` | Below about 367 px wide the h1 renders smaller than every h2 (19.2 px vs 22 px) and barely larger than the 18 px lead, so the page title loses its rank on phones. The fixed scale is caption 13, body 15, lead 18, h2 22, h1 28 to 40 px at every width. |
| LOW | page.css:3 | No tracking on the large title | `letter-spacing: -0.015em` | Verdana is built loose for small screen sizes; at 28 to 40 px bold it looks gappy. Tracking is in `em` so it scales with the size. |

### Line-height is unitless and set by role

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | page.css:1 (inherited by page.css:3, 4, 5, 6, 10) | `line-height: 22px` on `body` | Unitless per role: body 1.6, lead 1.5, caption 1.5, h2 1.25, h1 1.15, table headers 1.3 | A fixed pixel value is inherited unchanged by every size: the 18 px lead gets 1.22 across 3 to 10 lines (cramped), the h2 gets 1.0 and the h1 collapses as above. Unitless values scale with each element's own font size. Verdana's tall x-height and wide letters want the more generous 1.6 for body copy. |

### Cap the measure

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | page.css:2 | `.content { max-width: 75ch }` | `max-width: 35rem` | `ch` is the width of the zero, and Verdana's zero is wider than its average letter, so 75ch measured 715 px and 93 characters per line in body text. 35rem measures 72 to 75 characters for body text and 60 for the lead, both inside the 60 to 75 range, and it still follows the reader's default font size. |

### Interface text is start-aligned, not justified

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | page.css:7 (also applies to .lead, .meta, .callout p) | `p { text-align: justify }` | `text-align: start; text-wrap: pretty` | With no hyphenation and only 37 to 44 characters per line on phones, justification opens wide, uneven gaps and rivers between words. Start alignment keeps word spacing even and respects direction; `pretty` keeps a lone word off the last line. |

### Size floors and units

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | page.css:1, 4, 5, 6 | `font-size` in `px` (15, 22, 18, 13) | `rem` tokens: `--text-body: 0.9375rem`, `--text-title: 1.375rem`, `--text-lead: 1.125rem`, `--text-caption: 0.8125rem` | Pixel sizes ignore the reader's browser default font size. The rendered sizes are kept; body stays at 15 px on purpose because Verdana's very large x-height makes it read like a 16 to 17 px setting of most other sans faces. |
| MEDIUM | page.css:6 | `.meta { color: #8a8a8a; font-size: 13px }` | `color: #666` | At 13 px, light grey on white measures about 3.5:1, too faint for small text and below the 4.5:1 normally required. `#666` measures about 5.7:1 and still reads as secondary. |

### Tabular figures and alignment in numeric columns

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | page.css:10, page.html:22-23 | All columns `text-align: left`, proportional digits | Numeric columns `text-align: end` with `font-variant-numeric: tabular-nums`; first column `start`; `th` uses `start` instead of `left` | Right-aligned, fixed-width digits let readers compare 4.8 MB against 220 MB, or 12 against 95 seconds, down the column. `start` instead of `left` survives a right-to-left locale. |

### Values do not split across lines

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | page.html:11, 13, 16, 22-23 | Ordinary spaces in `notes 4.2`, `29 October 2026`, `version 4.2`, `4.8 MB`, `12 seconds` | Non-breaking spaces in each | A version number, date or quantity separated from its unit at a line end reads as a broken value. Verified: at 1280 px the callout now breaks before `version 4.2` instead of between the word and the number. |

### Wrap headings deliberately

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | page.css:3-4, 10 | No wrap control | `text-wrap: balance` on h1, h2 and table headers | Balanced headings avoid a single short word on the second line when the title wraps on narrow screens or under zoom. |

### Root-level rendering and fallbacks

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | page.css:1 | `font-family: Verdana, sans-serif` | `Verdana, Geneva, "DejaVu Sans", sans-serif` | Verdana is missing on most Linux and Android systems, where the generic sans has very different widths and would shift the measure. Geneva and DejaVu Sans are the usual metric-close stand-ins; this keeps the same face where it exists and changes no design. |
| LOW | page.css:1 | No smoothing setting | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` on `:root`, once | Set once on the root so macOS renders the face consistently instead of per component. |
| LOW | page.css:2 | No long-word protection | `overflow-wrap: break-word` on `.content` | A pasted path, revision code or URL in future notes cannot push the column wider than the screen. |

## Checked, no change needed

- `lang="en"` is set on `<html>`, so hyphenation, quotes and pronunciation get the right language.
- Weights: only 400 and 700 are used and Verdana ships both, so nothing is synthesized. No light weights on small text.
- Punctuation: no straight quotes, triple dots, double hyphens or hyphenated ranges appear in the copy.
- No inputs, timers, underlined links or user-select rules on the page.

## Not verified

- Safari and Firefox rendering; all measurements are Chromium. `text-wrap: balance` and `pretty` are progressive enhancements and degrade to normal wrapping where unsupported.
- Real browser zoom; 200% was approximated with a 640 px viewport, which matches how zoom changes CSS pixels.
- Windows ClearType rendering of Verdana and the Linux fallback (DejaVu Sans) measure; neither face's alternative was rendered here.
- Screen reader announcement of the scrollable table region.

## Verdict

Original `page.html` + `page.css`: **Block**. Four HIGH findings: the lead and the table widen the page at 320 px, the callout clips its warning text and the h1 overlaps itself and ignores zoom.

Fixed `page.fixed.html` + `page.fixed.css`: **Approve**. No HIGH findings remain in the measured Chromium runs; the items under Not verified are still open.
