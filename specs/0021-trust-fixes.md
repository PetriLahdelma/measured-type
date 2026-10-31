# Spec 0021: trust fixes from the third council

Status: accepted 31 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/trust.test.js`).

## Why

Twelve expert seats each built a page with planted faults, ran the skill on
it and fixed it (council 3, 31 October 2026). Following the skill fixed every
fault, but the tools misled them in two ways. Some checks contradicted the
skill's own advice: lint flagged the clamp `type-scale.js --fit` recommends,
and the font-display rule flagged the fallback faces `fallback-metrics.py`
prints. Other checks applied Latin, prose or round-number assumptions where
they do not hold: Arabic read as capitals, an acronym told to take tracking, a
caps paragraph told to take tracking instead of lower case, a 12px token read
as 11.9994px and failing a 12px floor. Each fault below was reproduced before
it was fixed. A tool that contradicts its own advice costs more trust than a
check it does not have, so these come before any new check.

## Requirements

- **T1** MT-QUOTES finds straight apostrophes in words of any length
  ("it's", "didn't", "readers'") and straight single quotes, not only after a
  one-letter word ("I'm"). Code, scripts and attributes stay exempt.
- **T2** MT-ZOOM-RANGE does not fire on a fluid size that already passes the
  zoom bar `type-scale.js --fit` uses: at least 1.6× at 200% zoom on a 1280px
  window and 2× at 500%. The range is then the design's choice. The two-slope
  clamp that `--fit` recommends lints clean.
- **T3** Capitals are counted on cased letters only. Text whose cased
  letters are fewer than half its letters (Arabic with a Latin product code)
  is not set in capitals. One word of five or fewer capitals written in
  capitals (DACH, USB-C) is an acronym, not a label to track. Text in `code`,
  `kbd`, `samp`, `pre` and `tt` is never reported for capitals.
- **T4** Running text in capitals (more than 60 cased letters on a page, or
  `text-transform: uppercase` on a reading selector in a stylesheet) is
  MT-CAPS-TEXT MEDIUM, with lower case as the fix. It is never told to add
  letter-spacing.
- **T5** MT-HEADING-ORDER compares each heading with the nearest higher-level
  heading before it, not with the first heading of that level on the page.
- **T6** `apca.js` runs from the command line: two colours print the Lc
  value and exit 0; anything else prints usage and exits 2. The module export
  is unchanged.
- **T7** `font-features.py` and `fallback-metrics.py` open font collections
  (`.ttc`, `.otc`), most of the system faces on macOS. Face 0 is the default,
  `--font-number N` picks another and the output names the face used. A
  number outside the collection is an error.
- **T8** An `@font-face` whose `src` is only `local()` is not MT-FONT-DISPLAY:
  `font-display` does nothing for a local face. The faces
  `fallback-metrics.py` prints lint clean.
- **T9** MT-FONT-FALLBACK does not fire when the first family is a web font
  that loaded under another name (the file's own name table says something
  else), nor when text in a script the first family does not cover is drawn by
  a later family in the same stack. A first family that never loaded is still
  reported.
- **T10** MT-SIZE-FLOOR and MT-UI-SIZE ignore differences under 0.01px, so
  a size computed from rem tokens that rounds to the floor passes.
- **T11** Justified text with `hyphens: auto` and no `lang` on it or an
  ancestor is MT-JUSTIFY: the browser has no dictionary and hyphenates
  nothing. Justified CJK text is not MT-JUSTIFY: setting it solid to the full
  measure is the convention, and it needs no hyphens.
- **T12** MT-HEADING-RUNT does not count ruby annotations (`rt`, `rp`) as a
  line of the heading.

## Not in scope

The council's other requests (a `lang` check, a rendered punctuation pass,
broken price and unit tokens, synthesized bold and italic, font loading
checks, joining-script and CJK checks, print rows) are new checks, not fixes.
They are the next spec. So is the verdict wording ("Approve, N to fix" when
MEDIUM findings remain), which changes what spec 0004 decided.
