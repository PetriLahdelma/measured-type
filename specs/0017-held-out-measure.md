# Spec 0017: a held-out line length in another face

Status: pre-registered 30 October 2026, before any run. Results in
[`evals/results/0017/`](../evals/results/0017/).

## Question

In spec 0010 one sentence of advice did as well as the full skill on a
held-out zoom case. In spec 0008 the same sentence did worse than the skill
on line length (1.54 against 0.25 characters off the target), but only on
the development case, in Verdana at 66 characters. Does the skill beat the
sentence on a line-length case it has never seen, where knowing the rule is
not enough and the width has to be measured?

## The case: `h2h-measure-notes`

An essay page (`notes.html`, `notes.css`, selector `.essay p`) in Charter at
19px, asked for **about 62 characters per line** with the size kept at 19px.
Neither Charter, 19px nor 62 characters appears in any example in the skill
at `v1.3.0` (Charter appears only in `estimate-measure.js`'s calibration
table). In Charter the zero is 0.556em against an average character of
0.435em, so `62ch` renders at about 76 characters per line.

Graders ([`evals/h2h-grade.js`](../evals/h2h-grade.js), `gradeMeasureNotes`):
the paragraphs average 60 to 64 characters per full line at a 1440px window;
no sideways scroll at 375px; the paragraphs are still 19px. Validated before
commit: the untouched page (146.8) and `62ch` (75.7) fail the first grader;
`31em` (68.2) and `49ch` (59.1) fail it narrowly; `30em` with the text cut to
17px reaches 65.8 and fails the size grader; `measure-line.js --solve 62`'s
answer, `28.4em`, gives 62.01 and passes all three, on the paragraphs or on
`.essay`. Charter is a macOS system face, so the grades reproduce on macOS.

## Design

Claude Sonnet 5.5, ten runs per cell, every cell with the browser brief
([`evals/2x2/brief-browser.md`](../evals/2x2/brief-browser.md)), the same
prompts and cells as spec 0010:

| Cell | Skill | Hint |
|---|---|---|
| S | Measured Type at `v1.3.0`, with `node_modules` | no |
| N | none | no |
| H | none | the spec 0008 sentence, after the task |

Runs go in rounds of one per cell, in random folders; the graders do not
read the key.

## Analysis (fixed now)

[`evals/0017/analyze.js`](../evals/0017/analyze.js) prints each cell's
counts per grader, the mean distance from 62 characters, the range, tokens
and time, and:

- **Primary:** distance from 62 characters per line, S against N and S
  against H, exact two-sided permutation test. A run with no full lines to
  measure counts as 100 characters off.
- **Secondary:** runs meeting all three graders, S against N and S against
  H, two-sided Fisher exact test.

How it will be read: a primary p below 0.025 (0.05 split over the two primary
comparisons) in favour of S is a held-out gain for the skill; between 0.025
and 0.05 it is reported as not surviving the correction; above 0.05, no
detectable difference. The 60 to 64 band is narrower than the 60 to 72 band
of the development case on purpose: the prompt asks for a number, and the
question is how close each cell gets to it.
