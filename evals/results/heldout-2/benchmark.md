# Skill Benchmark: measured-type

**Model**: claude-opus-5-5
**Date**: 2026-10-29T13:59:13Z
**Evals**: heldout-results-table, heldout-sidenote-measure, heldout-swedish-narrow-docs (2 runs each per configuration)

## Summary

| Metric | With Skill | Without Skill | Delta |
|--------|------------|---------------|-------|
| Pass Rate | 100% ± 0% | 97% ± 7% | +0.03 |
| Time | 257.9s ± 81.0s | 141.4s ± 36.3s | +116.4s |
| Tokens | 165380 ± 13796 | 132780 ± 6188 | +32601 |

## Notes

- Held-out set rerun on content-freeze-2 (tuned description; skill body unchanged since content-freeze-1 apart from the description). Same three pre-registered cases, prompts and grader brief as heldout-1.
- Pooled: with skill 34/34, without 33/34 (heldout-1: 32/34 vs 33/34). Per case: sidenote 10/10 vs 10/10; results-table 12/12 vs 12/12; swedish 12/12 vs 11/12.
- The only miss is the same literal case as before: a pre element that inherits hyphens: auto while its code child resets it. Read by intent, both configurations score 34/34 again.
- Swings between heldout-1 and heldout-2 on the with-skill side (two literal misses, then none) are run-to-run variance on identical skill content; the description does not reach these runs, which read SKILL.md directly.
- Result: on these held-out problems the skill still makes no measurable difference; both configurations are at or near ceiling.
