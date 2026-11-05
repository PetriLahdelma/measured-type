# Spec 0025: trust fixes from the 5 November review

Status: accepted 5 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/review.test.js`; R5 also changes the K1
test in `lite.test.js`, whose exit code it supersedes).

## Why

A product review on 5 November 2026 (a code review of every script, a
clone-to-first-audit walk with every tool exercised and a study of the field)
found six ways the tools contradict the skill's own promise, "never approve
what was not computed", and a first hour that fails on a current Python. A
tool that prints a confident wrong number, or approves a page it never saw,
is worse than no tool, because the skill tells the agent to trust it. Each
fault below was reproduced with a fixture before it was fixed; the fixtures
live under `scripts/test/audit/r25/`.

## Requirements

### The tools

- **R1** `measureLines` does not fail on an invalid `lang`. Grapheme
  segmentation needs no locale, so an attribute the platform rejects falls
  back to none. A page with `lang="en_US"` is audited to the end and reports
  MT-LANG; before, `page-audit.js` stopped with `RangeError: Invalid language
  tag: en_US`, exit 2 and no findings, on the very fault MT-LANG exists to
  report.
- **R2** `page-audit.js` reads the response status after navigation. A status
  of 400 or above is an error (exit 2) that names the status and the URL, and
  nothing is reported for that response. Before, a 404 was audited as the
  page asked for and approved with exit 0, in a tool offered as a pull-request
  gate.
- **R3** Where no ancestor paints an opaque ground, MT-CONTRAST measures
  against the canvas colour the browser paints for the page's colour scheme
  (the `Canvas` system colour, resolved under the root element), not an
  assumed white. Light text on a `color-scheme: dark` page with no painted
  background passes; `#999` text on an unpainted light page still fails at
  2.85:1. MT-WEIGHT-THIN reads the same ground. Before, the dark page was
  blocked for 1.25:1 against white, with a fix that would have made its text
  unreadable.
- **R4** `measureLines` treats every `inline-*` display (`inline-block`,
  `inline-flex`, `inline-grid`, `inline-table`) as part of the parent's line
  boxes, as it already treats `inline`, `ruby` and `contents`. Two paragraphs
  that differ only in an inline-block span around one word measure the same.
  Before, the span ended the line and the count fell from 75 to 57 characters
  per line, so a long measure could pass and `--solve` was skewed.
- **R5** When Playwright or its browser is missing and `--lite` was not asked
  for, `page-audit.js` still prints the lite report but exits 3, with the
  install command on stderr, so a gate that reads the exit code cannot pass on
  skipped rendered checks; a HIGH finding in the lite report still exits 1.
  `--lite` asked for keeps the exit code of its verdict. This supersedes spec
  0003 K1's exit 0 for the automatic fallback.
- **R6** `measure-line.js --css <file>` with a stylesheet that does not exist
  exits 2 with `no such file`. Before, it measured the browser's default face
  on the built-in sample, printed 198 characters per line and exited 0.
- **R7** When a selector matches elements of more than one computed font
  size, `measureLines` takes its size, box, `ch` and `em` figures from the
  elements that set the most full lines and reports every size it matched
  (`fontSizes`, `mixedSizes`); the CLI says which size the figures use and
  which others it saw. Before, "declared 13px" and "42.9em" came from a 13px
  kicker while seven 18px paragraphs set the count, and the README's own
  figure for the box was 31em.
- **R8** MT-TEXT-SPACING measures clipping per axis: an axis that scrolls
  (`overflow: auto` or `scroll`) loses nothing, so a pane with `overflow-y:
  auto` and `overflow-x: hidden` is not reported for its height. A box with
  `overflow: hidden` that clips more under the override still is. Before,
  stripe.com's scrolling content pane was a HIGH "2101px of text clipped".

### The environment and the gate

- **R9** The tests probe fontTools by importing what the scripts import
  (`from fontTools.ttLib import TTFont`), through one shared helper
  (`scripts/test/helpers.js`). A Python whose `fontTools` is an empty
  namespace directory (what is left of a virtual environment the system has
  purged) then skips with a reason instead of failing seven tests. The Python
  scripts print the import error they hit and the virtual-environment recipe,
  not a bare `pip install` that current Pythons refuse.
- **R10** `playwright` is a runtime dependency of the skill's package, so an
  install that omits development dependencies still measures, and both
  `package.json` files declare the Node they need (`engines.node`).
- **R11** The Python checks in `scripts/test/test_font_features.py` run under
  `npm test` with `MT_PYTHON`, skipping with a reason without it. Before, they
  ran only through `npm run test:fonts`, which neither `npm test` nor the gate
  called.
- **R12** AGENTS.md and CONTRIBUTING.md name the number of fontTools-backed
  tests that skip (seven, not four), and every skip reason for the missing test
  fonts reads `test fonts missing`.
- **R13** The README's Install section gives the virtual-environment recipe
  and names `MT_PYTHON`. It says that `npx playwright install chromium` is
  silent when the browser is cached and downloads about 150 MB when it is not.
  It also says how many tests an installed copy skips and why.

### The command lines

- **R14** `lint-css.js --help` (or `-h`) prints its usage and exits 0; an
  unknown `--flag` is an error (exit 2) that names it. Before, `--help` was
  read as a path and failed with `ENOENT`.
- **R15** `lint-css.js` on an HTML file names the stylesheets it did not open
  (`<link rel="stylesheet">`) under Not verified and points at
  `page-audit.js --lite`, which follows local ones. Before, a page whose
  stylesheet failed was approved without a word about the sheet.
- **R16** `type-scale.js` without `--fluid-from` keeps the body and the lower
  steps fixed and makes only the top two steps fluid, as rules.md §3.1.1 asks.
  Before, every step of the default scale was fluid and the body grew 1.866×
  at 200% zoom, against SKILL.md's "exactly 2×".
- **R17** `examples/editorial/after.css` lints clean: its `@font-face` rules
  carry `font-display: swap`.
