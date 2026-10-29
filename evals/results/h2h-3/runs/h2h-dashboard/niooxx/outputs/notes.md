# Service health dashboard: what changed and why

The dashboard is scanned, not read: people look down a column, compare numbers and look for anything red. Most misreadings came from five things: digits that did not line up, status shown by colour alone, labels too pale and small to read, names cut off and a page that broke on phones and under zoom. The markup had to change (status words, number-cell hooks, a scroll wrapper), so the corrected page is `dashboard.fixed.html`, linking `dashboard.fixed.css`. `dashboard.html` and `dashboard.css` are untouched.

## Problems found (measured in Chromium at 1280px and 375px)

| Severity | Problem | Before | After |
|---|---|---|---|
| High | Status was a coloured dot only; red and green look alike to roughly 1 in 12 men, and screen readers got nothing | empty `<span class="dot">` | dot plus a word: Operational, Degraded, Down; Degraded and Down set in semibold so problems stand out |
| High | Labels, timestamp and footnote failed contrast | 2.2:1 to 3.5:1 | `#595959`, 6.7:1 on the page and 7.0:1 on white |
| High | Fixed `width: 900px` table and 260px tiles made the whole page scroll sideways | page 924px wide in a 320px and 375px viewport | page fits; the table scrolls inside its own labelled box with a shadow cue on the edge that has more columns, and the service column stays pinned while you scroll |
| High | KPI values sized `3vw`: about 11px on a phone, and they never grow with browser zoom | `font-size: 3vw` | `2rem`, scales with the reader's settings and zoom |
| High | Long service names were cut to 160px with an ellipsis and no way to see the rest; under user text-spacing overrides 7px of text was clipped | "Authentication gateway for…" | names wrap; no `overflow: hidden` on text |
| Medium | Number columns were left-aligned in proportional figures, so 411 108 and 80 011 did not line up by place value (1 and 0 differed by 27% in width) | `text-align: left` | `font-variant-numeric: lining-nums tabular-nums` and `text-align: end` on the cells and their headers |
| Medium | Numbers grouped with ordinary spaces could break across lines ("1 184" / "220") | plain spaces | no-break spaces in every grouped number and between value and unit (`118 ms`, `60 seconds`) |
| Low | 10 to 11px labels and footnote | 10px, 11px | 12px minimum for labels, 13px for timestamp and footnote |
| Low | Uppercase labels and headers set without tracking ran together | 0 | `letter-spacing: 0.06em` |
| Low | All sizes in `px` | `14px` body | `rem` throughout, so a reader's default font size is respected |

## Other changes

- Semantics: KPI pairs are a `<dl>`; the table has a `<caption>`, `scope` on column headers and the service name as a row header, so each number is announced with its service and column. The timestamp is a `<time>` element.
- The scroll box is focusable (`tabindex="0"`, named by the caption) so keyboard users can scroll it, with a visible focus ring.
- KPI units (`%`, `ms`) are smaller and greyer than the figure, so the number reads first.
- Physical properties (`left`, `margin: 4px 0 16px`) replaced with logical ones (`text-align: start`, `margin-block`, `padding-inline`, `inset-inline-start`) so a right-to-left edition would not need a rewrite. The edge-shadow scroll cue is the one physical exception, since it marks the right-hand overflow edge.
- Colours and spacing moved into custom properties on `:root`; spacing follows a 4px-based scale.
- Status dot colours darkened so each fill has at least 3:1 against white.
- `dir="ltr"` added to `<html>`; `text-wrap: balance` on the heading.

## Checked

- Rendered audit of `dashboard.fixed.html`: no contrast, reflow, zoom, truncation, text-spacing or figure-alignment findings (the original had 8 high-severity findings).
- Source lint of the fixed CSS and HTML: clean.
- Screenshots at 1280px and 375px looked at by eye.

## Not verified

- Safari and Firefox rendering (Chromium only).
- Whether the production font is `system-ui` everywhere; tabular figures depend on the face having them. The system faces on macOS, Windows and Android do.
- Copy choices: the status words (Operational, Degraded, Down) are my reading of the three dot colours; rename them if your incident process uses other terms.
