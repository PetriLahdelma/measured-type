# The 2×2: the skill and a browser, varied independently (spec 0007)

Head-to-heads 2 and 3 could not tell the skill's guidance from its bundled
browser. This experiment varies the two independently. Pre-registered in
[`specs/0007-two-by-two.md`](../../../specs/0007-two-by-two.md) (commit
`1070f1f`), skill frozen at `content-freeze-6`, analysis script
[`evals/2x2/analyze.js`](../../2x2/analyze.js) committed before any run.
Claude Sonnet 5.5, five runs per cell, two cases: 40 runs on 30 October 2026.

| Cell | Skill | Browser |
|---|---|---|
| A | full skill with its `node_modules` (Playwright and Chromium) | the brief offers Playwright |
| B | the skill without `npm install` (lint and estimate only) | the brief forbids launching any browser |
| C | none | the brief offers Playwright |
| D | none | the brief forbids launching any browser |

Briefs: [`brief-browser.md`](../../2x2/brief-browser.md) and
[`brief-nobrowser.md`](../../2x2/brief-nobrowser.md). Run folders have random
names; the deterministic graders in [`h2h-grade.js`](../../h2h-grade.js) do
not read [`key.json`](key.json).

## Result

Reproduce with `node evals/2x2/analyze.js evals/results/2x2`.

**`h2h-measure-ideal`**: distance of the rendered characters per line at
1280px from 66, lower is better.

| Cell | Mean | Median | Range | Graders passed |
|---|--:|--:|---|---|
| A: skill, browser | 0.38 | 0.40 | 0.00 to 1.10 | 15/15 |
| B: skill, no browser | 1.20 | 1.20 | 1.20 to 1.20 | 15/15 |
| C: no skill, browser | 0.60 | 0.40 | 0.40 to 1.40 | 15/15 |
| D: no skill, no browser | 2.48 | 2.60 | 2.30 to 2.60 | 15/15 |

Skill effect with a browser (A minus C): −0.22, exact permutation p = 0.516.
Skill effect without a browser (B minus D): −1.28, p = 0.008. Main effect of
the browser: −1.35; of the skill: −0.75; interaction: 1.06.

**`h2h-zoom-hero`**: growth of the heading at 200% zoom on a 1280px window,
higher is better.

| Cell | Mean | Median | Range | Graders passed |
|---|--:|--:|---|---|
| A: skill, browser | 1.53× | 1.55× | 1.44× to 1.61× | 11/15 |
| B: skill, no browser | 1.53× | 1.55× | 1.43× to 1.55× | 10/15 |
| C: no skill, browser | 1.43× | 1.43× | 1.43× to 1.43× | 10/15 |
| D: no skill, no browser | 1.45× | 1.43× | 1.43× to 1.47× | 10/15 |

Skill effect with a browser (A minus C): +0.096, p = 0.008. Skill effect
without a browser (B minus D): +0.080, p = 0.048. Main effect of the skill:
+0.088; of the browser: −0.008; interaction: +0.016.

Every hero passed the 2× by 500% zoom grader and the requested-sizes grader.
The one grader that failed was the 1.6× bar at 200%, which 1 run of 20
cleared.

## Cost per cell

| Case | Cell | Mean tokens | Mean time |
|---|---|--:|--:|
| measure | A | 127k | 47 s |
| measure | B | 126k | 40 s |
| measure | C | 119k | 48 s |
| measure | D | 117k | 37 s |
| hero | A | 132k | 68 s |
| hero | B | 130k | 50 s |
| hero | C | 116k | 33 s |
| hero | D | 116k | 26 s |

The skill cost 7% more tokens on the measure and 12% to 13% more on the hero.
On the hero it took about twice the time.

## What happened

- **Measure, with a browser:** every run in A and C rendered the page and
  counted lines, landing between 64.6 and 66.4 characters per line. Runs
  without the skill set `54ch`, `55ch` or `35em` after measuring. Runs with
  the skill set `34.7em` or `35em`.
- **Measure, without a browser:** all five B runs ran the skill's estimator,
  which is calibrated in Chromium, and set `34.5em` (64.8). The D runs
  estimated Verdana's average character width from memory and set `33.5em`
  to `36em` (63.4 to 63.7). Every run in every cell knew that `ch` is the
  width of the zero and avoided `66ch`.
- **Hero, without the skill:** eight of ten runs wrote
  `clamp(2.5rem, 1.8rem + 3vw, 4.5rem)`. It reaches 72px at 1440px and grows
  1.43× at 200% zoom on a 1280px window. The other two ended the ramp at
  1600px.
- **Hero, with the skill:** six of ten runs traded desktop size for growth by
  ending the ramp at 1920px (1.55×; 58.7 to 58.9px at 1280px against 67.2px
  for the most common formula without the skill). Of the rest, two ended it
  at 1440px or 1600px and one B run wrote the common formula with `vi`
  (1.43×). Several runs without a browser ran the skill's lint, which flags
  the requested 40 to 72px range (1.8×) as LOW. The one run to clear 1.6× (A)
  used a steep ramp that reaches 72px at about 860px, so at 1280px the
  heading is held at its `rem` maximum, which grows with zoom.

## What this says

Read under the rules fixed before the runs:

- **Line length:** with a browser, there is no detectable difference between
  runs with and without the skill (p = 0.52). The browser accounts for most
  of the closeness: its main effect is the largest in the table. Without a
  browser, the skill's runs came closer to 66 (p = 0.008). Spec 0007 credits
  that to the guidance and the lite tools together, and here it was the
  estimator: all five B runs used it and landed on the same value. Every run
  in all four cells was inside the graded band of 60 to 72, so the gain is
  real but small: about one character per line.
- **Fluid type under zoom:** the skill raised growth with a browser
  (p = 0.008) and without one (p = 0.048). Spec 0007 credits this to the
  guidance, since the gap is judgment rather than measurement. The effect is
  about 0.09× of growth. It is measured against this project's own 1.6× bar,
  which only the runs with the skill were told about; the task asked only
  that the heading "still works for readers who zoom". Nine of ten runs with
  the skill still fell short of the bar.

## Limits and disclosures

- Five runs per cell. The council asked for ten; p-values above 0.05 are no
  detectable difference, not no difference.
- In C on the hero, all five runs gave 1.43×, so A minus C sits at the
  smallest two-sided p a 5 against 5 permutation test can give (2/252).
- B minus D on the hero, at p = 0.048, is close to the threshold.
- One model (Sonnet 5.5) and two cases.
- No-browser compliance: every Bash call in the 20 transcripts of B and D was
  checked for Playwright, Puppeteer, Chromium, Chrome, WebKit, Firefox,
  Safari and headless launches. There were none.
- Forty agents for forty runs: no run was restarted or replaced.
- Scratch files left in the outputs are not published: `measure.js` in one
  C run (`djtddv`) and a `scratch/` folder in one A run (`srzozi`). Neither
  is read by the graders.
- Several runs added changes nobody asked for (`text-wrap`, the body size
  from `17px` to `1.0625rem`). The graders measure only the paragraphs and
  the heading.

Each run folder under [`runs/`](runs/) has the outputs, `grading.json` and
`timing.json`.
