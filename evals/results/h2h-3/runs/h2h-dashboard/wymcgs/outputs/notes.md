# Service health dashboard: what changed and why

The markup had to change, so there are two new files: `dashboard.fixed.html` (links `dashboard.fixed.css`) and `dashboard.fixed.css`. The original `dashboard.html` and `dashboard.css` are untouched. No figures were changed or added.

## The misreadings, and the fixes

### 1. Status was only a colored dot
The Status column held an empty `<span class="dot">`. Nothing told you what the dot meant; colorblind readers could not tell the green and red dots apart; screen readers got an empty cell; and the amber dot (#ffb300) sat at 1.8:1 on white, so it nearly vanished.

- Markup: each status is now a word ("Healthy", "Degraded", "Down").
- CSS: the word keeps a small marker that changes shape as well as color (circle, triangle, square). The colors are darker so the text clears 5:1.
- Rows that are degraded or down get a tinted background and a colored bar on the left edge. The two problem services stand out before you read a single number.
- In Windows high-contrast mode, the markers and edge bars fall back to system colors so they stay visible.

The "Degraded" label is my reading of the old `warn` class. Rename it if your team uses another term.

### 2. Service names were cut off
`.name` was capped at 160px with `nowrap` and an ellipsis, so "Authentication gateway for partner accounts" showed only part of the name and could be mistaken for another service. Names now wrap and get a sensible minimum width. Each name is a row header (`<th scope="row">`), so assistive tech announces the service with every value in that row.

### 3. Numbers were left-aligned in a proportional font
Left-aligned digits with no fixed widths make 3 000 and 690 101 start at the same edge, so you cannot compare sizes by eye. Numeric headers and cells are now right-aligned and use tabular figures, so digits line up by place value. The space thousands separators are now non-breaking spaces, and numeric cells use `white-space: nowrap`, so a value like "1 184 220" can never split across lines and look like two numbers.

### 4. "Errors" invited the wrong comparison
The KPI above the table shows errors as a rate (0.41%), while the column shows raw counts. That is how Notifications (2 911 errors out of 3 000 requests) looked less alarming than it is. The header now says "Errors (count)". Beyond that, the bigger fix is the status word and row highlighting. Adding an error-rate column would be clearer still; I left that out because it adds figures the source does not show (suggestion below).

### 5. Key context was the faintest text on the page
The "Updated" timestamp (#999 at 11px, 2.7:1) and the footnote explaining refresh rate and what p95 means (#aaa at 10px, 2.2:1) both failed contrast. Yet both decide how you read the numbers: stale data and the latency window. They are now #595959 at 13-14px (about 6.7:1). The timestamp value is bold and wrapped in `<time datetime>`. The uppercase labels (eyebrow, KPI labels, column headers) went from #8a8a8a at 11px (3.3:1) to the same darker gray at 12px with slight letter spacing.

### 6. KPI value size followed the viewport width
`font-size: 3vw` made the headline numbers about 11px on a phone (smaller than the labels above them) and over 50px on a wide monitor. They now use `clamp()`, ranging from 24px to 36px, with tabular figures.

### 7. Fixed widths broke small screens
The table was 900px wide and each KPI card 260px, which forced the whole page to scroll sideways on phones and small laptops. Now:
- KPI cards wrap and share the row.
- The page content is capped at 960px and centered.
- The table fills its container. Below 600px it scrolls inside its own bordered box, so the rest of the page stays put. That box is keyboard-focusable and labelled, so keyboard users can scroll it too.

### 8. Structure for scanning and assistive tech
- The table has a caption ("Services"), and headers use `scope`.
- The KPIs are description lists (label and value pairs) inside a labelled section, not bare paragraphs.
- The page sits in a `<main>` landmark.
- Body text went from 14px to 15px with an explicit line height. Header rows have a heavier rule, and cells are top-aligned so wrapped names don't throw rows out of line.

## Suggestions I did not apply (they change content, not presentation)
- Add an error-rate column (errors / requests). Notifications would read 97.0% and Billing 1.4%, against 0.4% overall.
- Sort rows worst-first (Down, then Degraded, then Healthy) so the problems sit at the top of the table.
- Say what period "Requests" and "Errors" cover in the table. The KPI says "today", but latency is "last hour", and the table does not say which applies.
