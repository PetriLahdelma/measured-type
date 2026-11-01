# Spec 0022: checks for what the guidance already says

Status: accepted 1 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/parity.test.js`).

## Why

In the third council (31 October 2026) the guidance named 93% of the planted
faults and the tools printed 46%. An agent that audits by running the tools
got `Verdict: Approve` on a Japanese page declared English, on faux bold, on
prices split across lines and on `--` typed for a dash. Each of those is
something the references already tell an agent to fix, and each can be
decided in a rendered page. This spec adds the checks for the language
layer, rendered punctuation, number and unit tokens, synthesized styles and
font loading, and changes the verdict so an audit with work left does not
read as a sign-off.

The rule for every check here is precision over recall: a check fires only on
what the page decides. Where Chromium's behaviour was in doubt it was probed
first. One probe changed the design: a variable font declared in
`@font-face` without a weight range still renders a real bold in Chromium, so
comparing the requested weight with the declared faces would report faux bold
that is not there. The bold and italic checks compare rendered ink instead.
A second probe shaped F3: a fallback that `fallback-metrics.py` matched to
within 0.9% in width still gave a heading one more line at 375px, so a check
on movement alone would report the skill's own fix. F3 measures the
mismatch the fix removes and reports movement only when it is there.

## Requirements

### V. The verdict

- **V1** The verdict is `Block (N HIGH)` when a HIGH finding remains,
  `Approve, N to fix` when no HIGH remains and N MEDIUM rows do (findings
  with the same rule and measured value are one row, as the report table
  shows them), and `Approve` when only LOW findings or none remain. The
  linter, the rendered audit and lite mode say the same. The exit code is
  unchanged: 1 only with a HIGH finding. This amends spec 0001, which said
  "Approve" otherwise.

### L. Language

- **L1** A document whose `<html>` has no `lang`, or an empty one, is
  MT-LANG MEDIUM: without it the browser picks no hyphenation dictionary, no
  quotes for `quotes: auto`, no `locl` forms and no screen-reader voice. The
  linter reports it for a file that contains an `<html>` tag; the rendered
  audit for every page.
- **L2** A `lang` value that is not a language tag (`en_US`, `english`) is
  MT-LANG MEDIUM, in the source and in the rendered page. An empty `lang` on
  an inner element is valid HTML for "language unknown" and is not reported.
  `lang` on `<script>`, `<style>` and `<template>` (`lang="ts"` and
  `lang="scss"` in single-file components) is not a language and is left
  alone.
- **L3** Text whose script is not the script of its declared language is
  MT-LANG MEDIUM in the rendered audit: at least 20 letters governed by one
  `lang`, more than 60% of them in another script (Japanese under
  `lang="en"`, Latin under `lang="ar"`). Languages written in more than one
  script (Serbian, Bosnian, Uzbek, Azerbaijani, Kazakh, Kurdish, Mongolian,
  Punjabi, Sindhi) are exempt. A language written in the same script cannot
  be told apart this way (Finnish declared English), so that is listed
  under Not verified, never passed.

### P. Punctuation in the text

- **P1** Text has its punctuation checked as the reader gets it: the
  rendered audit reads the text nodes of the page, including text a script
  inserted, so MT-MINUS, MT-RANGE and MT-QUOTES are rendered checks too.
  Text in `code`, `kbd`, `samp`, `pre`, `tt`, `textarea`, `script` and
  `style` is exempt, as in the linter.
- **P2** MT-PUNCT LOW, in the linter's text pass and the rendered pass:
  two hyphens for a dash (`a -- b`, `a--b`; a command-line flag such as
  `--verbose` is not one), three full stops for an ellipsis, `x` between two
  numbers for a multiplication sign (`1920x1080`, `3 x 4`; a hex number such
  as `0x1F` is not one) and straight quotes as primes (`5'11"`, `6'`, `45°30'`;
  a Swiss thousands mark as in `1'000` is not one). Each finding names the
  character to use.
- **P3** In text whose `lang` is English, Finnish, Swedish, German or
  French, a quotation mark that opens a quote but is not an opening mark of
  that language is MT-QUOTES LOW, with the language's marks as the fix: `“` to
  open in Finnish or Swedish (they use `” ”`), in German (`„ “`) or `„` in
  English. Other languages are not judged.

### U. Numbers and their units

- **U1** A price, a quantity with its unit or a price with its period that
  the rendered page breaks across two lines, at 1280, 768, 375 or 320px, is
  MT-NUM-BREAK MEDIUM: `29 €`, `€ 29`, `1 299 EUR`, `250 GB`, `12 ms`, `50 %`,
  `€29 / month`. The finding names the token and the widths where it broke;
  the fix is a no-break space (U+00A0, or U+202F for a number and its unit)
  or `white-space: nowrap` on the token. A token joined by a no-break space
  never breaks there and is not reported.

### S. Synthesized styles

- **S1** Bold text the browser draws by thickening a lighter face is
  MT-BOLD-SYNTH MEDIUM: the audit draws a sample of the text in its own
  computed font with and without `font-synthesis-weight: none`, and different
  ink means the bold was synthesized. A variable font whose weight axis covers
  the weight draws the same ink and is not reported, whatever its
  `@font-face` declares.
- **S2** Italic text drawn as a slanted roman is MT-ITALIC-SYNTH MEDIUM, by
  the same test with `font-synthesis-style: none`. Text that already turns
  synthesis off is not reported. For CJK text the fix is no italic at all.

### F. Font loading

- **F1** MT-FONT-DISPLAY also reports `font-display: block` and an explicit
  `auto` (the browser default, which hides text for up to three seconds) on
  a face that downloads, in the source and in the rendered page. The
  rendered audit reads `@font-face` rules from the stylesheets it can read
  and lists the others under Not verified.
- **F2** `font-optical-sizing: none` on text whose rendered face has an
  `opsz` axis is MT-OPSZ-OFF LOW: the audit measures a sample at two optical
  sizes, and different widths mean the axis exists and the page has switched
  it off. A face without the axis, and text that sets `opsz` itself in
  `font-variation-settings`, are not reported.
- **F3** Text that moves because its fallback is not metric-matched is
  MT-FONT-SWAP MEDIUM. The audit loads the page a second time with every
  font request refused and compares the text blocks in the first screen at
  1280 and 375px. It reports when a block moves more than 4px and the
  fallback sets the text more than 2.5% wider or narrower than the web font,
  or its lines more than 1px taller or shorter. Movement alone is not
  enough: a matched fallback still rewraps a line that sits on a break
  (measured: within 0.9% in width, yet the heading gains a line at 375px),
  and that is chance the fix cannot remove. So the fallback
  `fallback-metrics.py` prints is not reported, faces with
  `font-display: optional` are exempt (a reader never sees them swap) and a
  page without web fonts has nothing to measure.

## Not in scope

From the council's P1 list, these are the next spec: phone numbers
splitting; letter-spacing and italic on joining scripts and CJK; long italic
passages; a rendered line-height check; `var()` resolution in the linter;
adjacent scale steps under 1.15×; heading order at 375px; mixed decimals in
a number column; code leading, ligatures and a Courier fallback; print
rows. Hyphenation under the wrong dictionary needs the language of the text,
which the script does not give for two Latin languages; L3 lists it as not
verified rather than guessing.
