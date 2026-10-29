# Service health dashboard: what changed and why

Files: `dashboard.fixed.css` (new stylesheet) and `dashboard.fixed.html` (corrected markup, linked to the new stylesheet). The original `dashboard.html` and `dashboard.css` are untouched. The markup had to change because two problems could not be fixed in CSS alone: status had no text, and the table had no row or column headers.

## Biggest causes of misreading

1. **Status was a colored dot only.** The status cell held an empty `<span>` with no text. Anyone with red/green color blindness could not tell Healthy from Down, screen readers announced nothing, and the amber dot (#ffb300) was 1.8:1 against white, so it nearly disappeared. Each status now has a word (Healthy, Degraded, Down) plus a glyph whose *shape* also differs (circle, diamond, square). Degraded and Down text is bold and colored; all status colors are at least 4.9:1 against their background.

2. **Service names were truncated.** `.name` cut names off at 160px with an ellipsis, so "Authentication gateway for partner accounts" showed as a fragment. On an ops screen a cut-off name can be read as a different service. Names now wrap to a second line instead (capped at about 22em so the column stays tidy).

3. **Numbers were left aligned in a proportional font.** Comparing 411 108 against 3 000 meant reading every digit. Numeric columns (Requests, Errors, p95) and their headers are now right aligned with tabular (equal width) digits, so magnitude is visible from the length of the number and place values line up.

4. **Thousands separators could split.** Values use a space as the group separator ("1 184 220"), which the browser is allowed to break onto two lines, turning one number into two. Numeric cells and KPI values now use `white-space: nowrap`.

5. **Problem rows did not stand out.** The only signal was the 8px dot. Degraded and Down rows now get a light tinted background and a 4px colored bar on the left edge, so the eye lands on them first when scanning down the table.

## Legibility and contrast

- Labels, column headers and the eyebrow were 11px #8a8a8a (3.3 to 3.5:1). The "Updated" time was #999 (2.7:1) and the footnote 10px #aaa (2.2:1), even though the footnote is where the latency definition lives. All secondary text now uses #5c5c5c (6.4:1 or better) at 12 to 13px; body text went from 14px to 15px.
- Header labels get slight letter spacing, which uppercase text at small sizes needs.
- Table row rules were nearly invisible (#eee); they are now #dcdcdc, with a stronger rule under the header row.

## Layout

- **KPI value size was `3vw`.** That is about 11px on a phone (smaller than its label) and 58px on a wide monitor. It is now `clamp()`ed between 24px and 34px.
- **Fixed widths.** The table was 900px and each KPI tile 260px, so on a laptop the KPI row ended about 90px before the table, and on a phone the whole page scrolled sideways. Content now sits in one centered column (max 960px); the KPI tiles are a responsive grid that fills that width and wraps on narrow screens, and the table fills the same width so the edges line up.
- On narrow screens the table scrolls inside its own container instead of pushing the page wider. That container is keyboard focusable and labelled so keyboard and screen reader users can reach and scroll it, with a visible focus ring.
- KPI tiles and the table share a border and radius so they read as one set of panels.

## Structure (markup)

- Content is wrapped in `<main>`.
- The table has a visible caption ("Services"); column headers have `scope="col"`; each service name is a row header (`<th scope="row">`), so screen readers announce "Notifications, Down" rather than a bare value.
- The KPI section has a visually hidden heading ("Totals") so it shows up when navigating by heading.
- The timestamp is a `<time datetime>` element.
- A Windows High Contrast / forced colors fallback keeps the status glyphs and row markers visible.

## Not changed, but worth checking

- **The KPI error rate does not match the table.** The table's requests add up exactly to the 1 184 220 shown under "Requests today", but its errors add up to 4 144, which is 0.35%, not the 0.41% shown. Either the KPI uses a different time window or the figures are out of sync. This is a likely source of confusion; I left the numbers as they are.
- **Time windows are unstated.** The footnote says latency is over the last hour, but the Requests and Errors columns do not say whether they are today or the last hour. Putting the window in the column headers (for example "Requests (today)") would remove the guesswork.
- **The timestamp has no time zone.** If the team is spread across zones, add one.
- **Error counts versus rates.** The headline shows an error *rate* but the table shows *counts*, so Billing's 1 104 errors (1.4% of its traffic) and Notifications' 2 911 (97%) are hard to judge. An error rate column would make that clearer.
- **Row order.** I kept the existing order in case people rely on it. Sorting Down and Degraded services to the top would make the table faster to scan.
