# Spec 0005: standards alignment and robustness

Status: accepted, 29 October 2026. The P1 items of the second council review.
Each requirement has an ID; the test that proves it carries the same ID in its
name (`scripts/test/p1.test.js`, plus updated assertions where an existing
test encoded the old behaviour).

## S. Standards

- **S1 Truncation.** A cut that appears only at 200% zoom is MT-TRUNCATE
  HIGH, since `product-ui.md` names it a WCAG 1.4.4 failure and `audit.md`
  makes standard failures HIGH. Only a recovery a sighted keyboard, touch or
  zoom user can reach counts: a `<details>` disclosure or a control with
  `aria-expanded` or `aria-controls` in the same row. `title`, `aria-label`
  and `aria-describedby` no longer exempt the cut; at 1280px it stays LOW and
  the message says why `title` is not enough. `text-overflow: clip` on
  `nowrap` text with hidden overflow is a cut too.
- **S2 Root size in px** (MT-ROOT-PX) is MEDIUM, not HIGH: no WCAG criterion
  requires honouring the reader's default size and zoom still works, so by
  `audit.md` it is a convention.
- **S3 APCA is advisory.** `screen-and-ui.md` and SKILL.md say that the WCAG 2
  ratio governs conformance and APCA Lc is advisory; MT-WEIGHT-THIN prints
  "APCA Lc N (advisory)".
- **S4 Trim against the grid.** SKILL.md no longer puts
  `text-box: trim-both` in the same row as whole-line intervals; `rules.md`
  says the two are alternatives (trimming moves the next block off the grid
  by the trimmed amount).

## R. Robustness

- **R1 One comment tokenizer** for SCSS and Less handles block comments that
  contain apostrophes and `//`, strings and unquoted `url(//...)` together.
- **R2 Caps tracking.** The linter does not flag `text-transform: uppercase`
  when another rule for the same selector in the same file sets
  `letter-spacing`; the Tailwind check accepts `tracking-wider`,
  `tracking-widest` and arbitrary values but not `tracking-wide` (0.025em, under
  the 5% floor), and suggests `tracking-wider`. The rendered check flags
  capitals tracked at less than 0.03em, not only at 0.
- **R3 `--diff`.** A file git does not track counts as wholly changed; a
  finding counts when any line of its declaration changed; `--diff` with no
  ref is a usage error (exit 2).
- **R4 Arguments.** `type-scale.js` rejects non-numeric `--steps`, `--ratio`,
  `--viewports` and `--fluid-from` and a `--base` whose two sides mix units;
  `estimate-measure.js` rejects `--size` without a number; `page-audit.js`
  rejects unknown flags; `measure-line.js` exits 2, not 1, on a missing page,
  a selector that matches nothing or a bad `--width`. Exit 1 stays reserved
  for a Block verdict or a failing scale.

## T. Tests that pin behaviour

- **T1** MT-TABULAR is pinned between its 2% threshold and a much looser one:
  a cell whose 1 and 0 differ by about 10% is flagged.
- **T2** MT-NUM-ALIGN is pinned at "half the cells": a column with one
  start-aligned cell of three is not flagged, a column with two is.
- **T3** The estimate calibration test skips, with a reason, when fewer than
  ten calibration faces are installed (Linux, Windows), instead of failing.
