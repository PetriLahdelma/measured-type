# Spec 0017: a held-out line length in another face

Pre-registered in [`specs/0017-held-out-measure.md`](../../../specs/0017-held-out-measure.md)
(commit `e1c7577`), with the case, its graders and the analysis script
[`evals/0017/analyze.js`](../../0017/analyze.js), before any run.

`h2h-measure-notes` asks for an essay in Charter at 19px to be set at
**about 62 characters per line**, with the size kept. In Charter `62ch`
renders at about 76 characters, so the width has to be measured. Graders:
60 to 64 characters per full line at a 1440px window; no sideways scroll at
375px; the paragraphs still 19px.

Claude Sonnet 5.5, 30 runs on 30 October 2026, all with the browser brief:

| Cell | Skill | Hint |
|---|---|---|
| S | Measured Type at `v1.3.0` | no |
| N | none | no |
| H | none | the spec 0008 sentence |

Reproduce with `node evals/0017/analyze.js evals/results/0017`.

## Result

| Cell | All three graders | 60 to 64 characters | Mean distance from 62 | Range | Mean tokens | Median time |
|---|--:|--:|--:|---|--:|--:|
| S: skill | 10/10 | 10 | 0.18 | 61.9 to 62.4 | 127k | 64 s |
| N: no skill | 10/10 | 10 | 0.43 | 61.0 to 62.8 | 119k | 54 s |
| H: one sentence | 9/10 | 9 | 0.82 | 59.3 to 62.3 | 120k | 63 s |

| Comparison | Distance from 62 | Permutation p (primary) | All three graders | Fisher p |
|---|---|--:|---|--:|
| S against N | 0.18 against 0.43 | 0.077 | 10/10 against 10/10 | 1.0 |
| S against H | 0.18 against 0.82 | 0.004 | 10/10 against 9/10 | 1.0 |

## What happened

- **With the skill:** every run used `measure-line.js --solve 62` or its
  numbers and set 28.4 to 28.8em (61.9 to 62.4 characters).
- **With nothing:** every run measured in Chromium, found that `62ch` gave
  about 76 characters and tuned by hand: six in `em` (28 to 28.7em), four in
  `ch` (51 to 52ch). All landed between 61.0 and 62.8.
- **With the sentence:** all ten used `em`, mostly by dividing a counted
  average character width into 62. They stopped a little short: seven of ten
  set 28.3em or less, and one at 27.5em gave 59.3 characters, outside the
  band.

## What this says

Read under the rules fixed before the runs:

- **Skill against one sentence: a held-out gain** (p = 0.004, below the 0.025
  split). The skill's runs came about four times closer to the requested
  length. Together with spec 0008's development result this is the second
  case, and the first held out, where the skill beats the sentence on line
  length.
- **Skill against no skill: no detectable difference** (p = 0.077). With a
  browser and the time to iterate, a run without the skill gets within about
  half a character.
- The size of the gain is small for a reader: 0.18 against 0.82 characters
  per line. What the skill adds here is precision on the number asked for,
  not a different design.

## Limits and disclosures

- One model (Sonnet 5.5), one case, ten runs per cell, browser brief only.
  Charter is a macOS system face, so the grades reproduce on macOS.
- One skill run (`fuospm`) ended at start on an API TLS error (EPROTO). Its
  folder was reset to the case files and the same run id was run again.
- 31 agents for 30 runs. Every run left `notes.html` and `notes.css`
  unchanged and no scratch files.
- One skill run (`ommonw`) also rewrote `font-size: 19px` as `1.1875rem`,
  which computes to 19px and passes the size grader.

Each run folder under [`runs/`](runs/) has the outputs, `grading.json` and
`timing.json`.
