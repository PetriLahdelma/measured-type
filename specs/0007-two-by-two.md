# Spec 0007: the skill and a browser, varied independently

Status: pre-registered 30 October 2026, before any run. Run the same day;
results and analysis in [`evals/results/2x2/`](../evals/results/2x2/).

## Question

Head-to-head 2 and 3 could not tell the skill's guidance from its bundled
browser: the runs with the skill always had Chromium, and a model without the
skill matched it once it had a browser. This experiment varies the two
independently.

## Design

Four cells, Claude Sonnet 5.5 (the smaller model, where differences are
likelier), five runs per cell, two cases: 40 runs.

| Cell | Skill | Browser |
|---|---|---|
| A | Measured Type at `content-freeze-6`, with its `node_modules` (Playwright and Chromium) | yes: the brief offers Playwright |
| B | Measured Type at `content-freeze-6`, installed without `npm install` (lint and estimate only) | no: the brief forbids launching any browser |
| C | none | yes: the brief offers Playwright |
| D | none | no: the brief forbids launching any browser |

Briefs: [`evals/2x2/brief-browser.md`](../evals/2x2/brief-browser.md) and
[`evals/2x2/brief-nobrowser.md`](../evals/2x2/brief-nobrowser.md). Run
folders are anonymized and graded before the key is opened.

## Cases and primary metrics

- **`h2h-measure-ideal`** (about 66 characters per line in Verdana). Primary
  metric: the absolute distance of the rendered characters per line at 1280px
  from 66, lower is better. The graders of head-to-head 2 also run.
- **`h2h-zoom-hero`** (new; a hero about 40px on a phone and 72px on a desktop
  that still works under zoom; the requested range and zoom pull against each
  other). Primary metric: growth at 200% zoom on a 1280px window, higher is
  better. Three graders: 2× by 500% zoom, 1.6× at 200% (house bar), the
  requested sizes within 20%. Validated before commit: the untouched `5vw`
  fails all three, a naive linear clamp from 40 to 72px fails the 1.6× bar,
  `clamp(2.5rem, 2.25rem + 1.8vw, 4.5rem)` passes all three.

## Analysis (fixed now)

[`evals/2x2/analyze.js`](../evals/2x2/analyze.js) reads every run's
`grading.json` and the key and prints, per case:

- each cell's mean, median and range of the primary metric, and its pass
  counts;
- the main effect of the skill (mean of A and B minus mean of C and D), the
  main effect of the browser (A and C minus B and D) and the interaction
  ((A minus C) minus (B minus D));
- for the skill effect within each browser level, an exact two-sided
  permutation test over all 252 splits of the ten runs.

How the result will be read, decided before the runs:

- A skill effect that appears only with a browser is credited to the tooling.
- A skill effect without a browser (B against D) is credited to the guidance
  and the lite tools together; on the zoom case, where the gap is judgment
  rather than measurement, it is credited to the guidance.
- With five runs per cell, a p-value above 0.05 is reported as no detectable
  difference, not as no difference. The council asked for ten runs per cell;
  five were chosen to keep the cost in proportion, and this is a limit of the
  experiment.
