# Spec 0010: a held-out twin of the hero case

Pre-registered in [`specs/0010-held-out-title.md`](../../../specs/0010-held-out-title.md)
(commit `fc21c51`), with the case, its graders and the analysis script
[`evals/0010/analyze.js`](../../0010/analyze.js), before any run.

`h2h-zoom-title` asks for a page title of about **48px on a phone and 80px
on a wide desktop** that keeps working when readers zoom in. It differs from
the hero case in page, file names, selector, face, starting value (`6vw`) and
prompt wording, and neither size appears in any example in the skill. A plain
ramp from 48px at 360px to 80px at 1440px grows 1.50× at 200% zoom on a
1280px window, under the project's 1.6× bar. Graders: 2× by 500% zoom; 1.6×
at 200% zoom on a 1280px window; 38.4 to 57.6px at 360px and 64 to 96px at
1440px (the requested sizes within 20%).

Claude Sonnet 5.5, 30 runs on 30 October 2026, all with the browser brief:

| Cell | Skill | Hint |
|---|---|---|
| S | Measured Type at `content-freeze-8` | no |
| N | none | no |
| H | none | the spec 0008 sentence, which names the 1.6× bar |

Reproduce with `node evals/0010/analyze.js evals/results/0010`.

## Result

| Cell | All three graders | 2× by 500% | 1.6× at 200% | Requested sizes | Mean growth | Range | Mean tokens | Median time |
|---|--:|--:|--:|--:|--:|---|--:|--:|
| S: skill | 10/10 | 10 | 10 | 10 | 1.61× | 1.61× to 1.61× | 126k | 39 s |
| N: no skill | 0/10 | 10 | 0 | 10 | 1.48× | 1.43× to 1.49× | 117k | 31 s |
| H: one sentence | 10/10 | 10 | 10 | 10 | 1.64× | 1.60× to 1.70× | 117k | 41 s |

| Comparison | All three graders | Fisher p | Growth difference | Permutation p |
|---|---|--:|--:|--:|
| S against N, primary | 10/10 against 0/10 | < 0.0001 | +0.131 | < 0.0001 |
| S against H, primary | 10/10 against 10/10 | 1.0 | −0.032 | 0.006 |

## What happened

- **With the skill:** every run ran `type-scale.js --fit 3rem:5rem` and used
  the two-slope form it recommends, `clamp(3rem, min(1.9238rem + 4.7831vi,
  2.9067rem + 2.3259vi), 5rem)`: 48px at 360px, 80px at 1440px, 1.61× at 200%
  zoom on a 1280px window. Most reported the lower growth on 1024px and
  1440px windows (1.57× and 1.58×) from the tool's table.
- **With nothing:** eight of ten wrote a single ramp from 48px at 375px to
  80px at 1440px (`clamp(3rem, 2.3rem + 3vw, 5rem)` or the same to three
  decimals), which grows 1.49×. A few measured the growth under page zoom
  (about 1.44× to 1.46×) and kept the ramp; most checked a doubled root font
  size instead.
- **With the sentence:** seven of ten wrote a steep ramp that reaches 80px
  by about 800 to 900px (the early-max form, 1.62× to 1.70×). Three slowed the
  ramp until it passed 1.6×, leaving the title at 68.8 to 70.4px on a 1440px
  window. That is inside the graded band (64 to 96px) but about 10px under
  the 80px asked for.

## What this says

Read under the rules fixed before the runs:

- **Skill against no skill: a held-out gain** (p < 0.0001). On a case it was
  not designed on, the skill turned a 0 of 10 into a 10 of 10.
- **Skill against one sentence: no detectable difference** on the primary
  count (10 of 10 each, p = 1.0). The sentence's runs grew a little more under
  zoom (1.64× against 1.61×, p = 0.006, secondary), because the early-max
  form they mostly chose grows more on a 1280px window than two slopes do.
  The skill is not shown to add anything over the sentence on this case.

Why this case and the hero case differ for the sentence: here the requested
range is 1.67×, so a run that slows the ramp to pass the bar still lands
within 20% of 80px at 1440px; in the hero case the range is 1.8× and the same
move fell outside the band (14 of 20 hint runs failed it). The size grader's
20% band is generous: three sentence runs here pass it at 68.8 to 70.4px,
while every skill run hit 80px at 1440px.

## Limits and disclosures

- One model (Sonnet 5.5), one held-out case, ten runs per cell, browser
  brief only.
- The skill's runs all used the tool's output unchanged: the result shows that
  `--fit` and the instruction to use it carry to new sizes, not that the
  agent reasons differently.
- The sentence names the 1.6× bar that the second grader measures; the skill
  names it too. Neither the sentence nor the no-skill brief mentions the
  20% size band.
- The skill copy is `content-freeze-8`, whose examples use 40 to 72px; `main`
  now uses 32 to 60px. Neither is this case's range.
- 30 agents for 30 runs, none restarted or replaced; every run left
  `title.html` unchanged and no scratch files.

Each run folder under [`runs/`](runs/) has the outputs, `grading.json` and
`timing.json`.
