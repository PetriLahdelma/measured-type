# Spec 0018: tighter bands, re-graded after the fact

Status: exploratory, 30 October 2026. The bands below were fixed before the
re-grade was computed, but by someone who knew the published results, so
they are not a pre-registered test and no p-values are given. The committed
graders and every `grading.json` stay as they are.

## Why

Two graders let through answers the prompt did not ask for. The line-length
case asks for "about 66 characters" and passes 60 to 72; in h2h-3 every
run passed, though runs with the skill landed at 66.0 to 66.4 and two runs
without it at 62.5 and 63.4. The zoom cases ask for two sizes and pass
anything within 20%; in spec 0010 three hint runs passed at 68.8 to 70.4px
against the 80px asked for. A band that wide cannot show precision.

## Bands

[`evals/regrade-tight.js`](../evals/regrade-tight.js) reads the numbers each
committed `grading.json` already records (nothing is rendered again) and
applies, in place of the band grader:

- `h2h-measure-ideal`: 64 to 68 characters per line (66 within 2).
- `h2h-zoom-hero`: 38 to 42px at 360px and 68.4 to 75.6px at 1440px (40 and
  72px within 5%).
- `h2h-zoom-title`: 45.6 to 50.4px and 76 to 84px (48 and 80px within 5%).

Tested in `tools/test/regrade-tight.test.js` (G1 to G4). New cases use bands
this tight from the start: spec 0017 grades 62 characters within 2.

## Result

`node evals/regrade-tight.js` prints every experiment and cell. Pooled over
the 2×2 and spec 0008 (Claude Sonnet 5.5, ten runs per cell), the line-length
case:

| Cell | Skill | Browser | Hint | 60 to 72 | 64 to 68 |
|---|---|---|---|--:|--:|
| A | full | yes | no | 10/10 | 10/10 |
| B | lite | no | no | 10/10 | 10/10 |
| C | none | yes | no | 10/10 | 10/10 |
| D | none | no | no | 10/10 | 2/10 |
| E | none | yes | yes | 10/10 | 6/10 |
| F | none | no | yes | 10/10 | 1/10 |

In h2h-3 (two runs per model) the skill's runs stay 4 of 4 and the runs
without it fall to 2 of 4. On the title case (spec 0010), all three graders
with the tighter size band: skill 10 of 10, the sentence 7 of 10, nothing
0 of 10 (it already failed the zoom grader). On the hero case the tighter
band changes no conclusion: the cells that failed the zoom grader before
still fail, and the spec 0009 runs stay 20 of 20.

## What this says

- Without a browser, the skill's estimate gets within two characters every
  time (B), where nothing does so 2 times in 10 and the sentence once (D, F).
  This is the clearest place the skill adds something a hint does not.
- With a browser, a run that measures needs no skill to get close (C), and
  the sentence makes it worse (E: 6 of 10), as spec 0008 found.
- On the title case the skill's gain over the sentence appears only with the
  tighter band, and only as a pattern to test, not a result: spec 0017 is
  the pre-registered test of the same question on line length.
