# Spec 0002: checks from Latin and Saltz

Status: accepted, 29 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`scripts/test/book-checks.test.js`,
`lint-css.test.js`, `apca.test.js`).

## Why

Bringhurst gives the principles but barely covers the screen: inline code,
icons beside labels, heading hierarchy as a procedure, font quality checks on
a rendered page and readers on light-emitting displays. Two books cover more
of that ground, Matej Latin's *Better Web Typography for a Better Web* and Ina
Saltz's *Typography Essentials*. Their tips enter Measured Type only as checks
a browser can run, each with its source and how firmly that source was
confirmed (research notes, 29 October 2026: Latin's book through his sample
chapter and articles he says adapt it; Saltz's through her principle titles,
publisher preview and course pages).

Confidence labels used below:

- **confirmed**: read in the source (book sample, publisher preview or the
  author's own article).
- **confirmed (article)**: read in an article by the author that is not stated
  to come from the book.
- **snippet**: seen only as a search summary of a preview page.
- **inferred**: suggested by a title or table of contents, not read.

Thresholds that no source gives are calibrated here and labelled as house
heuristics.

## Calibration (29 October 2026, Chromium and WebKit on macOS)

- **Kerning defaults.** Latin writes that `font-kerning: auto` kerns large
  type and skips small type. Rendering `AVAVTyTyWaWa` in Arial and Source
  Serif 4 at 12px and 48px gave identical widths for `auto` and `normal` in
  both engines, 3.6 to 9% narrower than `none`. In these engines `auto` kerns
  at every size; kerning is lost only when it is switched off. Georgia showed
  no kerning difference in either engine. `text-rendering: optimizeSpeed` did
  not change the width in Chromium.
- **I and l.** Ink overlap (intersection over union of the two glyphs at 48px,
  centred) in Chromium: Helvetica Neue 1.00, Arial 0.99, Avenir Next 0.93,
  Futura 0.93, Helvetica 0.84, Gill Sans 0.83, system-ui 0.80, Optima 0.77,
  Georgia 0.74, Verdana 0.68, Trebuchet MS 0.64, Tahoma 0.62, Times New Roman
  0.62, Menlo 0.53. A threshold of 0.82 flags the faces Latin names (Arial,
  Helvetica) and passes the humanist sans and serif faces he recommends.
- **Hairlines.** Thinnest stroke of `o` at 14px: Didot 0.27px, Bodoni 72
  0.28px, Avenir Next 200 0.34px, Baskerville 0.40px, Hoefler Text 0.53px,
  Times New Roman 0.54px, Georgia 0.60px, Verdana 1.18px. A threshold of
  0.45px separates the high-contrast and hairline faces from the text faces.

## G. Rendered checks (`scripts/page-audit.js`)

- **G1 Inline code x-height** (Latin, confirmed (article): set a monospace
  face so it sits with the body, his example 14px down to 12px). For `code`,
  `kbd` and `samp` inside reading text, the rendered x-height in px (canvas
  `measureText('x')`, or `font-size-adjust` when set) is compared with the
  surrounding text's. Outside 0.90 to 1.10 of it: `MT-CODE-XHEIGHT` LOW, with
  both x-heights, the ratio and the `font-size` in `em` that would match.
  The browser's 13px default for `font-family: monospace` is caught by the
  same check.
- **G2 Inline code boxes** (Latin, confirmed (article): add line-height when
  inline code has background boxes). When inline code has a background or
  border and its boxes on two different lines overlap both vertically and
  horizontally: `MT-CODE-BOX` LOW with the overlap in px.
- **G3 Kerning switched off** (Latin, confirmed: check kerning; Bringhurst
  §2.1.8). For reading blocks and headings, a sample of kerning pairs is set
  in the element's font with its own `font-kerning`, `font-feature-settings`
  and `text-rendering`, then again with kerning forced on. Wider by more than
  0.5%: `MT-KERN-OFF` LOW, with the difference. The static linter reports
  `font-kerning: none` and `"kern" 0` or `"kern" off` under the same ID.
- **G4 I and l alike** (Latin, confirmed (article): reject body faces whose
  1, l and I look alike; he names Helvetica and Arial). The reading font's
  `I` and `l` are drawn on canvas; ink overlap of 0.82 or more:
  `MT-CONFUSABLE` LOW, with the overlap and the `l`/`1` overlap for
  information. House threshold, calibrated above.
- **G5 Heading order** (Saltz, snippet: weight can outrank size in
  hierarchy; principles 28 to 34 and 84 by title). For each heading level
  present, the first visible heading is compared with the nearest higher
  level present. Equal or larger in size and equal or heavier in weight:
  `MT-HEADING-ORDER` MEDIUM, with both sizes and weights.
- **G6 Family budget** (Saltz, snippet: principle 43, the rule of three
  typefaces; 78 and 79 by title; Latin, confirmed: one family is often
  enough). Typeface families actually rendered on the page (DevTools
  `CSS.getPlatformFontsForNode`), not counting code elements or families that
  draw fewer than 10 glyphs: more than three is `MT-FAMILY-COUNT` LOW, with
  the families.
- **G7 Pairing by x-height** (Latin, confirmed (article adapted from his
  chapter 5): x-heights should match closely or differ clearly). When the
  headings' family differs from the body's, their x-heights as a fraction of
  the em are compared. A difference of more than 5% and less than 15% is
  `MT-PAIR-XHEIGHT` LOW, with both values. The bands are a house heuristic;
  no source gives them.
- **G8 Space around headings** (Latin, confirmed from his sample chapter 6:
  the space below a heading must be noticeably smaller than the space above).
  For section headings (h2 to h6; an h1 often sits under a kicker that
  belongs to it) with a visible block before and after them, the rendered gap
  above is compared with the gap below. Above less than twice below:
  `MT-HEADING-SPACE` LOW, with both gaps.
- **G9 Weight floor** (Latin, confirmed (article): thin weights fail in body
  text even when a contrast checker passes; Saltz, confirmed: older and
  visually impaired readers). Reading text with a computed weight or `wght`
  variation under 400: `MT-WEIGHT-THIN` MEDIUM, with the WCAG ratio and the
  APCA Lc (`scripts/apca.js`, APCA-W3 0.0.98G-4g), which accounts for weight.
- **G10 Hairlines on dark grounds** (Saltz, confirmed from her principle 6:
  light-emitting media call for sturdier letterforms and a little more
  tracking). Light text on a darker ground under 18px whose thinnest stroke
  renders under 0.45px: `MT-DARK-HAIRLINE` LOW, with the stroke width. The fix
  names a sturdier weight or face and 0.01 to 0.02em of tracking. House
  threshold, calibrated above.
- **G11 Icons beside labels** (Latin, confirmed (article): align an icon's
  centre to the middle of the capital letters, not to the baseline). For
  `svg` and `img` that share a line with text in the same parent, the icon's
  vertical centre is compared with the label's baseline minus half its cap
  height. More than 1px apart: `MT-ICON-ALIGN` LOW, with the offset and the
  `vertical-align` that would centre it.

## H. Integrity

- **H1** Every new rule is in `references/audit.md` with its severity, check
  and source; the catalog test still passes in both directions.
- **H2** `clean.html` triggers none of the new rules; it and the
  editorial `after.html` still produce no HIGH or MEDIUM findings. Each new
  fixture triggers its own rule; where a check has a natural negative case, the
  test asserts it too.
- **H3** `scripts/apca.js` reproduces the APCA reference values: `#888` text
  on `#fff` is Lc 63.06 and `#fff` text on `#888` is Lc -68.54.
- **H4** The skill's guidance (`references/` and SKILL.md) states each tip
  once, with its source and confidence label; it also records the kerning
  calibration that contradicts the `auto` claim.
