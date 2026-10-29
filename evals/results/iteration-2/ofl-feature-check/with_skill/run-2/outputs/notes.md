# Font decisions for article.css

I read all three files with fontTools (`font-features.py --check ...`) before
turning anything on. The files were not changed; their SHA-1 sums match before
and after.

## What the files contain

| | Source Serif 4 roman | Source Serif 4 italic | Outfit |
|---|---|---|---|
| Axes | wght 200–900, opsz 8–60 | wght 200–900, opsz 8–60 | wght 100–900 (default instance: **Thin**) |
| Default figures | tabular lining | tabular lining | proportional lining |
| `onum` / `pnum` | complete 0–9 | complete 0–9 | absent / present |
| `tnum` | (default already) | (default already) | complete 0–9 |
| `smcp` / `c2sc` | complete, ~350 glyphs each, incl. ä ö å | **absent** | absent |
| `case` | ( ) [ ] - – — | same | absent |
| `kern` | 1177 glyphs | 806 | 217 |

## Decisions

- **Text figures in prose.** Source Serif 4 defaults to tabular lining digits,
  which look loud in running text ("412 issues across 38 screens"). The prose
  sets `oldstyle-nums proportional-nums`; both roman and italic cover 0–9.
- **True small caps for acronyms.** `abbr` gets `all-small-caps` (needs
  `c2sc`, which the roman has in full) plus 0.05em tracking. Inspected at 3×:
  the strokes match the lowercase, so these are drawn small caps, not
  shrunken capitals.
- **Acronyms inside `em` stay full caps in italic.** The italic file has no
  `smcp` or `c2sc`. Without `font-synthesis: none` the browser would fake
  small caps by shrinking capitals. `em abbr` resets to `font-variant-caps:
  normal` with lighter 0.03em tracking. I chose not to switch these to upright
  small caps because that breaks the emphasis mid-phrase.
- **`font-synthesis: none` everywhere.** It also covers `em` inside an Outfit
  heading: Outfit has no italic, so the text stays upright and is never
  slanted.
- **Optical sizes on.** `font-optical-sizing: auto`, so body text renders at
  opsz 18. This changes the width: the measure was counted at that size.
- **Measure 32em, measured.** 66–69 characters per full line in Chromium (my
  case-study sample and the skill's built-in sample), the same at 200% zoom.
  The usual 34em gives 72–73 with this face. On a 375px phone the line is 38
  characters at 18px, which is normal for a phone.
- **Results table uses Outfit `tnum`.** Outfit's default digits are
  proportional, so a column of numbers would not line up. `tabular-nums` is
  complete for 0–9; the screenshot shows 1,240 / 412 / 148.6 aligned on the
  last digit. The table keeps its natural width so the numbers sit close to
  their labels.
- **Eyebrow: tracking, no `case`.** Uppercase through `text-transform`
  (the DOM keeps real casing), 600 weight, +0.08em letter- and word-spacing.
  Outfit has no `case` feature, so none is requested. `case` in Source Serif
  is not used because no caps text is set in it.
- **Turned off or left alone on purpose.** Outfit `ss01` (alternate e, g, k,
  m, n, t, 1) and `dlig` are style choices, not readability fixes. Slashed
  zero and `frac` are not needed for this content. Standard ligatures and
  kerning stay at the font defaults (`font-kerning: normal`).
- **Weight ranges declared in `@font-face`.** Outfit's default instance is
  Thin. With `font-weight: 100 900` declared, the browser maps 400 and 600
  onto the axis instead of relying on the fallback behaviour.

## Rhythm

One body line, `--line` = 18px × 1.55 = 27.9px. Headings, the eyebrow and every
table row are one line tall, and gaps are 0.5, 1, 1.5 or 2.5 lines. I checked
the block offsets in Chromium at 1280px and 320px: every paragraph starts on
the same half-line phase, including after wrapped headings and a table row
that wraps on a phone. Table rules are inset shadows, so a 1px rule adds no
height. I did not use `text-box` trimming on headings because it would push
the text after them off the interval.

## Licence (OFL) points to know before optimising

- Both families are under SIL OFL 1.1. Serving the unmodified TTFs is fine,
  and each file carries the licence in its name table (IDs 13/14). Deploy the
  `*-OFL.txt` files alongside the fonts anyway.
- **Source Serif 4 has a Reserved Font Name: "Source".** That is stated in the
  font's own copyright string ("with Reserved Font Name 'Source'"). The
  `SourceSerif4-OFL.txt` shipped next to it leaves this out. Copy the upstream
  text into it so the RFN is on record.
- Because of the RFN, **subsetting Source Serif 4** (or any other edit to the
  font data) creates a Modified Version that may not be called "Source…" and
  would need renaming inside the font. Plain WOFF2 compression with the font
  data unchanged is, as I read the OFL FAQ, not a modification. Check the FAQ
  before you rely on that. Outfit declares no RFN.
- Size matters here: the roman TTF is 1.2 MB and the italic 0.86 MB. Any
  WOFF2 conversion should keep every feature listed above; rerun
  `font-features.py` on the converted files, since subsetting tools often
  strip `smcp`, `c2sc` and `onum`.

## Not covered

No colours beyond `currentColor` (the table rules mix it to 22%). No dark-mode
adjustments, and no metric-matched fallback `@font-face`. Every `abbr` in
`.prose` is treated as an acronym. If lowercase abbreviations such as "kg" or
"e.g." appear, give acronyms a class and scope the rule to it.
