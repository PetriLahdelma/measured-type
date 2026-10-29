# Head-to-head 3 (spec 0003, part N3)

Head-to-head 2 tied, and every run in it had been told that Node with
Playwright was available. This rerun removes that hint. The brief
([`../../h2h-3-brief.md`](../../h2h-3-brief.md)) mentions no browser, forbids
installing or downloading anything and allows only Read, Write, Edit, Glob,
Grep and Bash. A run with the skill still has the skill's scripts and their
installed `node_modules`, as after the README's install. The same two cases
and graders as head-to-head 2, unchanged. Four configurations, two runs each:
16 runs on 29 October 2026. Pre-registered in `a2fb41c`; skill frozen at
`content-freeze-5`. Graded blind before the key was opened.

## Result

| Model | Configuration | Dashboard | Measure | Characters per line set | Mean tokens (dash / measure) | Mean time (dash / measure) |
|---|---|---|---|---|--:|--:|
| Opus 5.5 | measured-type | 9/9, 9/9 | 3/3, 3/3 | 66.4, 66.4 | 144k / 134k | 175 s / 81 s |
| Opus 5.5 | none | 9/9, 9/9 | 3/3, 3/3 | 63.4, 66.4 | 127k / 118k | 127 s / 59 s |
| Sonnet 5.5 | measured-type | 9/9, 9/9 | 3/3, 3/3 | 66.0, 66.0 | 134k / 126k | 71 s / 52 s |
| Sonnet 5.5 | none | 9/9, 9/9 | 3/3, 3/3 | 62.5, 66.4 | 119k / 118k | 48 s / 44 s |

Every run passed every assertion: 96 of 96 for both configurations, on both
models. The skill cost 7 to 14% more tokens and was slower in every cell.

## What happened

- **Without a browser, the runs without the skill reasoned their way to the
  answer.** All four knew that `ch` is the width of the zero and that Verdana's
  zero is wide. Two estimated Verdana's average character width from memory
  and set `33em` and `33.5em`; they rendered at 62.5 and 63.4 characters per
  line, inside the graded band of 60 to 72 but short of the 66 asked for. One
  simulated line wrapping in a script with remembered widths and landed on
  `35em` (66.4). One found a Chrome installed on the machine, rendered the
  page headless and set `55ch` on the paragraphs (66.4).
- **With the skill, every run measured.** All four ran the skill's scripts in
  Chromium and set `35em`, rendering at 66.0 to 66.4 characters per line.
- **The dashboard did not separate anything.** All eight runs without the
  skill gave status a word, set tabular figures aligned at the end, removed
  the `3vw` size, raised contrast and size, let names wrap and boxed the
  table; they checked contrast with scripts and markup by reading it. The
  runs with the skill also ran the rendered audit, and several reported it
  clean before handing over.

## What this says

The skill's advantage on these tasks is precision and verification, not
pass or fail. With it, the measure lands on the target and the agent says it
was measured; without it, a capable model gets close by reasoning and says it
estimated. The graders' 60 to 72 band was written to catch `66ch` (79 per
line), and it does not distinguish 62.5 from 66. Neither case found a fault
that a model without the skill missed outright, on either model.

## Incidents (disclosed)

- **Four runs failed at the start with an API error** (`EPROTO: The TLS
  handshake failed`), two Sonnet dashboard runs with the skill and two Opus
  measure runs with the skill. Their workspaces were reset to the input files
  and the same four runs were started again with the same ids, models and
  prompts. None of the failed attempts wrote an output file; one had created
  a scratch folder, removed with the reset.
- **One run without the skill used a Chrome it found on the machine.** The
  brief forbids installing or downloading, not using what is installed; this
  is the condition the spec describes ("whatever it finds for itself").

## Limits

- Two runs per cell, two models, one evening, one machine (macOS, where
  Verdana is installed and a Chrome exists).
- The graders share definitions with the skill's checks; they are written
  separately in `h2h-grade.js`.
- Sonnet 5.5 is the smaller model here; a model smaller still might separate
  the configurations where these did not.
