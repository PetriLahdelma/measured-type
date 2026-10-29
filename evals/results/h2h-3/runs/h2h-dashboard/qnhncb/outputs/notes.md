# Dashboard fixes

Files: `dashboard.fixed.css` and `dashboard.fixed.html` (markup had to change; it links the fixed stylesheet). `dashboard.html` and `dashboard.css` are untouched.

The original failed 8 high-severity rendered checks (contrast, reflow at 320 and 375px, clipped text under text-spacing overrides) plus several scanning problems. The fixed page has none in the source lint or the rendered audit (Chromium only; Safari and Firefox not checked).

## What changed and why

**Status was colour only.** The Status cell held an empty dot, so it carried no word for screen readers and nothing for colour-blind readers. Each row now shows the dot plus a word (Healthy, Degraded, Down); the dot is `aria-hidden`. The words are my reading of green, amber and red, so confirm the labels. Dot colours were darkened to reach about 3:1 or better against white.

**Numbers did not line up.** Requests, Errors and p95 were left-aligned in a proportional font, so place values drifted (1 and 0 differed 27% in width). Those columns and their headers are now right-aligned with `lining-nums tabular-nums`; KPI values use tabular figures too.

**Digit groups and units could break across lines.** "1 184 220" and "118 ms" used ordinary spaces and could split at narrow widths. They now use non-breaking spaces (narrow no-break space for digit groups, no-break space for units and the date), and number cells and KPI values are `nowrap`.

**Low-contrast grey text.** Labels, headers, timestamp and footer were 2.2 to 3.5:1. All now use `#595959` (about 7:1).

**Tiny text.** 10 and 11px text became 0.75rem (12px). All sizes are in `rem` so user font settings and zoom apply; the 14px body became 0.875rem.

**Uppercase labels were untracked.** Eyebrow, table headers and KPI labels now have `letter-spacing: 0.06em` and weight 600 so they read as labels, not data.

**KPI values used `3vw`.** That could not grow under browser zoom and was tiny on phones. Now `clamp(1.75rem, 1.4rem + 1vi, 2.25rem)`, with a `rem` term so zoom works. Tiles use an auto-fit grid instead of fixed 260px flex boxes, so they wrap instead of overflowing.

**Fixed 900px table broke small screens.** The page was 924px wide at 320 and 375px. The table is now `inline-size: 100%` inside a focusable, labelled scroll wrapper (`overflow-x: auto`), so any scrolling stays inside the table box.

**Service names were silently cut off.** "Authentication gateway for partner accounts" was truncated with an ellipsis and clipped further under text-spacing overrides. Names now wrap in full.

**Smaller fixes.** Header cells have `scope="col"`; row borders lightened with a stronger rule under the header for scanning; cell padding and line-height (1.4) set for one-line cells; logical properties (`text-align: start`, `inline-size`) replace physical ones; `.foot` capped at 60ch.

## Not changed

Data values, column order and the page copy. No description of the "Errors" column was added; an error rate per service might help scanning but needs a decision on how to compute it.

## Verification

Source lint: no findings except an informational note on `60ch` for the footer. Rendered audit (reflow at 320 and 375px, contrast, text-spacing override, tabular figures, alignment, truncation, size floor): no findings.
