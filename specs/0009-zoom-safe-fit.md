# Spec 0009: zoom-safe answers for a requested range

Status: accepted 30 October 2026; shipped in `5c2cf4e` (tag
`content-freeze-8`); hero rerun results in
[`evals/results/0009/`](../evals/results/0009/). Each requirement has an ID; the test that
proves it carries the same ID in its name (`scripts/test/fit.test.js`).

## Why

In spec 0008, asked for a hero of about 40px on a phone and 72px on a large
desktop that still works under zoom, runs with the skill kept the sizes and
missed this project's 1.6× bar at 200% zoom (1 of 20 met both), and runs told
the bar gave up the 72px to reach it (6 of 20 met both). A single linear ramp
from 40px at 360px to 72px at 1440px cannot do both: it grows 1.43×. Two forms
can, and the six runs that met both used them:

- **Early max:** the same ramp, ending sooner. The size reaches its maximum
  by a width at which, on a 1280px window, the zoomed viewport (640 CSS px)
  still holds at least 0.8 of the maximum.
- **Two slopes:** `clamp(min, min(steep, gentle), max)`, steep up to 640px
  and gentle after it, so the requested sizes at both ends are kept exactly.

## Requirements

- **Z1** `type-scale.js --fit 2.5rem:4.5rem` (default viewports 360:1440)
  prints a two-slope candidate that keeps 40px at 360px and 72px at 1440px,
  grows at least 1.6× at 200% zoom on a 1280px window and reaches 2× by 500%
  zoom on every window from 320 to 2560px.
- **Z2** It also prints an early-max candidate that keeps 40px at 360px and
  72px at 1440px, reaches 72px by 880px, meets the same two zoom checks and
  names the width where the maximum is reached.
- **Z3** It reports the plain 360 to 1440px ramp with its growth (1.43×) as
  failing the 1.6× bar, and does not recommend it.
- **Z4** Chromium computes the same sizes as the script for both candidates
  within 0.1px at 360, 640, 1280 and 1440px.
- **Z5** When the plain ramp already passes (for example `--fit 2rem:2.5rem`)
  it is the recommendation.
- **Z6** The output lists, for each candidate, the growth at 200% zoom on
  1024, 1280, 1440 and 1920px windows, so a narrower window's lower growth is
  visible rather than hidden behind the 1280px bar.
- **Z7** `--fit` with a malformed or inverted range exits 2 with a message.
- **Z8** The linter evaluates `min()` inside `clamp()` and does not report
  MT-ZOOM-VW for the two-slope candidate; its MT-ZOOM-RANGE fix names
  `type-scale.js --fit` for a range the request fixed.
- **Z9** SKILL.md and `rules.md` §3.1.1 tell the agent to keep the requested
  sizes, run `--fit`, choose between the two forms and say which it chose.

## Rerun of the hero case (pre-registered before any run)

The skill as of tag `content-freeze-8`, on `h2h-zoom-hero` only, Claude
Sonnet 5.5, the 2×2 briefs unchanged:

| Cell | Skill | Browser | Runs |
|---|---|---|--:|
| A9 | `content-freeze-8` with `node_modules` | the brief offers Playwright | 10 |
| B9 | `content-freeze-8` without `npm install` | the brief forbids launching any browser | 10 |

[`evals/0009/analyze.js`](../evals/0009/analyze.js) compares them with the
earlier cells at ten runs (A and B at `content-freeze-6`, E and F with the
hint, from `evals/results/2x2` and `evals/results/0008`):

- **Primary:** the number of runs that pass all three graders, A9 against A
  and B9 against B, two-sided Fisher exact test.
- **Secondary:** the same count against E and F (the hint); growth at 200%
  zoom with the exact permutation test; how many runs keep the requested
  sizes; tokens and time.

How it will be read: a primary p below 0.05 in favour of A9 or B9 is credited
to the `--fit` guidance and tool. The baselines ran earlier the same day, not
alongside, and this is the case that motivated the change, so a gain here is a
development result, not a held-out one.
