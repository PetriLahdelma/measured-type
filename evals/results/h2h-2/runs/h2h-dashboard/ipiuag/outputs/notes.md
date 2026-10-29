# Service health dashboard: what changed and why

Outputs: `dashboard.fixed.css` and `dashboard.fixed.html` (the markup had to
change; it links the new stylesheet). `dashboard.html` and `dashboard.css` are
untouched. `before.png`, `after.png` and `after-375.png` are Chromium
screenshots at 1280px and 375px; `shot.js` produced them.

This page is scanned, not read: short labels, numbers compared down a column
and status at a glance. The fixes treat it as interface and data text.

## Why people misread it

| Problem in the original | Measured | Fix |
|---|---|---|
| Status was colour only: a green, amber or red dot with no word and no text alternative. About 1 in 12 men cannot tell that red from that green, and screen readers announced nothing. | 4 rows with an empty status cell | Each status now has a word (Healthy, Degraded, Down) next to the dot; the dot is decorative (`aria-hidden`). "Down" is also set in red and semibold so the outage is the first thing the eye lands on. |
| Number columns were left-aligned in proportional figures, so place values did not line up: 3 000 sat under 690 101 starting at the same edge, and `1` was 27% narrower than `0`. | `1` vs `0` width differs by 26.8% | Number cells and their headers align to the end with `font-variant-numeric: lining-nums tabular-nums`; every digit now takes the same width, so thousands sit under thousands. KPI values and the timestamp use the same figures. |
| The longest service name was cut to "Authentication gat..." with no way to read the rest (no title, no tooltip). | Cut at 1280px; clipped further under the WCAG text-spacing override | Names wrap instead of truncating. The name cell is now a row header (`<th scope="row">`), so each number is announced with its service. |
| Uppercasing the column heads turned "p95 (ms)" into "P95 (MS)", and "MS" is a different unit (megasiemens). The capitals also had no tracking, so they read as a block. | 11px capitals, 0 letter-spacing | Labels and column heads are in sentence case, which scans faster and keeps units correct. Only the one-word eyebrow "OPERATIONS" stays in capitals, tracked at 0.06em. |
| Digit groups used ordinary spaces, so "1 184 220" or "118 ms" could break across lines. | Regular U+0020 spaces in the source | Narrow no-break spaces (U+202F) inside numbers, a no-break space between number and unit, and `white-space: nowrap` on number cells. "0.41%" kept in English style with no space. |

## Readability and accessibility

| Problem | Measured | Fix |
|---|---|---|
| Grey label, timestamp and footnote text was too faint. | 2.23:1 (footnote), 2.73:1 (timestamp), 3.31 to 3.45:1 (labels); 4.5:1 needed | One muted ink, `#595959`: 7.0:1 on white, 6.7:1 on the page ground. Red status text `#c62828` is 5.6:1. |
| Text as small as 10 and 11px. | 10px footnote, 11px labels and timestamp | 12px (`0.75rem`) floor for labels, caption and footnote; timestamp at body size (14px). |
| KPI numbers sized in `3vw`: they never grow with browser zoom (1.00× even at 500%), and on a phone they shrink to about 11px. | `font-size: 3vw` | `clamp(1.5rem, 1.25rem + 0.75vi, 2rem)`: a rem floor that zooms, a modest range. The unit "ms" is set smaller and muted so the figure leads. |
| All sizes in `px`, which ignores the reader's default font size. | `body { font-size: 14px }` | Sizes in `rem` on a short named scale (12, 14, 28px and the KPI range) as custom properties; spacing on one 0.25rem-based scale. |
| Fixed widths (`table` 900px, KPI tiles 260px) made the whole page scroll sideways on phones and at 400% zoom. | Page 924px wide in a 320px and a 375px viewport | KPI tiles sit on an auto-fit grid that stacks on narrow screens. The table fills its container and scrolls inside its own labelled, keyboard-focusable region (`role="region"`, `tabindex="0"`, caption). Edge shadows show when columns are hidden to either side. |
| No caption or table structure for assistive tech. | n/a | `<caption>` "Services, last hour", `scope` on every header, `<time datetime>` on the timestamp, `<main>` landmark. |
| Physical `left` alignment. | `text-align: left` | Logical properties throughout (`text-align: start`/`end`, `margin-block`, `inline-size`, `border-block-end`) so a right-to-left edition does not need a rewrite. |

Smaller touches: unitless line-height (1.4 body, 1.2 title, 1.1 KPI values),
`text-wrap: balance` on the title, `vertical-align: baseline` so wrapped
service names keep their row aligned on the first line, rows separated by
hairlines with the last one removed inside the bordered box, colours as
tokens on `:root`.

## Verification

Chromium (Playwright), on `dashboard.fixed.html`:

- Before: 9 high, 1 medium and 5 low findings (contrast, reflow at 320 and
  375px, clipped text under the WCAG 1.4.12 spacing override, proportional
  figures, left-aligned numbers, untracked capitals, sub-12px text, silent
  truncation), plus `3vw` failing zoom in the source.
- After: no findings for contrast, reflow at 320 and 375px, text spacing
  override, zoom, tabular figures, number alignment, truncation or text size.
  Source lint clean.
- The system font rendered (SF on macOS) has true tabular figures; the
  rendered `1` and `0` now share a width.

**Not verified:** Safari and Firefox rendering; Windows (Segoe UI) and Linux
system fonts; contrast where the edge scroll shadows overlap text (they are
at most 14% black over a 0.75rem strip at the very edge, only while the
table is scrolled); screen-reader output in a real assistive technology.

## Suggested next step (not done)

The "Errors" column shows raw counts, so Billing (1 104) and Notifications
(2 911) look like problems of similar size, although their error rates are
about 1.4% and 97%. An error-rate column would remove that misreading; it
needs a data change in whatever generates the page, so it is left out here.
The timestamp also has no time zone; add one if readers sit in more than one.
