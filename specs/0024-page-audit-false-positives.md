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
- **V2** MT-REFLOW, where hidden overflow stops the page from scrolling,
  counts only text that runs past the inline-end edge of the viewport: the
  right edge when the text's `direction` is `ltr`, the left edge when it is
  `rtl`. Text wholly beyond the start edge (a skip link at `left: -1000px`
  that waits there until it takes focus) and text placed wholly off-screen
  with absolute or fixed positioning (an off-canvas menu) are not reported.
  The amount reported is how far the text runs past the end edge and is
  always positive. On designsystem.suomi.fi the audit reported a skip link
  as "text runs -1146px past the 320px viewport".
- **V3** The rendered audit runs on a page whose Content-Security-Policy
  forbids inline scripts, whether the policy comes in a header or a `<meta>`
  tag, and reports that page's findings. Every page the audit opens bypasses
  the policy, which changes nothing the reader sees. On primer.style the audit
  stopped with "page.addScriptTag: Executing inline script violates the
  following Content Security Policy directive".
