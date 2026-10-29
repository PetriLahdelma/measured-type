# Skill Benchmark: measured-type

**Model**: claude-opus-5-5
**Date**: 2026-10-29T12:21:57Z
**Evals**: measure-wide-face, ofl-feature-check, physical-props-audit, rendered-nbsp-spec-table, zoom-safe-scale (2 runs each per configuration)

## Summary

| Metric | With Skill | Without Skill | Delta |
|--------|------------|---------------|-------|
| Pass Rate | 100% ± 0% | 81% ± 21% | +0.19 |
| Time | 299.9s ± 121.4s | 200.5s ± 117.0s | +99.4s |
| Tokens | 161438 ± 16234 | 129898 ± 10960 | +31540 |

## Notes

- Pooled over all assertions: with skill 78/78 (100%), without 65/78 (83.3%). The headline 100% vs 81% is the mean of per-run pass rates.
- Per case (pooled, 2 runs each): zoom-safe-scale 10/10 vs 5/10; physical-props-audit 26/26 vs 21/26; rendered-nbsp-spec-table 12/12 vs 9/12; ofl-feature-check 16/16 vs 16/16; measure-wide-face 14/14 vs 14/14.
- Skill version: skills/measured-type at commit 313a165, after the review fixes. Same prompts, assertions, grader brief and model as iteration-1. Baselines were rerun too; the skill was staged without the evals folder so with-skill runs could not read graders.
- The 13 baseline misses: 3 errors a reader would see (both audits kept 75ch in Verdana, 91.6 chars/line, without saying it overshoots; one audit said the '>' character needs an explicit RTL swap, which would mirror a Bidi_Mirrored glyph twice), 1 content-portability requirement (plain space inside 'up to' while nowrap kept the page from breaking) and 9 conventions or house thresholds (1.6x zoom bar x2, 1.15x step floor x1, spacing from the body line x2, logical properties without an RTL requirement x2, decoration left unmirrored x2).
- zoom-safe-scale: both baseline heroes reached 1.584x at 200% zoom, just under the 1.6x house bar; both pass the max/min <= 2.5 heuristic. With the skill, both runs kept h3/h4 fixed and fluid ranges at or under 1.36x (1.67-1.81x at 200% zoom).
- measure-wide-face no longer separates the two: every run landed at 64.9-67.3 chars/line. Assertion 6 ('whole or half multiple ... so blocks after a wrapped heading land back on the interval') is internally ambiguous. The grader failed both baselines for 1.5-line h2s that drift half a line when wrapped; they were regraded to pass to match iteration-1, which passed the same choice twice. Under the strict reading the baselines score 12/14; in iteration-1 the with-skill run-1 and baseline run-2 would also have failed. The fixed skill now states the whole-multiple rule outright, so this assertion is an answer key.
- ofl-feature-check no longer separates the two: all four runs read the files and got every feature right. Grader judgment calls: an abbr placed inside Outfit text would still get all-small-caps in three runs (no visible effect with synthesis off; the prompt puts acronyms in body text); one baseline hand-sized italic capitals (0.82em) instead of leaving full caps. Both passed.
- Grading differences from iteration-1: the physical-props grader accepted naming 'margin: 0 auto' and the padding pair by description; iteration-1 failed a with-skill run for not naming them. The nbsp grader passed a closed-up 13,6″ (no space at all) as not breakable.
- Cost: with skill +99 s and +32k tokens per run on average, up from +35 s and +21k in iteration-1. The with-skill runs read the longer references and ran more verification scripts.
- Variance: n=2 per configuration. Treat one-assertion differences as noise. Stable signals across both iterations: the zoom case (house bar plus step floor plus spacing) and the RTL audit (decoration, the 75ch overshoot).
