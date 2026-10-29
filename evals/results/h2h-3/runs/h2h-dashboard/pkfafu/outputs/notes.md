# Service health dashboard: what changed and why

Outputs: `dashboard.fixed.css` and `dashboard.fixed.html` (links the fixed
stylesheet). The markup had to change because two of the problems (status
shown by colour alone, numbers that could break across lines) cannot be fixed
in CSS. The original `dashboard.html` and `dashboard.css` are untouched.

## Why people misread it

| Problem | Effect on the reader | Fix |
|---|---|---|
| Status was a coloured dot with no word | Red, amber and green dots are hard to tell apart for roughly 1 in 12 men, and screen readers announced nothing at all. "Notifications is down" was invisible to part of the team. | Each status now has a word (OK, Degraded, Down) next to the dot; the dot is decorative (`aria-hidden`). Degraded and Down are also set in bold, in a colour that passes 4.5:1. The `warn` class is labelled "Degraded"; rename if your team uses another word. |
| Number columns were left-aligned in proportional figures | 1 104 and 18 started at the same edge, so a four-digit error count looked no bigger than a two-digit one. Digits had different widths (1 vs 0 differed by 27%), so place values never lined up. | Requests, Errors and p95 are end-aligned (header too) with `font-variant-numeric: lining-nums tabular-nums`. Hundreds now sit over hundreds and magnitude is visible at a glance. |
| Uppercase transform on the table header and KPI labels | It rewrote "p95 (ms)" as "P95 (MS)" and "p95 latency" as "P95 LATENCY". Uppercase changes the meaning of unit symbols (ms is milliseconds; MS is not). | Header cells and KPI labels are in sentence case, so the text renders as written. Only the "Operations" eyebrow stays in capitals, now tracked at 0.08em so it does not set as a block. |
| Service names were cut with an ellipsis and no way to see the rest | "Authentication gateway for partner…" with no tooltip or accessible name; it also clipped 7px of text when users increase text spacing. | Names wrap (capped at 18rem) instead of truncating. Names are row headers (`th scope="row"`) so each number is announced with its service. |
| Spaces in "1 184 220", "411 108" and "118 ms" were ordinary spaces | A number could wrap in the middle and read as two numbers, or the unit could drop to the next line. | Digit groups use a narrow no-break space, units a no-break space, and number cells and KPI values are `white-space: nowrap`. The "ms" unit in the KPI is set smaller and muted so the figure leads. |

## Legibility and accessibility

| Problem | Measured before | Fix |
|---|---|---|
| Grey text failed contrast | Labels and header cells 3.45:1, eyebrow 3.31:1, "Updated" 2.73:1, footnote 2.23:1 (needs 4.5:1) | One muted token, `#595959`: 7.0:1 on white, 6.7:1 on the page ground. Status words: Degraded `#9a5b00` 5.4:1, Down `#c62828` 5.6:1. |
| Text set too small | 11px labels, header cells and "Updated", 10px footnote | Smallest size is now 0.75rem (12px). Table header cells are smaller than the cells but bold, so they still read as headers. |
| KPI values sized in `3vw` | 38px at 1280px but 11px on a phone, and they did not grow at all with browser zoom (1.00x at 500%) | `clamp(1.75rem, 1.5rem + 0.75vi, 2.25rem)`: 28 to 36px, scales with zoom and with the reader's default size. |
| All sizes in `px` | Ignored the reader's default font size | Every size is a `rem` token from a small scale (12, 14, 16, 28 and the KPI size). |
| Fixed 900px table and 260px KPI cards | Page was 924px wide at 320 and 375px, so it scrolled sideways on phones and at 400% zoom | KPIs are a wrapping grid (`auto-fit, minmax(min(100%, 14rem), 1fr)`). The table is fluid inside a labelled, keyboard-focusable region that scrolls on its own if needed; the page itself no longer scrolls sideways (measured 320px wide in a 320px viewport). |
| No line-height set | Browser default | Body 1.45, cells 1.3, heading 1.15. |

## Smaller fixes

- Table has a caption ("Services") and `scope` on header cells, so the region
  and every row are named for assistive technology.
- `text-align: start` and logical properties (`margin-block`,
  `border-block-end`, `inline-size`) instead of left/right and width, so the
  sheet survives a right-to-left edition; `dir="ltr"` is set on `<html>`.
- The update time is in a `<time datetime>` element.
- Spacing comes from a small set of tokens (4, 8, 12, 16, 24px in rem), and
  colours are tokens on `:root`, so later changes stay consistent.

## Checked

- Static lint of the fixed CSS and HTML: no findings.
- Rendered audit in Chromium (contrast, reflow at 320 and 375px, text
  spacing override, figure widths, alignment, truncation, size floor): no
  findings. The original page had 8 high-severity findings.
- Screenshots at 1280px and 320px (in `scratch/`).

## Not verified, or left for you

- Safari and Firefox rendering: only Chromium was available.
- The "Updated 14:05" line has no time zone. A shared ops dashboard should
  say which one (for example "14:05 UTC"); I did not guess it.
- The KPIs carry no comparison or threshold (is 0.41% normal?). That is a
  content decision, not a typesetting one.
