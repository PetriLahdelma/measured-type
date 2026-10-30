# Spec 0014: a shorter SKILL.md with a word budget

Status: accepted 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`scripts/test/budget.test.js`).

## Why

SKILL.md is read in full every time the skill loads, and the evals put its
cost at 7% to 25% more tokens per task. Its measurable gains come from the
tools it routes to, not from its prose: on the held-out zoom case one
sentence matched it. SKILL.md should route quickly and leave depth to the
references, which load only when needed.

## Requirements

- **B1** SKILL.md, front matter included, is at most 2,300 words (it was
  2,899).
- **B2** SKILL.md still names every script in `scripts/` and every file in
  `references/`, so nothing becomes unreachable.
- **B3** What moved out is still in the skill: the type-scale rules (5 to 8
  sizes, a line-height and tracking per size, spacing in multiples of the
  base line) are in `references/rules.md` §3.1.1, and the lint's source
  formats and the no-browser procedure are in `references/audit.md`.
- **B4** The core rules table in §2 is unchanged, and every existing test on
  SKILL.md passes.
