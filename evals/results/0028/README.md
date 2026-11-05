# Spec 0028: 100 public pages measured

Pre-registered in [`specs/0028-corpus-study.md`](../../../specs/0028-corpus-study.md)
(commit `7dbcac7`), with the frozen corpus, the runner, the analysis and the
spot-check draw, before any page was audited. Run on 5 November 2026 with
Measured Type `v1.5.0` in Chromium, three pages at a time, a median of 17
seconds a page.

Four categories of 25: design systems (each system's own typography page
where it has one), developer docs, long-lived articles and essays, and live
template demos. **The corpus is a hand-picked convenience sample of
well-known pages; nothing here describes the web at large.** As
pre-registered, this write-up names no site and ranks none. The per-page
reports and the spot-check list name public sites, so they are kept out of the
repository until the owner decides whether to publish them.

Four primary pages failed and were replaced by reserves, as the spec says: two
answered 429 (rate limited), and two very large pages (about 700 KB of report
each) failed because `page-audit.js --json` cut its output short through a pipe
(fault F2 below). All 100 slots were filled.

## How often the tools were right

Drawn by hash before the run, five findings per rule (one only for
MT-ZOOM-VW, which appeared once) and five line counts, each re-measured on the
live page with [`evals/0028/spotcheck.js`](../../0028/spotcheck.js), code that
shares no measuring helper with the tools.

| Check | Drawn | The finding is real | Notes |
|---|--:|--:|---|
| MT-CONTRAST | 5 | 5 | Every drawn text fails on the ground the reader sees. Two of the five report a wrong value (F4, F5) |
| MT-REFLOW | 5 | 5 | From 2px to 460px past a 320px viewport |
| MT-TEXT-SPACING | 5 | 2 | Both "text clipped" findings are real; all three "overlaps the next block" findings are not (F3) |
| MT-ZOOM-VW | 1 | 0 | The text reached 2.00× at 200% zoom; the check looked only at 500% (F1) |
| Line counts | 5 | 5 | Within one character of an independent word-position count |

Under the rule fixed before the run (two or more false of five), **MT-TEXT-SPACING
is marked not reliable**: its overall count is not a claim. Its "clipped"
branch, which held in both draws, is reported separately below as an
exploratory figure. Five checks bound a false rate only roughly; the rules not
drawn (everything below MEDIUM, and the MEDIUM rules other than measure) are
reported as what the tools printed, not as verified.

## Line length

On the 83 pages whose reading text set at least three full lines at 1280px
(the selector `main p, article p, [role=main] p`, else `p`):

| Category | Pages measured | Median characters per line | Under 45 | 45 to 75 | Over 75 |
|---|--:|--:|--:|--:|--:|
| All | 83 | 78.7 | 7 | 25 | 51 |
| Design system | 19 | 80.8 | 1 | 6 | 12 |
| Developer docs | 23 | 82.3 | 2 | 6 | 15 |
| Reading | 24 | 76.0 | 1 | 10 | 13 |
| Template | 17 | 78.0 | 3 | 3 | 11 |

Six in ten measured pages set lines longer than 75 characters, and fewer than
a third sit inside the 45 to 75 band. The band is Bringhurst's, not a
standard; WCAG 1.4.8, at AAA, caps lines at 80. The design system pages are
mostly their own typography guidance, and two thirds of them run past 75. The
17 pages without three full lines are landing pages, dashboards and short
indexes; one docs page's selector matched short interface paragraphs (9.8
characters a line, confirmed by the recount), which is a limit of the study's
selector, not of the counter.

## Contrast, reflow and zoom

| Finding | Pages | Design system | Developer docs | Reading | Template |
|---|--:|--:|--:|--:|--:|
| Text under 4.5:1 (3:1 large), MT-CONTRAST | 63 | 10 | 21 | 19 | 13 |
| Sideways scroll or cut text at 320 CSS px, MT-REFLOW | 30 | 10 | 5 | 10 | 5 |
| Text clipped under the 1.4.12 spacing override (exploratory) | 24 | | | | |
| Display type under 1.6× at 200% zoom (house bar) | 24 | 6 | 5 | 6 | 7 |
| Text that cannot reach 2× at any zoom, MT-ZOOM-VW | 0 | | | | |

- **Contrast** fails on one element or more on 63 of the 100 pages. One element
  is enough to count, and the drawn ones were a permalink mark, a search
  placeholder, a footer link and two in-text links, so the count says how
  common one miss is, not how bad a page reads. A further 45 pages had text over
  background images, which the audit lists as not verified rather than passing.
- **Reflow** fails on 30 pages at 320 CSS px, the width of 400% zoom on a 1280px
  window, by 2px on one page and by 300 to 500px on most.
- **Zoom**: no page in the corpus has text that cannot reach 200%; the one page
  the tool reported was its own fault. 24 pages have a heading under this
  project's 1.6× bar on a 1280px window, a median of 1.40× among them; WCAG sets
  no such bar.

## Verdicts and every rule

| Category | Block | Approve, with work left | Approve |
|---|--:|--:|--:|
| All | 81 | 15 | 4 |
| Design system | 19 | 5 | 1 |
| Developer docs | 22 | 3 | 0 |
| Reading | 24 | 1 | 0 |
| Template | 16 | 6 | 3 |

Two of the 81 Block verdicts rest only on the faulty outputs (F1, F3); without
them, 79. A Block means the tool found a HIGH finding on one page in Chromium;
it is not a WCAG conformance result.

Pages with at least one finding, as the tools printed them (unverified except
the rules in the spot-check):

| Rule | Pages | Rule | Pages |
|---|--:|---|--:|
| MT-MEASURE-LONG | 74 | MT-CAPS-TRACKING | 29 |
| MT-CONTRAST | 63 | MT-FONT-DISPLAY | 28 |
| MT-QUOTES | 63 | MT-HEADING-RUNT | 28 |
| MT-ICON-ALIGN | 46 | MT-CODE-XHEIGHT | 27 |
| MT-HEADING-SPACE | 46 | MT-ZOOM-GROWTH | 24 |
| MT-SIZE-FLOOR | 43 | MT-PUNCT | 19 |
| MT-SIZE-COUNT | 39 | MT-HEADING-ORDER | 18 |
| MT-TEXT-SPACING | 36 | MT-TRUNCATE | 15 |
| MT-CONFUSABLE | 33 | MT-RANGE | 14 |
| MT-FONT-SWAP | 31 | MT-FAMILY-COUNT | 12 |
| MT-MEASURE-SHORT | 30 | MT-WEIGHT-THIN | 12 |
| MT-REFLOW | 30 | MT-ITALIC-SYNTH | 10 |
| MT-UI-SIZE | 29 | MT-NUM-ALIGN, MT-PAIR-XHEIGHT, MT-FONT-FALLBACK | 6 each |

Rarer: MT-TABULAR and MT-MINUS 4, MT-NUM-BREAK, MT-LANG and MT-BOLD-SYNTH 3,
MT-CODE-BOX 2, MT-ZOOM-VW 1. MT-TABULAR and MT-NUM-ALIGN count against all
pages, most of which have no number column.

## Tool faults the run found

The tools were not changed during the run. Each fault goes to a later spec,
with its re-run reported separately.

- **F1** MT-ZOOM-VW reports text whose growth falls short at 500% zoom even when
  it reached 2× at 200%, which is what WCAG 1.4.4 asks for. It should report
  only text that reaches 2× at no zoom level.
- **F2** `page-audit.js --json` exits before standard output drains, so a report
  over the pipe buffer (here about 700 KB) arrives cut short when piped, as in
  CI. Written to a file it is complete.
- **F3** MT-TEXT-SPACING's "overlaps the next block" branch takes the next
  sibling's top edge without checking that the sibling sits below the box or
  that any text meets: 0 of 3 drawn were real. The "clipped" branch held.
- **F4** MT-CONTRAST prints the text colour before `opacity` while the ratio uses
  the faded colour, so the printed pair does not give the printed ratio.
- **F5** MT-CONTRAST takes the ground from the text's ancestors only. A ground
  painted by another element (here a navigation bar's layer) gives a wrong ratio;
  the drawn case still failed, but the same blind spot could pass a failing text.

## Limits

One run, one browser, one window width for line length, three pages at a time,
pages as served to a headless Chromium on one afternoon (consent banners and
bot checks included). Four hosts were audited during earlier work on the tools
and are in the corpus. The 1.6× zoom bar and the 16px reading floor are this
project's conventions. Reproduce with `node evals/0028/run.js --out <folder>`,
then `node evals/0028/analyze.js <folder>` and
`NODE_PATH=skills/measured-type/node_modules node evals/0028/spotcheck.js <folder>`.
