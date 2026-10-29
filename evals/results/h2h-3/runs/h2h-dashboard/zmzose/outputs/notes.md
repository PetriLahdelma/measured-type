# Dashboard fixes

Markup had to change (status was a bare coloured dot), so there is a corrected `dashboard.fixed.html` linking `dashboard.fixed.css`. The original files are untouched. All data values are unchanged.

## What was wrong and what I changed

1. **Status shown by colour only.** The dots had no text, so colour-blind users, screen readers and greyscale prints got nothing, and green/amber/red were easy to confuse. Each status now has a word (Healthy, Degraded, Down), and the dot also differs in shape (circle, diamond, square). The Down row gets a light red tint so the one broken service stands out. Status colours were darkened to pass contrast on white.
2. **Truncated service names.** "Authentication gateway for partner accounts" was cut to an ellipsis at 160px with no way to read it. Names now wrap in full and are row headers (`th scope="row"`).
3. **Numbers left-aligned and untabulated.** Counts were hard to compare by magnitude. Numeric columns and their headers are right-aligned with tabular figures. Spaced thousands use non-breaking spaces so a number never splits across lines.
4. **Low contrast, tiny text.** Labels and footnote were 10-11px in #8a8a8a/#999/#aaa (well under 4.5:1). Body is now 16px, labels and headers 13px minimum, secondary text #595959 (about 6.9:1), and the footnote and timestamp are 14px.
5. **Fixed widths and viewport-sized type.** The 900px table and 260px KPI cards overflowed on small screens, and `3vw` KPI values shrank to unreadable sizes on phones and ballooned on wide screens. KPI cards are a responsive grid, values use a clamped size, and the table fills its container inside a scrollable, keyboard-focusable wrapper.
6. **Structure for scanning and assistive tech.** Added a table caption, column header scopes, a `time` element for the update stamp, labelled regions, and card borders so KPI cards and the table read as distinct blocks on the off-white page.

## Not changed
Row order and the content of figures are as supplied. Sorting worst-first (or a sort control) would help further but depends on the real data feed.
