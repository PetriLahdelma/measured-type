# Service health dashboard: what changed and why

Outputs: `dashboard.fixed.css` and `dashboard.fixed.html` (links the new stylesheet). The original `dashboard.html` and `dashboard.css` are untouched.

The markup had to change, mainly because service status existed only as an empty coloured `<span>`. No stylesheet can give that a readable meaning.

## Problems found and fixes

### 1. Status was colour alone (the biggest misread risk)
- **Before:** an 8px red, amber or green dot with no text. People with red/green colour blindness can't tell "ok" from "down", and screen readers announce nothing. The amber dot on white is about 1.8:1, so it nearly disappears.
- **After:** every status has a word (Healthy, Degraded, Down) and its own shape (circle, triangle, square). Colour is now a third cue, and the shapes are `aria-hidden`. Status colours are darkened so the label text passes 4.5:1, both on white and on the row tints.
- Problem rows get a light tint and a 4px left bar in the status colour, and their numbers are bold, so a glance down the table finds them. In Windows high-contrast mode the tints drop out, so the shapes and a solid bar take over.

### 2. Problems were buried at the bottom
- **Before:** the Down service (Notifications) was in the last row.
- **After:** rows are sorted most severe first: Down, then Degraded, then Healthy. The caption ("Services, most severe status first") states the order so nobody reads it as alphabetical or by traffic. If the live page builds rows in code, the sort belongs there too.

### 3. Service names were cut off
- **Before:** `.name` had `max-width: 160px` with an ellipsis, so "Authentication gateway for partner accounts" showed as a fragment and similar names could be confused.
- **After:** names wrap in full and are never truncated. The name cell is now a row header (`<th scope="row">`), so assistive tech announces the service with each number.

### 4. Numbers were hard to compare
- **Before:** numbers were left-aligned in proportional digits, so the magnitudes in a column didn't line up. "411 108" and "80 011" looked about the same length.
- **After:** numeric columns and their headers are right-aligned, use tabular (equal-width) digits and never wrap inside a value (the space thousands separator could otherwise break "1 184 220" across lines).

### 5. Text was too small and too faint
Measured contrast on the original:
- Column headers, KPI labels and the eyebrow: 11px at 3.3 to 3.5:1
- "Updated" timestamp: 11px at 2.7:1
- Footnote: 10px at 2.2:1

All of these fail WCAG AA. The fix uses one muted colour (`#595959`, about 7:1) for secondary text, with nothing below 13px. Column headers and KPI labels are now sentence case and semibold instead of tiny uppercase, which reads faster. The "Updated" time is in full-strength text and wrapped in `<time datetime>`, because data age is something operators need to see at once.

### 6. KPI numbers scaled with the window, not the reader
- **Before:** `font-size: 3vw` gave 11px headline figures on a phone (smaller than their labels) and 38px+ on wide screens.
- **After:** sizes use `clamp()` in rem, which keeps the figures between 28px and 36px and respects the user's browser font setting. The body text moved from a fixed 14px to 1rem for the same reason.

### 7. Fixed widths broke small screens
- **Before:** the 900px table and 260px KPI boxes forced the whole page to scroll sideways on a phone.
- **After:** the page sits in a centred column with a 64rem maximum. KPI tiles are a fluid grid that stacks on narrow screens, and the table fills its container. Below 40rem the table scrolls sideways inside its own card (a focusable, labelled region, so keyboard users can scroll it), and the page itself never scrolls sideways. In that mode the service column stays pinned, so each number keeps its row label, and a shadow on the right edge shows there are more columns.

### 8. Weak structure
- KPI cards were white on near-white with no edge. They now have a border and radius, as does the table card.
- The table gained a caption, `scope` on headers and a labelled KPI section. The content sits in `<main>`.

## Verified
I rendered the original and fixed pages in headless Chromium at 1280px and 375px wide.
- **Original:** 11 text elements below 4.5:1 or under 12px. The page scrolled sideways at 375px. One service name was truncated. KPI figures rendered at 11.25px on a phone.
- **Fixed:** at both widths, no text fell below 4.5:1 and none was under 12px. Nothing was truncated and the page didn't scroll sideways. KPI figures rendered at 36px on desktop and 28px on a phone.

Scripts: `check.cjs` and `scrolled.cjs`. Screenshots: `shot-*.png`.

## Not changed, worth checking with the data owners
- **The error rate tile may not match the table.** The four services' errors add up to 4 144 out of 1 184 220 requests, which is 0.35%, but the tile says 0.41%. The requests do sum exactly to the "Requests today" figure. Either the error rate uses a different window (for example the last hour, like latency), or one of the numbers is wrong. The tile should state its time window either way.
- **The Errors column is a raw count.** "1 104" for Billing (1.4% of its requests) and "111" for Search (0.02%) are hard to judge without the request volume next to them. A per-service error rate column would make severity readable without arithmetic. I didn't add one, because it would put new derived figures on an ops screen without sign-off.
