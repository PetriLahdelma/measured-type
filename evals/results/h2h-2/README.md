# Head-to-head 2 (spec 0003, part N)

Two cases written to be harder than head-to-head 1, after an outside review
asked for dense product UI: `evals/h2h-dashboard` (an ops dashboard, 9
rendered assertions) and `evals/h2h-measure-ideal` (about 66 characters per
line in Verdana, 3 assertions). Measured Type against no skill, two runs each:
8 runs on Claude Opus 5.5, 29 October 2026. Cases and graders were committed
before any run (`043b273`, tag `content-freeze-4`) and validated first: the
untouched dashboard fails 9 of 9, a hand-made fix passes 9 of 9, and for the
post a `34em` measure passes while the naive `66ch` fails at 79 characters per
line. Run folders are anonymized and were graded before the key was opened;
[`key.json`](key.json) maps them.

## Result

| Configuration | Dashboard | Measure | Total | Mean tokens (dashboard / measure) | Mean time (dashboard / measure) |
|---|---|---|--:|--:|--:|
| measured-type | 9/9, 9/9 | 3/3, 3/3 | **24/24** | 151k / 130k | 178 s / 96 s |
| none (no skill) | 9/9, 9/9 | 3/3, 3/3 | **24/24** | 134k / 119k | 173 s / 67 s |

A tie. Neither case separated the configurations, and the skill cost about
12% more tokens on the dashboard and 9% more on the measure, plus half a
minute.

## What happened

- **Every run measured in a browser.** The runner brief (shared with
  head-to-head 1) tells each run that Node with Playwright is available. All
  four runs without the skill wrote their own measuring script, found that
  `66ch` sets 78 to 81 characters per line in Verdana, and chose `35em`
  (66.3 per line). That is exactly the behaviour the skill teaches, reached
  without it.
- **The dashboard faults were all found by both.** Every run turned the
  colour-only status into words, set tabular figures aligned at the end,
  replaced the `3vw` KPI size with a rem-based size, raised the faint 10 and
  11px labels to 12px or more at 4.5:1, let the cut-off service name wrap and
  put the table in its own scrolling box. Three runs (two without the skill)
  dropped the uppercase headers because `text-transform` turned "p95 (ms)"
  into "P95 (MS)", a unit error the graders did not test.
- **Beyond the graders**, two runs without the skill and one with it noted
  that the Errors column shows raw counts that hide a 97% error rate; one run
  without the skill caught that the error-rate tile (0.41%) disagrees with the
  table (0.35%).

## What this says

On these tasks, with a browser in reach and told so, this model does not need
the skill. The earlier head-to-head reached the same place by a single
assertion. The honest reading is that the skill's measured advantage on
Claude Opus 5.5 is small to none when the agent already has, and is told it
has, a browser; what it adds is the method and the tools packaged, at a cost
of 10 to 15% more tokens.

Not tested here, and the obvious next case: the same tasks with no mention of
a browser in the brief, which is closer to how the skill is used, and a
smaller model.

## Limits

- Two runs per configuration, one model, one evening.
- The graders share definitions with the skill's own checks (tabular figures,
  end alignment, tracked capitals, truncation); they were written separately
  in `h2h-grade.js` and none imports the skill's scripts except
  `measure-line.js` for counting lines, as in head-to-head 1.
- The brief offered Playwright to every run, which removes the gap the skill
  is meant to close. This is disclosed as the main confound, not corrected.
