# Skill Benchmark: measured-type

**Model**: claude-opus-5-5
**Date**: 2026-10-29T05:32:23Z
**Evals**: measure-wide-face, ofl-feature-check, physical-props-audit, rendered-nbsp-spec-table, zoom-safe-scale (2 runs each per configuration)

## Summary

| Metric | With Skill | Without Skill | Delta |
|--------|------------|---------------|-------|
| Pass Rate | 99% ± 2% | 77% ± 22% | +0.22 |
| Time | 220.6s ± 70.2s | 186.1s ± 85.7s | +34.6s |
| Tokens | 151503 ± 11830 | 130687 ± 12122 | +20816 |

## Notes

- Pooled over all assertions: with skill 77/78 (98.7%), without 63/78 (80.8%). The headline 99% vs 77% is the mean of per-run pass rates.
- Per case (pooled, 2 runs each): zoom-safe-scale 10/10 vs 4/10; rendered-nbsp-spec-table 12/12 vs 9/12; physical-props-audit 25/26 vs 22/26; ofl-feature-check 16/16 vs 15/16; measure-wide-face 14/14 vs 13/14.
- Gains concentrate in zoom-safe-scale. Without the skill both runs kept the hero range too wide (1.44x at 200% zoom, needs 1.6), let h3/h4 converge at 360px (1.11x) and built spacing from fixed rem rather than the body line. The skill's ratio math and 'only hero/h1/h2 fluid' rule fixed all three in both runs. Same result as the earlier iteration-4 rerun of this case (5/5 vs 2/5).
- Measure is no longer a differentiator on this model: every baseline run measured Verdana itself and landed at 64.7-65.3 chars/line (with skill 66.1). The earlier personal-skill benchmark showed 68 vs 80 on a wide commercial geometric sans in the ofl-feature-check predecessor case; that case now uses Source Serif 4, where baselines landed at 69-70.
- physical-props-audit: both baselines converted the decorative box-shadow and rotate() to RTL variants and neither stated that 75ch in Verdana renders well over 75 characters (measured 91.6). One with-skill run named the .docs-main width but not margin: 0 auto or padding-left/right (strict grading).
- rendered-nbsp-spec-table: every run bound number and unit with U+00A0. Baselines lost points on physical properties (left: 0 on a sticky column, text-align: left/right) and one left a plain space inside 'up to'.
- ofl-feature-check: all four runs read the font files and reported features correctly, including the italic without small caps. The only miss: one baseline disabled only small-caps synthesis, not weight and style. Baselines set 69-70 chars/line, inside the 58-74 band but not at 66.
- measure-wide-face: one baseline put only half a body line between an h2 and a directly following h3 (its own deliberate choice), failing the one-line assertion.
- Non-discriminating assertions (pass in all four runs of their case): fixed-rem body size, logical properties in prose.css, font feature statements in notes.md, oldstyle body figures, U+00A0 number-unit binding, Finnish decimal commas, html lang switch, tabular-nums in the spec table, label and hero tracking. They stay as regression guards.
- Cost: with skill +35 s and +21k tokens per run on average (reading references and running the scripts).
- Variance: n=2 per configuration. Treat per-case differences of one assertion as noise; the zoom gap (6 of 10 assertions) and the RTL audit gap are the stable signals.
- The skill's locale reference got a structural heading edit (a generic 'locale pattern' list above the EN/FI/SV table) while runs were in flight; rule content was unchanged.

## Addendum, 29 October 2026 (after review)

- Read this as a development set. The references contain worked answers for
  parts of these cases (rules.md: the three faces at 18px, italic small caps,
  `jopa 18 h`; logical-and-language.md: the list indent).
- The 1.6x zoom threshold in zoom-safe-scale is a project heuristic. WCAG 1.4.4
  sets no ratio; both baseline heroes (ranges 1.78x and 1.8x) pass the common
  max / min <= 2.5 heuristic that the skill itself cites.
- The 15 baseline misses: 2 rendered errors a reader would see (75ch and 70ch
  kept in Verdana, 91.6 and 85.7 chars/line; both runs did explain that 1ch is
  the zero), 1 content-portability requirement (plain space in "up to" while
  `white-space: nowrap` prevented the break on the page) and 12 conventions or
  house thresholds (1.6x zoom bar x2, 1.15x step floor x2, spacing from the
  body line x2, logical properties without an RTL requirement x2, decoration
  left unmirrored x2, all font synthesis off, a full line between h2 and h3).
- These runs predate the script and wording fixes made after review on
  29 October 2026 and have not been rerun.
