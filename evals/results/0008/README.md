# Spec 0008: a one-sentence hint, ten runs per cell

Pre-registered in [`specs/0008-hint-and-power.md`](../../../specs/0008-hint-and-power.md)
(commit `33ba169`, tag `content-freeze-7`) with its analysis script
[`evals/0008/analyze.js`](../../0008/analyze.js), before any run. Claude
Sonnet 5.5, 80 runs on 30 October 2026: five more runs in each 2×2 cell (A to
D) on both cases, and two new cells without the skill that get one sentence of
advice after the task:

| Cell | Skill | Browser | Hint |
|---|---|---|---|
| E | none | the brief offers Playwright | yes |
| F | none | the brief forbids launching any browser | yes |

> Hint: `ch` is the width of the digit zero, wider than an average letter in
> most faces, so set a measure by counting characters, and a fluid font size
> loses growth under browser zoom because its viewport term does not scale,
> so check that it still grows at least 1.6× at 200% zoom on a 1280px window.

Same cases, graders, briefs and skill copy as the 2×2
([`../2x2/`](../2x2/)). The analysis pools the 2×2 runs with these, so A to
D have ten runs each. Reproduce with
`node evals/0008/analyze.js evals/results/2x2 evals/results/0008`.

The third part of the spec, other models, did not run: no non-Claude model
was reachable from this machine on 30 October (the Codex CLI was out of credit
until 4 November). It stays untested.

## Result

**`h2h-measure-ideal`**: distance of the rendered characters per line at
1280px from 66, lower is better. Every run in every cell passed all three
graders.

| Cell | Runs | Mean | Median | Range |
|---|--:|--:|--:|---|
| A: skill, browser | 10 | 0.25 | 0.10 | 0.00 to 1.10 |
| B: skill, no browser | 10 | 1.20 | 1.20 | 1.20 to 1.20 |
| C: no skill, browser | 10 | 0.68 | 0.40 | 0.40 to 1.40 |
| D: no skill, no browser | 10 | 2.19 | 2.60 | 0.40 to 3.50 |
| E: hint, browser | 10 | 1.54 | 1.20 | 0.40 to 2.30 |
| F: hint, no browser | 10 | 2.29 | 2.30 | 0.40 to 3.50 |

**`h2h-zoom-hero`**: growth of the heading at 200% zoom on a 1280px window,
higher is better, and each grader's pass count.

| Cell | Runs | Mean growth | Range | 2× by 500% | 1.6× at 200% | Requested sizes | All three |
|---|--:|--:|---|--:|--:|--:|--:|
| A: skill, browser | 10 | 1.50× | 1.44× to 1.61× | 10 | 1 | 10 | 1 |
| B: skill, no browser | 10 | 1.50× | 1.43× to 1.55× | 10 | 0 | 10 | 0 |
| C: no skill, browser | 10 | 1.43× | 1.43× to 1.43× | 10 | 0 | 10 | 0 |
| D: no skill, no browser | 10 | 1.44× | 1.43× to 1.47× | 10 | 0 | 10 | 0 |
| E: hint, browser | 10 | 1.63× | 1.61× to 1.67× | 10 | 10 | 2 | 2 |
| F: hint, no browser | 10 | 1.64× | 1.61× to 1.67× | 10 | 10 | 4 | 4 |

"Requested sizes" is 32 to 48px at a 360px viewport and 60 to 84px at 1440px,
the task's 40 and 72px within 20%.

**Comparisons** (difference of means, exact two-sided permutation test over
all 184,756 splits; the smallest p such a test can give is about 0.00001):

| Comparison | Measure (characters off 66) | Hero (growth) |
|---|---|---|
| E − A, primary: hint against the full skill, browser | +1.29, p = 0.0001 | +0.135, p < 0.0001 |
| F − B, primary: hint against the lite skill, no browser | +1.09, p = 0.0001 | +0.133, p < 0.0001 |
| E − C: hint against nothing, browser | +0.86, p = 0.005 | +0.205, p < 0.0001 |
| F − D: hint against nothing, no browser | +0.10, p = 0.85 | +0.199, p < 0.0001 |
| A − C: skill against nothing, browser | −0.43, p = 0.031 | +0.070, p < 0.0001 |
| B − D: skill against nothing, no browser | −0.99, p = 0.010 | +0.066, p = 0.002 |

On the measure a positive difference means farther from 66 (worse); on the
hero it means more growth (better on the primary metric).

## Cost per cell

| Case | A | B | C | D | E | F |
|---|--:|--:|--:|--:|--:|--:|
| Measure, mean tokens | 126k | 125k | 118k | 117k | 120k | 117k |
| Measure, median time | 44 s | 40 s | 45 s | 35 s | 54 s | 38 s |
| Hero, mean tokens | 132k | 130k | 116k | 116k | 119k | 117k |
| Hero, median time | 67 s | 54 s | 31 s | 25 s | 54 s | 36 s |

Times are medians because one B hero run (`atiigc`) waited on a background
process of its own after it had saved its file and logged 175 s.

## What happened

- **Hero, with the hint:** every one of the 20 runs aimed at the 1.6× bar and
  reached it (1.61× to 1.67×). Fourteen did it by slowing the ramp so that
  72px arrives only at about 2150 to 2575px, which leaves the heading at 55.6
  to 59.6px on a 1440px desktop and fails the requested sizes. Six kept both:
  a steep ramp that reaches 72px by about 820px (2), two slopes joined with
  `min()` (1) and a gentler ramp starting at 42 to 44px on phones that just
  reaches 60.5 to 62.8px at 1440px (3).
- **Hero, with the skill:** as in the 2×2, the runs kept the requested sizes
  and gave up some growth: one of 20 cleared 1.6×. Several said the 40 to
  72px range is wider than the skill recommends and left it.
- **Hero, with nothing:** 17 of 20 wrote `clamp(2.5rem, 1.8rem + 3vw, 4.5rem)`
  (1.43×); the other three ended the ramp at 1440px or 1600px with slightly
  different numbers.
- **Measure, with the hint:** most runs set `34em` or `34.5em` (63.7 or 64.8
  characters), in E after counting in a browser and in F from an estimate.
  In F, two runs landed at 68.6 (`36em`), one at 66.4 and one at 62.5
  (`33em`). Without the hint, C runs set `54ch`, `55ch`, `34.5em` or `35em`
  after measuring (64.6 to 66.4), and A runs `34.7em` to `35.2em` (64.9 to
  66.4).

## What this says

Read under the rules fixed before the runs:

- **Fluid type under zoom: one sentence beat the skill on the primary metric**
  (p < 0.0001 with and without a browser). The skill is not shown to add
  anything over the sentence on this case. The sentence names the 1.6× bar,
  and the runs that had it treated the bar as the goal: 14 of 20 traded the
  72px the task asked for to reach it. Counting runs that met every grader,
  the hint did better too (6 of 20 against 1 of 20 for the skill), but most
  runs in every cell met at most two of the three. The 1.6× bar is this
  project's own convention, and the request for 72px on a large desktop pulls
  against it; neither the skill nor the sentence made a model reliably honour
  both.
- **Line length: the skill beat the sentence** (p = 0.0001 with and without a
  browser). The skill adds something beyond the sentence here: with a browser
  its runs landed within a quarter of a character of 66 on average, and
  without one its estimator put every run at 1.2 off. With a browser the hint
  runs did worse than runs with no advice at all (p = 0.005), mostly by
  settling on `34em`. All of these differences are one or two characters per
  line, and every run in every cell passed the graded band of 60 to 72.
- **Ten runs per cell:** the 2×2's skill effects on the hero hold (p < 0.0001
  with a browser, p = 0.002 without). On the measure with a browser the skill
  now shows a small detectable advantage (0.43 characters, p = 0.031); with
  five runs it did not (p = 0.52). That comparison is secondary, and at
  p = 0.031 it does not survive a Bonferroni correction for the six
  comparisons in the table.

## Limits and disclosures

- The decision to add five runs to each 2×2 cell came after the five-run
  results were published. Those results stand as published; this README
  reports the pooled ten-run figures beside them.
- One model (Sonnet 5.5) and two cases. The other-model arm did not run.
- The hint was written by the same author as the skill, after seeing the
  2×2 results, and names the bar the hero metric measures. It tests whether
  the skill is worth more than the one sentence its author would give, not
  whether any sentence works.
- No-browser compliance: all 123 Bash calls in the 40 transcripts of B, D
  and F were checked for Playwright, Puppeteer, Chromium, Chrome, WebKit,
  Firefox, Safari and headless launches. There were none.
- 80 agents for 80 runs: none was restarted or replaced. Every run left the
  HTML file unchanged. No scratch files were left in this spec's outputs.
- Several runs added changes nobody asked for (`text-wrap`,
  `overflow-wrap`, the body size from `17px` to `1.0625rem`); the graders
  measure only the paragraphs and the heading.

Each run folder under [`runs/`](runs/) has the outputs, `grading.json` and
`timing.json`.
