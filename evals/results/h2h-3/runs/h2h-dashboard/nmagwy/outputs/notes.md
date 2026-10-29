# Dashboard fixes

Files: `dashboard.fixed.css`, `dashboard.fixed.html` (links the fixed stylesheet). The original files are untouched. Markup had to change because status was shown by colour alone and the table could not reflow.

## What was wrong and what changed

1. **Status was a coloured dot with no words.** Red against green is invisible to many readers, and screen readers got nothing. Each dot now sits beside a word (Healthy, Degraded, Down). The dot is hidden from assistive tech. Dot colours were darkened a little.
2. **Numbers did not line up.** Figures were left-aligned in proportional digits, so 1 104 and 80 011 could not be compared by eye. Number columns and their headers are now right-aligned with tabular lining figures, so place values stack. Units stay in the header (`p95 (ms)`).
3. **Numbers could break across lines.** Grouped figures such as `1 184 220` and `118 ms` used ordinary spaces and could split. They now use non-breaking spaces and `white-space: nowrap` in number cells.
4. **Service names were cut off with an ellipsis.** "Authentication gateway for partner accounts" was unreadable and the full text was not recoverable. Names now wrap inside a 28-character column.
5. **Labels and secondary text were too small and too pale.** The 10 to 11px text in #8a8a8a, #999 and #aaa was about 2.3 to 3.5:1 contrast. Labels, timestamp and footnote are now 12px or larger in #595959 (about 7:1). Uppercase labels and table headers got 0.06em tracking and semibold weight.
6. **Type sizes were px, and the KPI size used `3vw`.** A `vw`-only size never grows with browser zoom, which fails text resizing. Everything is in `rem`; the heading and KPI values use `clamp()` with a rem term and a range of about 1.4x. Body is 1rem, cells 0.9375rem, labels 0.75rem. Line-heights are set (body 1.5, cells 1.35, KPI 1.1).
7. **Fixed widths broke narrow screens.** `table { width: 900px }`, 260px cards and a non-wrapping flex row forced page-level sideways scrolling. KPI cards now wrap and flex (`flex: 1 1 12rem`). The table is `100%` wide inside a focusable, labelled `overflow-x: auto` wrapper, so only the table scrolls on small screens.
8. **Table semantics.** Added `scope` on headers and made the service name a row header, restyled to look like a normal cell. `text-align: left` became `start` (and `end` for numbers).

Also: `text-wrap: balance` on the heading and `font-variant-numeric: lining-nums tabular-nums` on the KPI values.

## Checks run

- Source lint: no findings after tuning the KPI clamp range.
- Rendered page audit in Chromium (reflow, contrast, text spacing, zoom, measure, truncation): no findings.
- Not checked: Safari and Firefox rendering.
