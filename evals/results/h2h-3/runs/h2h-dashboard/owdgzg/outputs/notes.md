# Dashboard fixes

Files: `dashboard.fixed.css` and `dashboard.fixed.html` (markup had to change). Originals are untouched.

## What was wrong and what changed

1. **Status was shown by colour alone.** The Status column held only a red, amber or green dot, with no text. Colour-blind users and screen readers got nothing, and amber on white is hard to see for anyone. Each cell now has a word (Healthy, Degraded, Down) next to the dot. The dot is hidden from assistive tech, since the word carries the meaning. The three states also differ in shape (circle, diamond, square), and the text colours are dark enough to read on white.
2. **Service names were cut off.** A `max-width: 160px` plus `nowrap` and an ellipsis turned "Authentication gateway for partner accounts" into a truncated string. Names now wrap in full.
3. **Numbers were left-aligned and proportional.** Requests, errors and p95 could not be compared by eye. Those columns, and their headers, are right-aligned with tabular figures so digits line up.
4. **Low contrast and tiny text.** Labels were 11px `#8a8a8a`/`#999` and the footer 10px `#aaa`, all below the 4.5:1 minimum. Muted text is now `#57606a` (about 6:1), labels 13px, secondary text 14px, body 16px. KPI labels and headers are semibold so the small caps stay legible.
5. **KPI values sized in `vw`.** `3vw` made figures about 11px on a phone and oversized on wide screens. Now `clamp(24px, 4vw, 36px)`, with tabular figures.
6. **Fixed widths broke narrow screens.** The table was 900px and each KPI card 260px. KPIs now use an auto-fit grid, the table is `width: 100%`, and it sits in a scrollable, keyboard-focusable wrapper as a last resort below 560px. Page width is capped at 1100px so rows do not stretch absurdly on large monitors.
7. **Table semantics.** Header cells have `scope="col"`, and the service name is a row header (`th scope="row"`) so a screen reader announces the service with each value. The KPI section and table region have labels.
8. **Visual structure.** Cards and the table get a thin border so they separate from the page background (white on #fafafa was nearly invisible). The last row no longer draws a stray bottom border.

## Left alone on purpose
The data, the order of rows and the copy are unchanged. I did not add per-service error rates or sort the table by severity; that would change content and is worth deciding separately (Notifications at ~97% errors is the row that most needs to stand out).
