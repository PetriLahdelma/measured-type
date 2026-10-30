# Spec 0020: strict baseline grid, opt-in

Status: accepted 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/baseline.test.js`).

## Why

James Wilson pointed an agent at a short article on setting text on a
baseline grid with the CSS `cap` unit (maketypework.com, "Web typography:
baseline grids made easy") and it got the result close to right. The skill
already spaces blocks in whole body lines (rules.md 2.2.2), which keeps the
rhythm but does not put the text on baselines. Some designs want the strict
version. Whether text lands on the grid depends on the font that actually
loads, its cap height and the line-height each element ends up with, so a
linter reading the source cannot tell. The rendered audit can.

A probe in Chromium on macOS with Georgia, an 8px grid and the `cap` shift on
every block put each first baseline within 0.9px of the grid: the shift
centres the cap height, while the browser centres the font's whole content
area, so a fraction of a pixel stays. The tolerance is 1px for that reason.

## Requirements

- **B1** With a grid unit (`--baseline 8px` or `0.5rem` on the command line,
  `{ baseline }` from code), the audit finds the first and last baseline of
  every visible text block and reports MT-BASELINE-DRIFT (MEDIUM)
  for a block whose baseline is more than 1px off the grid. A page set with
  the `cap` shift and line heights in whole grid units has no finding.
- **B2** The grid's origin is not asked for. The audit takes the offset that
  most baselines share (distance measured around the grid, so -0.5px and
  7.5px on an 8px grid are the same place) and measures drift from it.
- **B3** When a block's line-height is not a whole number of grid units, its
  finding names the line-height as the cause. A block pushed off the grid
  only by something above it has a whole line-height, and its finding does
  not blame it.
- **B4** The check runs only when asked. Without a grid unit no baseline
  finding appears, and with one every other finding is the same as without
  it: the markers used to find baselines are removed at once.
- **B5** A grid unit that is not a positive length in `px` or `rem` is an
  error, not a silent pass.
- **B6** The grid unit can be a custom property (`--baseline --u`). The
  audit resolves it as the page computes it, on the checked region and at
  each width, so a unit that changes at a breakpoint, grows fluidly with
  `clamp()` or differs per region is checked against what the reader gets.
- **B7** The check runs at 1280, 768 and 375px, and a finding names the
  widths where the block drifts.
- **B8** `--baseline-scope <selector>` limits the check to one region, so a
  page can keep its article on a grid while navigation and components are
  set freely. Without it the region is `main`, or `body` when there is no
  `main`. A scope that matches nothing is listed under Not verified; a
  selector the browser cannot parse is an error.
- **B9** `--baseline-tolerance <px>` replaces the 1px default; it must be a
  positive length in `px`.

James asked for more flexibility than the article's system, which fixes one
`rem` unit for the whole page. B6 to B9 answer that: the grid can be any
length the CSS defines, per region and per breakpoint, held as strictly as
the design wants.


Images and embeds of unknown height (they break any strict grid; the recipe
says so), and baselines inside form controls and tables.
