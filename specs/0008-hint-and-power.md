# Spec 0008: a one-sentence hint, ten runs per cell, other models

Status: pre-registered 30 October 2026, before any run of this spec. The
Claude parts ran the same day; results in
[`evals/results/0008/`](../evals/results/0008/). The other-model part has not
run.

## Questions

The 2×2 (spec 0007) left three things untested:

1. Is the full skill worth more than one sentence of advice?
2. Do its results hold with ten runs per cell instead of five?
3. Do they hold on a model other than Claude?

## Design

Same two cases, graders, skill copy (`content-freeze-6`), briefs and model
(Claude Sonnet 5.5) as spec 0007.

- **Top-up to ten.** Five more runs in each of the cells A to D, on both
  cases: 40 runs. The decision to add runs was made after the five-run
  results were published; those results stand as published, and the ten-run
  results are reported beside them, not instead of them.
- **Hint arm.** Two new cells without the skill, ten runs each, on both
  cases: 40 runs.

| Cell | Skill | Browser | Hint |
|---|---|---|---|
| E | none | the brief offers Playwright | yes |
| F | none | the brief forbids launching any browser | yes |

  The hint is the same sentence on both cases, added after the task as a
  line of its own:

  > Hint: `ch` is the width of the digit zero, wider than an average letter
  > in most faces, so set a measure by counting characters, and a fluid font
  > size loses growth under browser zoom because its viewport term does not
  > scale, so check that it still grows at least 1.6× at 200% zoom on a
  > 1280px window.

  It names the 1.6× bar, which in the 2×2 only the runs with the skill knew.

- **Other models.** The same six cells on a non-Claude model, five runs per
  cell. On 30 October 2026 no such model was reachable from this machine (the
  Codex CLI was out of credit until 4 November, the Cursor agent offered no
  models and no other provider was configured). This part runs when one is,
  under this spec, and is reported separately. Until then it is untested.

Run order: each round of 16 runs holds one run of A to D and two of E and F
on each case. Run folders have random names; the graders do not read the key.

## Analysis (fixed now)

[`evals/0008/analyze.js`](../evals/0008/analyze.js) reads the 2×2 results and
this spec's results together and prints, per case, each cell's mean, median,
range and pass counts, and these differences with an exact two-sided
permutation test over every split of the two cells:

- **Primary:** E against A (the hint against the full skill, with a browser)
  and F against B (the hint against the lite skill, without one).
- **Secondary:** E against C and F against D (the hint against nothing), and
  A against C and B against D at ten runs per cell.

How the result will be read, decided before the runs:

- If a primary comparison shows no detectable difference, or favours the
  hint, the skill is not shown to add anything over one sentence on that
  case and browser level.
- If it favours the skill, the skill adds something beyond the sentence.
- p above 0.05 is no detectable difference, not no difference. With two
  primary comparisons per case, a p between 0.025 and 0.05 is also reported
  as not surviving a Bonferroni correction.
- The hero metric is measured against this project's own 1.6× bar. The hint
  gives that bar to cells E and F, so the comparison with the skill is fair on
  that point; the comparison with C and D is not, and is reported as such.
