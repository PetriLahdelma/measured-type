# Spec 0029: the tool faults the 100-page study found

Status: accepted 5 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/faults.test.js`, fixtures in
`scripts/test/audit/r29/`). The re-run (U6) is pre-registered here, before the
fixed tools touch the corpus.

## Why

Spec 0028 ran the tools on 100 public pages and re-measured a drawn sample of
their findings with independent code. Five faults surfaced (F1 to F5 in
`evals/results/0028/README.md`), and the study froze the tools rather than fix
them mid-run. Each is reproduced below with a local fixture before it is fixed.

## Requirements

- **U1** (F1) MT-ZOOM-VW reports text only when it reaches 2× at no zoom level
  checked. Text that doubles at 200% zoom and is set smaller by a narrow-screen
  rule at 500% passes, because WCAG 1.4.4 asks that text can reach 200%; text
  sized in `vw` alone is still reported. Before, a 54px label that grew 2.00× at
  200% was HIGH because it grew 1.67× at 500%.
- **U2** (F2) `lint-css.js` and `page-audit.js` wait for standard output to
  drain before they exit, so a report larger than the pipe buffer arrives whole
  through a pipe. Before, piped reports were cut at about 64 KB; two corpus
  pages failed because their 700 KB reports arrived as invalid JSON.
- **U3** (F3) The "overlaps the next block" branch of MT-TEXT-SPACING reports a
  box only when text that runs past its bottom edge meets text of the next
  block. A block that stands beside it (a flex or grid neighbour) is not
  overlapped. Before, the branch subtracted the neighbour's top edge from the
  spilled height, and 0 of the 3 drawn findings were real.
- **U4** (F4) The pair MT-CONTRAST prints is the colour the reader sees: the
  text colour with its transparency and any `opacity` above it applied, on the
  ground. The printed pair gives the printed ratio, and the colour as written
  is named after it when the two differ. Before, the pair showed the colour
  before opacity beside the ratio after it.
- **U5** (F5) MT-CONTRAST takes the ground from what is painted under the text
  at its position (`document.elementsFromPoint`, with pointer events enabled for
  the probe), including layers that are not the text's ancestors, such as a
  navigation bar drawn by a positioned sibling. Where the text cannot be located
  on screen, the ancestor chain is used as before. Before, a faint placeholder on
  a purple bar was measured against white, 1.16:1, where the reader sees 3.80:1.

Added the same day, after the first re-run (U6) found two more faults, both
in U5's probe:

- **U7** A `::before` or `::after` layer that covers its element is part of the
  ground, between the element's background and its content; `elementsFromPoint`
  never returns pseudo-elements. A covering gradient makes the contrast not
  verified, never a ratio against the wrong ground. Before, a placeholder on a
  navigation bar drawn by a gradient `::after` was still measured at 1.16:1
  against white grey, on the real page as on the fixture.
- **U8** The pointer-events probe stylesheet goes in once per contrast pass, not
  once per text element. Per element it forced two style recalculations of the
  page each time: a 2,500-paragraph page took 37 seconds against 25 before
  spec 0029, and the corpus's largest page timed out.

## The re-run (U6), fixed now

- The whole frozen corpus of spec 0028 (`evals/0028/corpus.json`), primaries and
  reserves in the same order and the same replacement rule, is run again with the
  tools at the commit that ships U1 to U8 (the first re-run, with U1 to U5 only,
  is reported as such and is what found U7 and U8), by `evals/0028/run.js`. Every page is
  re-run, not only those with findings, because U5 can turn a pass into a fail as
  well as the reverse.
- The same analysis and the same spot-check draw (`evals/0028/analyze.js`,
  `evals/0028/spotcheck.js`) are applied to the new run. Results go to
  `evals/results/0029/`, reported beside spec 0028's and not merged into them.
- Expected direction, stated so it can fail: MT-ZOOM-VW falls to 0 pages,
  MT-TEXT-SPACING's overlap findings fall, MT-CONTRAST changes on few pages, no
  page fails for its report size and line length is unchanged (no requirement
  touches it). A spot-check rule with two or more false findings of five is again
  marked not reliable.
- The same publication rule as spec 0028: no site named in the write-up;
  per-page reports stay out of the repository until the owner decides.
