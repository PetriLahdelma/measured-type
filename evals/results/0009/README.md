# Spec 0009: the hero case after `--fit`

Spec 0008 found that, asked for a hero heading of about 40px on a phone and
72px on a large desktop that still works under zoom, runs with the skill kept
the sizes and missed this project's 1.6× bar at 200% zoom, and runs given a
one-sentence hint reached the bar by giving up the 72px. Spec 0009
([`specs/0009-zoom-safe-fit.md`](../../../specs/0009-zoom-safe-fit.md)) added
`type-scale.js --fit`, which prints two forms that keep the requested sizes
and pass the bar (an early max and two slopes), and told the agent in
SKILL.md and `rules.md` §3.1.1 to keep the requested sizes and use it. The
change was written test first (Z1 to Z9) and tagged `content-freeze-8` in
`5c2cf4e`; this rerun and its analysis script
[`evals/0009/analyze.js`](../../0009/analyze.js) were committed in the same
commit, before any run.

Claude Sonnet 5.5, 20 runs on 30 October 2026, the 2×2 briefs unchanged:

| Cell | Skill | Browser |
|---|---|---|
| A9 | `content-freeze-8` with `node_modules` | the brief offers Playwright |
| B9 | `content-freeze-8` without `npm install` | the brief forbids launching any browser |

Reproduce with
`node evals/0009/analyze.js evals/results/2x2 evals/results/0008 evals/results/0009`.

## Result

| Cell | Runs | All three graders | Requested sizes | Mean growth at 200% | Mean tokens | Median time |
|---|--:|--:|--:|--:|--:|--:|
| A: skill at freeze-6, browser | 10 | 1 | 10 | 1.50× | 132k | 67 s |
| B: skill at freeze-6, no browser | 10 | 0 | 10 | 1.50× | 130k | 54 s |
| C: no skill, browser | 10 | 0 | 10 | 1.43× | 116k | 31 s |
| D: no skill, no browser | 10 | 0 | 10 | 1.44× | 116k | 25 s |
| E: hint, browser | 10 | 2 | 2 | 1.64× | 119k | 54 s |
| F: hint, no browser | 10 | 4 | 4 | 1.64× | 117k | 36 s |
| **A9: skill at freeze-8, browser** | 10 | **10** | 10 | 1.61× | 127k | 54 s |
| **B9: skill at freeze-8, no browser** | 10 | **10** | 10 | 1.61× | 125k | 39 s |

| Comparison | All three graders | Fisher p | Growth difference | Permutation p |
|---|---|--:|--:|--:|
| A9 against A, primary | 10/10 against 1/10 | 0.0001 | +0.110 | 0.0001 |
| B9 against B, primary | 10/10 against 0/10 | < 0.0001 | +0.106 | < 0.0001 |
| A9 against E, secondary | 10/10 against 2/10 | 0.0007 | −0.025 | 0.0001 |
| B9 against F, secondary | 10/10 against 4/10 | 0.011 | −0.027 | 0.0007 |

## What happened

All 20 runs ran `type-scale.js --fit 2.5rem:4.5rem`, took the two-slope form
it recommends, `clamp(2.5rem, min(1.2714rem + 5.4603vi, 2.62rem + 2.0889vi),
4.5rem)`, and kept 40px at 360px and 72px at 1440px. Every run named the
form; most said why they chose it over the early max (more growth on a 1024px
window, 1.53× against 1.39×), and most listed the growth on the narrower and
wider windows from the tool's table, including the two that fall just short
of 1.6× (1.53× on 1024px, 1.58× on 1440px). Most A9 runs also measured the
result in Chromium. Several added `text-wrap: balance` or `overflow-wrap`
nobody asked for.

## What this says

Under the rule fixed before the runs, both primary comparisons favour the new
skill (p = 0.0001 and p < 0.0001), and the gain is credited to `--fit` and the
guidance that points to it. Against the one-sentence hint, the new skill met
all three graders far more often (20 of 20 against 6 of 20) at a slightly
lower mean growth (1.61× against 1.64×): the hint runs overshot the bar by
shrinking the desktop size, and the skill runs met it exactly while keeping
the sizes.

This is the tool doing the work: all 20 runs printed the same candidate and
used it unchanged, so the result says the tool and the instruction to use it
reach the agent, not that the agent now reasons better about zoom.

## Limits and disclosures

- **Not held out.** This is the case that motivated the change, so the gain
  is a development result. The two-slope form passes the house bar on a
  1280px window by design; it was tuned for that bar.
- **A worked answer in the guidance.** At `content-freeze-8`, the examples in
  SKILL.md (`--fit 2.5rem:4.5rem`, "say 40px on a phone and 72px on a
  desktop") and `rules.md` §3.1.1 (the literal two-slope CSS) used this case's
  exact sizes. All 20 runs ran the tool themselves; five A9 runs also read
  `rules.md`. After the rerun the examples were changed to a different range
  (32px to 60px), so the guidance no longer carries this case's answer. The
  tool's output is unchanged.
- **Not alongside.** The baselines (A to F) ran earlier the same day under the
  same briefs, not interleaved with A9 and B9.
- One model (Sonnet 5.5) and one case.
- No-browser compliance: all 30 Bash calls in the 10 B9 transcripts were
  checked for browser launches. There were none.
- 20 agents for 20 runs, none restarted or replaced; every run left
  `hero.html` unchanged and no scratch files.

Each run folder under [`runs/`](runs/) has the outputs, `grading.json` and
`timing.json`.
