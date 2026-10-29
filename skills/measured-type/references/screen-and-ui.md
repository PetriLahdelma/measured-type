# Screen and interface type: checks from Latin and Saltz

Bringhurst says little about screens, inline code, icons beside labels or
heading hierarchy as a procedure. These ten checks come from two later books,
paraphrased and turned into measurements. `scripts/page-audit.js` runs all of
them; `scripts/lint-css.js` also catches kerning switched off in the source.

Sources and how firmly each was read:

- **Latin**: Matej Latin, *Better Web Typography for a Better Web* (2017;
  second edition 2021) and his articles at betterwebtype.com. *Confirmed*
  means read in his sample chapter or an article he says adapts a chapter;
  *article* means read in an article not stated to come from the book.
- **Saltz**: Ina Saltz, *Typography Essentials: 100 Design Principles for
  Working with Type* (2009; revised 2019). *Confirmed* means read in the
  publisher's preview; *snippet* means seen only as a search summary of a
  preview page; principle numbers are from the published contents.

Thresholds no source gives are house heuristics, calibrated in Chromium and
WebKit on macOS on 29 October 2026 (`specs/0002-book-checks.md`).

## Inline code

**Match the x-height, not the font size** (Latin, article). Monospace faces
have large x-heights, so code at the body's font-size reads bigger than the
words around it. Size it by x-height: Menlo beside Georgia matches at about
0.88em. `font-size-adjust: ex-height <body ratio>` does the same where it is
supported. The browser's own default for `font-family: monospace` alone is
13px against a 16px body, which overshoots the other way. Check:
`MT-CODE-XHEIGHT` flags a ratio outside 0.90 to 1.10 and prints the `em` size
that matches.

**Give boxed code room** (Latin, article). A background or border with
vertical padding draws outside the line box; at tight leading, boxes on
neighbouring lines collide. Raise the line-height or trim the padding. Check:
`MT-CODE-BOX`.

## Kerning

**Kerning is on unless someone turns it off** (Latin, confirmed, on checking
kerning; Bringhurst §2.1.8). Latin writes that `font-kerning: auto` kerns
large type and skips small type. In Chromium and WebKit on macOS in 2026 it
does not: `auto` set Arial and Source Serif 4 exactly as wide as `normal` at
12px and at 48px. Both were 3.6 to 9% narrower than `none`. What loses kerning is
`font-kerning: none` or `"kern" 0` in `font-feature-settings`. Some system faces (Georgia in these engines) show no
kerning difference at all; judge a candidate face by setting `TyHMAVA` and
looking at the pairs. Check: `MT-KERN-OFF`, in both scripts.

## Choosing and combining faces

**I, l and 1 must differ** (Latin, article; he names Helvetica and Arial).
When the capital I and lowercase l are the same stroke, words like
*Illinois* and codes like `Il1` become guesses. Prefer a serif, or a humanist
sans whose l has a tail or whose I has serifs. Check: `MT-CONFUSABLE` draws
both glyphs and flags an ink overlap of 0.82 or more. Calibration: Helvetica
Neue 1.00, Arial 0.99, Avenir Next 0.93, Futura 0.93, Helvetica 0.84 and Gill
Sans 0.83 are flagged; system-ui 0.80, Georgia 0.74, Verdana 0.68 and Times
New Roman 0.62 pass.

**Three families at most, each with a job** (Saltz, snippet, principle 43;
principles 78 and 79 by title; Latin, confirmed: one family is often enough).
Variety comes from weights and widths inside a family, not from more
families. Code fonts do not count. Check: `MT-FAMILY-COUNT` counts the
families Chromium actually rendered.

**Pair by x-height: match it or contrast it** (Latin, confirmed, from the
article adapted from his chapter 5). Two faces whose x-heights almost match
look like a mistake; a close match or a clear difference looks chosen. Check:
`MT-PAIR-XHEIGHT` flags a heading face 5 to 15% apart from the text face in
x-height per em. The bands are a house heuristic.

## Hierarchy and spacing

**Every heading level steps down** (Saltz, snippet: weight can outrank size;
principles 28 to 34 and 84 by title). An h3 as large as its h2 and heavier
reads as the more important heading. Each level should be smaller or lighter
than the one above. Check: `MT-HEADING-ORDER`.

**More space above a heading than below** (Latin, confirmed, sample chapter
6). A heading belongs to the text it introduces; equal margins leave it
floating between sections. Keep at least twice as much space above as below,
measured between the rendered boxes so collapsing margins cannot hide it.
An h1 under a kicker is left out: the kicker belongs to the title. Check:
`MT-HEADING-SPACE`.

## Weight and the screen

**A weight floor for reading text** (Latin, article: thin weights fail even
when the contrast ratio passes; Saltz, confirmed: older and visually impaired
readers need sturdier type). Keep reading text at 400 or heavier. The WCAG
ratio ignores weight; APCA's Lc (`scripts/apca.js`) is read against weight
and size, so the audit reports both. Check: `MT-WEIGHT-THIN`.

**Sturdier strokes and a little tracking on dark grounds** (Saltz,
confirmed, principle 6: light-emitting media). Light text on dark spreads and
thins; hairlines at small sizes break up. Below 18px on a dark ground, avoid
faces whose thinnest stroke renders under about 0.45px (Didot 0.27px and
Baskerville 0.40px at 14px; Georgia 0.60px passes) and open the tracking by
0.01 to 0.02em. Check: `MT-DARK-HAIRLINE`.

## Icons beside labels

**Centre the icon on the capitals** (Latin, article). Neither the baseline
nor the middle of the x-height is the visual centre of a label; the middle
of the capitals is. A 1em icon sitting on the baseline is about 2.8px too high
beside 18px Georgia. Align the icon's vertical centre to the middle of the cap
height: for a 1em icon, `vertical-align` of (cap height minus 1em) / 2, about
-0.154em for Georgia's cap height of 0.69em. Check: `MT-ICON-ALIGN` flags more
than 1px off either way and prints the value.
