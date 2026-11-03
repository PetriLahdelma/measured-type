# Spec 0024: false positives in the rendered page audit

Status: accepted 3 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/false-positives.test.js`).

## Why

`page-audit.js` was run against public design system sites on 3 November
2026. It reported text the page hides on purpose as a WCAG failure and could
not run at all on a page served with a strict Content-Security-Policy. A check
that fires on a correct page is as serious a bug as one that misses a broken
page (CONTRIBUTING.md, "No false blocks"), so each fault below was reproduced
with a local fixture before it was fixed.

## Requirements

- **V1** MT-TEXT-SPACING does not report text that is visually hidden on
  purpose: an element, or an ancestor of it, clipped to nothing with
  `clip-path: inset(50%)` or more, a `clip: rect()` of zero area, or a box of
  1px or less that hides its overflow. This holds when the hidden box measures
  more than 1px, as a screen-reader-only `<caption>` does when the table's
  caption padding is not reset. A visible box that clips under the override is
  still reported.
