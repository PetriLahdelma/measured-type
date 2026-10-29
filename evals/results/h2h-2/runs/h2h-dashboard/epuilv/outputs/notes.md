# Service health dashboard: what changed and why

Outputs: `dashboard.fixed.css` and `dashboard.fixed.html` (which links the new
stylesheet). The original `dashboard.html` and `dashboard.css` are untouched.
The markup had to change because status was shown by colour alone and the
table could not be made to reflow without a wrapper.

## Why people misread it

1. **Status was colour only.** Each service's state was an 8px coloured dot
   with no word and no accessible name. Red and green dots look the same to
   roughly one man in twelve, and a screen reader announced nothing at all.
2. **Number columns did not line up.** The digits were proportional (a 1 is
   about 27% narrower than a 0 in this face) and the cells were left-aligned,
   so `80 011` and `411 108` started at the same edge and their place values
   were offset. Comparing down a column meant reading every value.
3. **Labels were too faint and too small.** Grey labels, the timestamp and
   the footnote measured 2.2:1 to 3.5:1 contrast (4.5:1 is the minimum), at
   10 to 11px.
4. **Service names were cut off.** "Authentication gateway for partner
   accounts" was clipped to 160px with an ellipsis and no way to read the rest.
5. **"P95" instead of "p95".** Uppercasing the column heads and KPI labels
   rewrote "p95" as "P95". Capitals with no tracking also ran together.
6. **The KPI figures ignored zoom.** They were sized in `3vw`, so they stayed
   the same size at 200% or even 500% browser zoom, while the rest of the page
   grew around them.
7. **Phones scrolled sideways.** The table was a fixed 900px and the KPI cards
   a fixed 260px each: at 375px the page was 924px wide.

## What changed

### Markup (`dashboard.fixed.html`)
- Status cells now hold a word plus the dot: **Healthy**, **Degraded**,
  **Down**. The dot is decorative (`aria-hidden`).
- Rows that need attention get a class (`is-warn`, `is-down`) so the stylesheet
  can mark them at the start edge. That mark comes on top of the word, never
  instead of it.
- Service names are row headers (`<th scope="row">`) and the column heads
  have `scope="col"`, so assistive technology reads each figure with its
  service and metric.
- Number cells and their headers carry `class="num"`.
- The table sits in a labelled, focusable scroll region (`role="region"`,
  `tabindex="0"`) with a caption, "Services". A wide table can scroll inside
  its own box while the page itself reflows.
- Digit groups use a narrow no-break space (`1 184 220`, `411 108`), so a
  number can never break across lines. `118 ms`, `60 seconds` and the date use
  a no-break space for the same reason. The unit "ms" is wrapped so it can be
  set smaller than the figure.
- The timestamp is a `<time datetime>` element; `dir="ltr"` is set on `<html>`.

### Stylesheet (`dashboard.fixed.css`)
- **Sizes in rem, few of them.** The sizes are 13px labels and small text,
  14px cells, 16px caption, 24px title and fluid KPI figures. The KPI figures
  use `clamp(1.75rem, 1.5rem + 1vi, 2.25rem)` (28 to 36px); because of the rem
  term they keep growing with zoom.
- **Figures.** `font-variant-numeric: lining-nums tabular-nums` on the KPI
  values, the timestamp and every number cell, so digits occupy equal widths
  and a value that refreshes every 60 seconds does not jitter. The number
  columns and their headers are aligned at the end (`text-align: end`), so
  units, tens and thousands sit in vertical lines.
- **Labels.** Column heads and KPI labels are sentence case, 13px, weight 600,
  in `#555`. That is 7:1 contrast on the page and 7.5:1 on the white cards.
  Sentence case keeps "p95" correct, and lowercase words scan faster than
  capitals. Only the one-word "Operations" eyebrow stays in capitals, tracked
  at 0.06em so the letters do not clump.
- **Status badges.** Each badge is a pill with dark text on its own pale tint:
  green `#1b5e20`, amber `#6b4500`, red `#a31515`. Every pair passes 4.5:1 for
  its text. The dot takes the text colour.
- **Attention rows.** Degraded and down rows get a 3px bar at the start edge
  (amber and red) and the down row a faint tint, so problem rows stand out
  before anyone reads the status column. Right-to-left pages get the bar on
  the other side.
- **No truncation.** Service names wrap within a 10 to 20rem column instead of
  being cut off. Number and status cells do not wrap.
- **Reflow.** The KPI cards flex and wrap (`flex: 1 1 12rem`). The table is
  `inline-size: 100%` inside a `max-inline-size: 60rem` scroll wrapper, and
  the KPI row shares the same maximum, so the two blocks line up.
- **Rhythm.** Spacing comes from one scale (4, 8, 12, 16 and 24px, in rem).
  Cell leading is 1.3, which suits single-line data. Body leading is 1.4.
- **Logical properties throughout** (`border-block-end`, `margin-block`,
  `text-align: start`/`end`, `inline-size`), so a right-to-left edition needs
  no rewrite.
- The footnote is 13px in `#555` and capped at 40em so it reads as one
  comfortable line or two.

## Verified

- Static lint of both new files: no findings. On the original it found the
  `vw` font size, the px body size, untracked capitals and physical
  alignment.
- Rendered audit in Chromium of `dashboard.fixed.html`: no findings for
  contrast, reflow at 320 and 375px, text spacing override, tabular figures,
  number alignment, truncation, zoom or minimum size. The original failed 9
  checks at high severity (contrast, reflow, clipped text).
- Screenshots at 1280px and 375px: no horizontal page scroll at either width
  (`scrollWidth` equals the viewport). At 375px the table scrolls inside its
  own box.

## Not verified

- Safari and Firefox rendering; only Chromium was available.
- Whether `system-ui` has true tabular figures on every platform. It does on
  the macOS face measured here. On a platform whose system face lacks them,
  the CSS has no effect and the column would need a different face.
- The status wording (Healthy, Degraded, Down) is my reading of the original
  `ok`, `warn` and `down` classes. Rename the labels if the team uses other
  terms.
