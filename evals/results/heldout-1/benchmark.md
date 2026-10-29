# Skill Benchmark: measured-type

**Model**: claude-opus-5-5
**Date**: 2026-10-29T13:24:39Z
**Evals**: heldout-results-table, heldout-sidenote-measure, heldout-swedish-narrow-docs (2 runs each per configuration)

## Summary

| Metric | With Skill | Without Skill | Delta |
|--------|------------|---------------|-------|
| Pass Rate | 94% ± 9% | 97% ± 7% | -0.03 |
| Time | 264.4s ± 102.3s | 146.6s ± 30.9s | +117.8s |
| Tokens | 164789 ± 15942 | 132766 ± 4197 | +32024 |

## Notes

- Held-out set: three cases written after tag content-freeze-1 and committed (3ea8081) before any run. The skill content was not changed between the freeze and these runs.
- Pooled: with skill 32/34, without 33/34. Per case: heldout-sidenote-measure 10/10 vs 10/10; heldout-results-table 11/12 vs 12/12; heldout-swedish-narrow-docs 11/12 vs 11/12.
- Result: on problems written after the freeze, the skill made no measurable difference. Every run, with or without it, measured its own line lengths, used U+2212 minus signs, tabular lining figures, table header scopes, Swedish hyphenation and nowrap value cells.
- Both with-skill misses are literal readings of pre-registered wording, kept as written: one table aligned its figures to the end edge with a grid track (computed text-align was start); one stylesheet set hyphens on code but not on its pre wrapper, which inherits auto although its text cannot hyphenate. The baseline Swedish miss is the same pre case. Read by intent, all three runs pass and both configurations score 34/34.
- Cost: with skill +118 s and +32k tokens per run on average.
- n=2 per configuration. The cases were chosen to test generalization, not to find gaps; the model already handles all three well; a held-out set built from failure modes the baseline actually shows would be the next step.
