# Spec 0029: the corpus again, with the study's faults fixed

Pre-registered in [`specs/0029-study-faults.md`](../../../specs/0029-study-faults.md):
the faults spec 0028 found (F1 to F5) fixed test-first as U1 to U5, then the
whole frozen corpus of spec 0028 run again with the same runner, analysis and
spot-check draw, reported here beside [spec 0028's results](../0028/README.md)
and not merged into them. As there, no site is named; per-page reports stay out
of the repository until the owner decides.

## Two re-runs

The first re-run (tools at `3075ac7`, U1 to U5) found two faults in U5's own
probe, both added to the spec before the second run:

- **U7** the contrast ground missed layers drawn by `::before` and `::after`,
  which `elementsFromPoint` never returns. The navigation-bar case F5 was named
  for was such a layer, so it still measured 1.16:1 against grey on the real
  page while the fixture passed.
- **U8** the probe inserted a stylesheet for every text element, forcing two
  style recalculations of the page each time: the median page took 20 seconds
  against 17, long articles took up to four times as long and the corpus's
  largest page timed out at 600 seconds.

The second re-run (tools at `3ffa181`, U1 to U8) is the result below. The first
is kept with the per-page data and summarised where it differs.

## What changed, on the 97 pages audited in both runs

| | Spec 0028 | Spec 0029 | Pages gained | Pages lost |
|---|--:|--:|--:|--:|
| MT-TEXT-SPACING, overlap with the next block | 15 | 4 | 0 | 11 |
| MT-TEXT-SPACING, text clipped | 24 | 24 | 0 | 0 |
| MT-ZOOM-VW | 1 | 0 | 0 | 1 |
| MT-CONTRAST | 61 | 59 | 1 | 3 |
| Contrast over background images, not verified | 44 | 46 | | |
| MT-REFLOW | 30 | 30 | 0 | 0 |
| MT-MEASURE-LONG | 71 | 70 | 0 | 1 |
| Block | 79 | 76 | | |

- Every change sits in a rule a fix touched, in the direction the spec stated
  before the run, with one gain the spec allowed for: a page whose text reads
  against a layer that is not its ancestor now fails contrast where the ancestor
  chain had passed it. Contrast rows on the shared pages rose from 497 to 519, as
  grounds that had collapsed into one now separate.
- The two layers that moved from a ratio to "not verified" are gradients drawn by
  pseudo-elements, the Bootstrap-style case: the audit now says it cannot compute
  the ratio instead of printing a wrong one.
- No page failed for its report size; the two 700 KB reports that broke spec
  0028's JSON arrived whole (U2). The largest page took 59 seconds; the median page
  18 seconds against 17 before the fixes.
- Line length was not touched by any fix: the count is identical on 76 of 80
  pages and differs by more than a character on 2, which is the pages' content
  changing between runs.

## The corpus now

100 slots filled; three primary pages failed and were replaced (two rate limits,
one bot block that answered 403 this time but not in spec 0028).

| | All | Design system | Developer docs | Reading | Template |
|---|--:|--:|--:|--:|--:|
| Median characters per line | 78.0 | 76.2 | 82.3 | 75.3 | 78.0 |
| Pages over 75 characters per line | 49 of 83 | 11 of 19 | 15 of 23 | 12 of 24 | 11 of 17 |
| MT-CONTRAST | 59 | | | | |
| MT-REFLOW | 31 | | | | |
| MT-TEXT-SPACING | 27 | | | | |
| Text that cannot reach 2× at any zoom | 0 | 0 | 0 | 0 | 0 |
| Display type under 1.6× at 200% (house bar) | 24 | 6 | 5 | 6 | 7 |
| Block | 77 | 19 | 21 | 23 | 14 |

Spec 0028's headline findings stand: lines run long, with a median over 75 and
three in five measured pages past it; contrast fails on one element or more on
about three pages in five, and reflow at 320 CSS px on about one in three; no
page keeps text from reaching 200%.

## How often the tools were right

The same draw as spec 0028, on this run, re-measured with
[`evals/0028/spotcheck.js`](../../0028/spotcheck.js):

| Check | Drawn | Real | Spec 0028 |
|---|--:|--:|--:|
| MT-CONTRAST | 5 | 5 | 5 of 5, two with a wrong value |
| MT-REFLOW | 5 | 4, and 1 not re-measured (the page timed out on the check) | 5 of 5 |
| MT-TEXT-SPACING | 5 | 5, an overlap finding among them | 2 of 5, not reliable |
| MT-ZOOM-VW | 0 drawn: none left | | 0 of 1 |
| Line counts | 5 | 5 | 5 of 5 |

MT-TEXT-SPACING is no longer marked not reliable. Every drawn contrast row now
prints a pair that gives its ratio; one names the colour as written after it
(faded by opacity 0.8). The reflow finding the check could not reach was
confirmed in both earlier checks.

## Limits

As spec 0028: a hand-picked convenience sample, one browser, one afternoon,
pages as served to a headless Chromium. Five draws per rule bound a false rate
only roughly. The fixes were written after seeing spec 0028's drawn findings, so
this run shows that those findings are gone and that nothing else moved; it is
not a held-out test of the fixed tools.
