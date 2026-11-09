# Spec 0032: the rest of the 9 November gap review

Status: accepted 9 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/gap-review-rest.test.js`).

## Why

Spec 0031 closed the three gaps from the 9 November review that the rendered
audit could measure with data it already had. Five remain:

- **G4** Rutter's talk and Schöndorfer step body text up on wide screens for
  viewing distance (16 to 18 to 22px; up to 24px on desktop). The skill keeps
  body text fixed and says nothing about it. A step is a media query on the
  window width, so page zoom, which narrows the window in CSS pixels, can drop
  back a step: a step from 16 to 24px grows only 1.33× at 200% zoom on a
  1280px window. The house bar of 1.6× applies to headings only.
- **G5** Tim Brown judges a pairing by texture, rhythm, proportion and shape,
  and lists x-height, extender length, character width, aperture and stroke
  contrast as the proportions to compare. The skill has one pairing check
  (`MT-PAIR-XHEIGHT`) and no way to read those numbers from the files.
- **G6** The skill states 45 to 75 characters as Bringhurst's rule without
  saying what reading research found. Mary Dyson's 2021 review of the screen
  studies finds no speed gain from short lines and a consistent preference for
  moderate ones.
- **G7** Rutter (after Tschichold) and Imperavi give rules for table chrome:
  columns sized to the data, few or no rules and fills, zebra stripes only for
  very wide or tall tables. `product-ui.md` covers figures, alignment and
  scrolling, not the chrome.
- **G8** Butterick lists typewriter stand-ins the punctuation check misses:
  (c), (TM) and (R) for ©, ™ and ®, and a breaking space after ¶ and §.

## Requirements

- **N1** `MT-PUNCT` reports `(c)` or `(C)` before a year or a capitalised
  name, `(tm)` or `(TM)` after a word and `(r)` or `(R)` closed up after a word,
  with ©, ™ and ® as the fixes, in the source lint and the rendered pass. A
  list label such as "(c) the third item" is not reported.
- **N2** `MT-PUNCT` reports ¶ or § (single or doubled) followed by a plain
  space and a number, with a no-break space (U+00A0) as the fix.
- **N3** `font-features.py --metrics` prints, per face, the x-height, cap
  height, ascender and descender (from the outlines of x, H, d and p) and the
  average advance of a to z, each per em, and the `font-size-adjust` value
  that matches the x-height; `--json` carries them as `metrics`.
- **N4** With two or more files, `--metrics` compares each face to the first
  (the anchor, normally the text face) in percent and names the x-height
  relation with `MT-PAIR-XHEIGHT`'s bands: within 5% matched, over 15%
  contrasted, between them neither.
- **N5** The rendered `MT-ZOOM-GROWTH` (LOW) also reports reading text that
  grows under 1.6× at 200% zoom on a 1280px window, as a body size stepped up
  by a media query does when zoom drops it back.
- **N6** `references/rules.md` §2.1.2 says what the research found (Dyson's
  review), §3.1.1 says how to step body text up for wide screens without
  failing the zoom bar, `references/taste.md` gives Brown's pairing method with
  `--metrics` for the proportion step, and `references/product-ui.md` gives
  the table chrome rules, each with its kind label.
