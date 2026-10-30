# Spec 0010: a held-out twin of the hero case

Status: pre-registered 30 October 2026, before any run.

## Question

In spec 0009 every run with the skill met all three checks on the hero case
after `type-scale.js --fit` was added, but that case motivated the change and
the skill's examples used its exact sizes. Does the gain hold on a case the
skill has never seen?

## The case: `h2h-zoom-title`

A different page (a tide-table site), file names (`title.html`,
`title.css`), selector (`.display`), face (Helvetica Neue or Arial, bold),
starting value (`6vw`), prompt wording and requested sizes: **about 48px on a
phone and about 80px on a wide desktop**. Neither 48 nor 80px appears in any
example in the skill at `content-freeze-8` (which uses 40 to 72px) or on
`main` (32 to 60px). A single ramp from 48px at 360px to 80px at 1440px grows
1.50× at 200% zoom on a 1280px window, so the request and the house bar pull
against each other as in the hero case.

Graders ([`evals/h2h-grade.js`](../evals/h2h-grade.js), `gradeZoomTitle`),
the same three as the hero case: 2× by 500% zoom on a 1280px window; at least
1.6× at 200% zoom on a 1280px window; 38.4 to 57.6px at 360px and 64 to 96px
at 1440px (the requested sizes within 20%). Validated before commit: the
untouched `6vw` fails all three; the plain ramp and a naive
`clamp(3rem, 2.2rem + 3.6vw, 5rem)` fail only the 1.6× bar; a slow ramp that
gives up the desktop size fails only the sizes; the early-max and two-slope
forms from `--fit 3rem:5rem` pass all three. Re-grading a spec 0009 hero run
gives an identical result.

## Design

Claude Sonnet 5.5, ten runs per cell, every cell with the browser brief
([`evals/2x2/brief-browser.md`](../evals/2x2/brief-browser.md)):

| Cell | Skill | Hint |
|---|---|---|
| S | Measured Type at `content-freeze-8`, with `node_modules` | no |
| N | none | no |
| H | none | the spec 0008 sentence, after the task |

## Analysis (fixed now)

[`evals/0010/analyze.js`](../evals/0010/analyze.js) prints each cell's count
of runs meeting all three graders, each grader's count, mean and range of the
growth at 200% zoom, tokens and time, and:

- **Primary:** runs meeting all three graders, S against N and S against H,
  two-sided Fisher exact test.
- **Secondary:** growth at 200% zoom, S against N and S against H, exact
  permutation test.

How it will be read: a primary p below 0.025 (0.05 split over the two primary
comparisons) in favour of S is a held-out gain for the skill as of
`content-freeze-8`; between 0.025 and 0.05 it is reported as not surviving the
correction; above 0.05, no detectable difference.
