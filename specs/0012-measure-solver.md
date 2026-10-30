# Spec 0012: solve for a line length

Status: accepted 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`scripts/test/solve.test.js`).

## Why

The tools could count the characters per line of a width, but not give the
width for a count. Asked for about 66 characters, agents guessed an `em`
value, measured and guessed again; in spec 0008 most runs given a hint
stopped at `34em` (63.7 characters in Verdana) instead of reaching 66. The
evals show that the skill wins where a tool computes the answer, so this adds
the inverse of both line-length tools.

## Requirements

- **M1** `estimate-measure.js <family> --target N` prints the `em` width (to
  0.1em) and its `px` value at `--size` whose estimate is N characters per
  line. The forward estimate of that width is within 1 character of N.
- **M2** For a family not in the calibration table it prints the range of
  widths across the table and, when a later family in the stack is known, the
  width for that fallback, instead of one number.
- **M3** `measure-line.js --solve N` sets `max-inline-size` on the measured
  elements in Chromium and searches for the `em` width (to 0.1em) whose
  rendered average is closest to N, and prints that width and the measured
  average. On Verdana at 17px, `--solve 66` lands within 1.5 characters of 66.
- **M4** When the container is narrower than the solved width, so the width
  cannot take effect, the result says so and gives the container's width.
- **M5** A malformed `--target` or `--solve` value exits 2 with a message.
- **M6** The MT-MEASURE-LONG fix and SKILL.md's measure workflow name
  `measure-line.js --solve` and `estimate-measure.js --target`.
