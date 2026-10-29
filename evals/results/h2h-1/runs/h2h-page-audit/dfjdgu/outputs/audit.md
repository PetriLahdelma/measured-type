# Typography audit: Release notes 4.2

Surface: a release-notes document. The reader's job is to understand what changed and, above all, to notice the migration warning. Stability, measure and hierarchy matter more than expression, so the fix keeps the incumbent identity (Verdana, near-black on white, grey note panel, single centred column) and corrects how it is used.

Method: every finding below was measured in Chromium (Playwright) at 320, 375, 768, 1280 and 1920 px wide, plus a 24 px reader default font size at a 640 px viewport (equivalent to 200% zoom on a 1280 px window). Characters per line were counted from rendered line boxes, not estimated. Helper scripts are in `scratch/`; before/after screenshots are `scratch/before-*.png` and `scratch/after-*.png`.

## Findings

Severity: **Critical** breaks reading or hides content; **High** fails an accessibility criterion or wrecks hierarchy; **Medium** degrades comfort; **Low** is refinement.

| # | Severity | Where | Problem (measured) |
|---|---|---|---|
| 1 | Critical | `.callout { height: 5em; overflow: hidden }` | The migration warning, the most important sentence on the page, is clipped. Content needs 172 px at 375 wide and 194 px at 320; the box is 99 px, so about half the warning is cut off on phones with no scroll or ellipsis. |
| 2 | Critical | `body { line-height: 22px }` inherited by `h1` | A fixed pixel leading is inherited by every role. The `h1` at 1280 wide is 76.8 px type on 22 px lines: it wraps to two lines and "4.2" overprints "Release". At 1920 it is 115 px on 22 px lines. |
| 3 | Critical | `.lead { width: 1100px; max-width: none }` | The lead paragraph ignores the column. The page scrolls horizontally at every width below about 1130 px (document is 1124 px wide on a 375 px phone), and the lead runs 114 to 117 characters per line, far past a readable measure. |
| 4 | High | `h1 { font-size: 6vw }` | Viewport-only sizing. At 320 px the title is 19.2 px, smaller than the 22 px `h2`, so the hierarchy inverts; at 1920 it is 115 px. Because it ignores rem, a reader's larger default font size does not enlarge it (WCAG 1.4.4 risk). |
| 5 | High | `.meta { color: #8a8a8a; font-size: 13px }` | Contrast 3.45:1 on white, below the 4.5:1 needed for small text (WCAG 1.4.3). 13 px Verdana grey is also the smallest text on the page. |
| 6 | High | `table` with `white-space: nowrap` on all cells | The table is 890 px wide with no wrapper, so it alone forces horizontal page scroll below about 940 px. The five long headers ("Average size before" and so on) repeat the same two words four times. |
| 7 | High | `body { font-size: 15px }` and all `px` sizes | Body text sits below the 16 px web reading floor, and pixel units override the reader's browser font size setting. With a 24 px default, the original body stays at 15 px. |
| 8 | Medium | `.content { max-width: 75ch }` | `ch` is the width of a Verdana zero, which is wider than average Verdana prose. Measured body measure is 92 to 93 characters per line, over the 45 to 75 range. |
| 9 | Medium | `p { text-align: justify }` | Justified, unhyphenated text in a wide face produces rivers and stretched word gaps (clearly visible in the meta line and the callout at desktop width, and worse at 34 to 44 characters per line on phones). |
| 10 | Medium | `.lead` 18 px on 22 px leading; `h2` 22 px on 22 px | Lead leading is 1.22, cramped for a five-line paragraph; `h2` is 1.0, so any wrapped section heading collides. The only issue the automated scan reported was this tight leading. |
| 11 | Medium | Table figures | Numeric columns are left-aligned, so values of different widths ("4.8 MB", "220 MB") do not line up by place value; no tabular figures requested. |
| 12 | Low | Callout emphasis | The warning is set exactly like body text on a pale grey (#f3f3f3, 1.1:1 against the page). Nothing in the type signals that this paragraph is the one to act on. |
| 13 | Low | Font fallback | Verdana has an unusually tall x-height (0.545 em). On systems without it (most Linux, Android) the generic sans renders visibly smaller at the same size, and the measure shifts. |
| 14 | Low | Headings wrap | No `text-wrap: balance` on headings or `pretty` on body, so the 320 px title breaks unevenly and paragraphs can end on a single word. |

What the automated scan caught alone: tight leading (finding 10). What only the rendered measurement caught: the clipped warning, overlapping title, overflow, inverted hierarchy, measure and contrast (findings 1 to 9). The scan on the original reported one issue; the page had fourteen.

## The corrected system

Face: Verdana is kept as the authority, with metric-compatible fallbacks (`DejaVu Sans`, `Bitstream Vera Sans`) and `font-size-adjust: 0.545` so a fallback face keeps Verdana's apparent size.

| Role | Size | Leading | Notes |
|---|---|---|---|
| Title `h1` | `clamp(2rem, 1.55rem + 1.6vw, 2.75rem)` = 32 to 44 px | 1.15 | bold, -0.01em tracking, balanced wrap; rem base so zoom enlarges it |
| Section `h2` | 1.5rem = 24 px | 1.25 | bold; 40 px above, 12 px below, so it binds to its section |
| Lead | 1.1875rem = 19 px | 1.55 | regular weight; separated from `h2` by weight as well as size |
| Body | 1rem = 16 px | 1.6 | ragged right, `text-wrap: pretty` |
| Table data | 0.9375rem = 15 px | 1.4 | tabular lining figures, numbers right-aligned |
| Meta and caption | 0.875rem = 14 px | 1.5 | #5c5c5c, 6.7:1 on white |

Measure: the column is `35em`, calibrated to Verdana's real prose width (about 1.9 characters per em) rather than `ch`.

## Fixes applied (`page.fixed.css`)

1. Callout: removed the fixed height and `overflow: hidden`; the panel now sizes to its content, gets a 1 px border so it separates from the page, and its last paragraph drops its bottom margin.
2. Leading is unitless on every role, so each line height scales with its own font size.
3. Lead: removed the 1100 px width; it lives in the column like everything else.
4. Title: rem-based clamp, 32 to 44 px. Hierarchy now holds at every width (title 32 px vs section 24 px at 320 px).
5. Meta: 14 px at #5c5c5c (6.7:1).
6. Table: full column width, two-tier grouped headers, figures right-aligned with tabular numerals, darker rule under the header block, wrapped in a scroll region so a narrow screen scrolls the table, never the page.
7. All sizes in rem from a 16 px body; `text-size-adjust: 100%` stops iOS from inflating text in landscape.
8. Measure set to `35em`.
9. Justification removed (`text-align: start`).
10. Headings balanced, body `pretty`.

## Markup changes (`page.fixed.html`)

The markup had to change for three of the findings, so a corrected copy links `page.fixed.css`. `page.html` is untouched.

- Table: wrapped in `<div class="table-scroll" role="region" tabindex="0">` labelled by a new caption, so keyboard and screen-reader users can reach and scroll it. Headers regrouped into "Average size" and "Export time", each over "Before" and "After", with `scope` attributes and `colgroup`s; row labels are `<th scope="row">`. Every original header word is preserved, only no longer repeated.
- New caption: "Export size and time, before and after 4.2". This is added copy; it is descriptive, makes no new claim, and gives the region its accessible name. Edit the wording freely.
- Callout: `role="note"`, and the first sentence ("Older clients cannot open converted projects.") is wrapped in `<strong>` so the warning reads as the action item. No words changed.
- Non-breaking spaces between figures and units ("4.8&nbsp;MB", "12&nbsp;seconds", "version&nbsp;4.2") so a value never splits across lines.
- The publication date is a `<time datetime="2026-10-29">` element.

## Verification (rendered, after)

| Check | Before | After |
|---|---|---|
| Horizontal page scroll at 320 / 375 / 768 / 1280 px | 1124 / 1124 / 1126 / 1382 px document width | none at any width (document = viewport) |
| Warning fully visible | clipped at every width (99 px box, up to 194 px content) | box = content height at every width |
| Body characters per line, desktop | 92 average, 93 max | 67 average, 71 max |
| Lead characters per line, desktop | 114 to 117 | 53 average, 57 max |
| Title vs section size at 320 px | 19.2 px vs 22 px (inverted) | 32 px vs 24 px |
| Title leading at 1280 px | 76.8 px type on 22 px lines, overprinting | 44 px on 50.6 px, single line |
| Meta contrast | 3.45:1 | 6.69:1 |
| Reader default 24 px, 640 px viewport | body stays 15 px, page 1124 px wide | body 24 px, title 48 px, no overflow |
| Automated type scan | 1 finding | 0 findings |

Known limit: at 320 and 375 px the five-column table (449 px) is wider than the column, so it scrolls inside its labelled region; the page itself does not move. Stacking the rows into cards on phones was rejected because it would break the before/after comparison the table exists to show.
