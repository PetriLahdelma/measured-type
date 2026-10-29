# Font decisions for article.css

Every feature below was checked in the actual files with fontTools (GSUB/GPOS feature lists, lookup contents and glyph advances), then rendered in Chromium and WebKit with a sample case study. The font files were read only, never modified.

## What the files contain

| File | Axes | Useful GSUB features | Not present |
|---|---|---|---|
| SourceSerif4[opsz,wght] | wght 200-900, opsz 8-60 | smcp, c2sc, onum, lnum, pnum, tnum, case, liga, frac, zero | dlig |
| SourceSerif4-Italic[opsz,wght] | wght 200-900, opsz 8-60 | onum, lnum, pnum, tnum, case, liga, ss03 (alternate &) | **smcp, c2sc** |
| Outfit[wght] | wght 100-900 | liga, dlig, tnum, pnum, ss01/salt, frac (3 glyphs only), sups (1-4 only) | case, smcp, onum, lnum, zero |

All three have GPOS `kern`. Outfit has no thin space (U+2009), narrow no-break space (U+202F) or figure space (U+2007).

## Decisions

**Optical size on the body.** Source Serif 4 has a real opsz axis, so `font-optical-sizing: auto` (stated explicitly) lets the browser pick the text cut at 17 to 20 px. No manual `font-variation-settings`, which would freeze opsz and break inheritance.

**Oldstyle proportional figures in running text.** The serif's default digits are tabular lining (every digit 500 units). In prose that makes years and counts look like a spreadsheet. `oldstyle-nums proportional-nums` turns on `onum` (lookup 40) then `pnum` (lookup 41); the second lookup maps the oldstyle glyphs to their proportional versions, so the combination genuinely produces proportional oldstyle figures rather than one feature cancelling the other.

**Small caps for acronyms, roman only.** `abbr` uses `font-variant-caps: all-small-caps`, which maps WCAG, SAP and API through the font's own `c2sc`, with 0.04em tracking. This is the feature that most improves a case study full of acronyms.

**Acronyms inside `em` stay full caps.** The Italic file has no `smcp` or `c2sc`. Rendering showed that, by default, both Chromium and WebKit then synthesise small caps by shrinking capitals, which gives thin, light letters that do not match the italic. `font-synthesis: none` on `.prose` stops that, and `.prose em abbr` sets `font-variant-caps: normal` with 0.02em tracking so the fallback is deliberate. The same rule also blocks faux bold and faux italic, which are never needed because both families ship real italics and full weight axes.

**Headings: Outfit with standard ligatures only.** Outfit's `liga` (fi, fl, ff and a joined tt) is part of the design and stays on. `dlig` (Th, TT, ft, rf, tf) is decorative and stays off. Heading figures reset to the font default, proportional lining, since oldstyle figures do not exist in Outfit anyway.

**Tabular figures in the results table.** Outfit's default digits are proportional (1 is 321 units, 0 is 659), so a column of numbers would wobble. `tabular-nums` switches all ten digits to `.tf` glyphs at 590 units; measured in both engines, "111" and "000" render at identical widths. Number columns are end-aligned so places line up.

**Eyebrow: tracked uppercase, no `case`.** Outfit has no `case` feature and no small caps, so the eyebrow uses `text-transform: uppercase` with 0.1em tracking at weight 600. Hyphens, slashes and parentheses will sit at lowercase height in that label, so keep eyebrow copy to words and numbers.

**Features deliberately not used.**
- Serif `zero` (slashed zero): adds noise in prose.
- Serif `ss01`/`ss02`: Cyrillic alternates only, irrelevant for English.
- Italic `ss03`: an "Et" style ampersand. Available if wanted, but a stylistic choice rather than a readability gain.
- Outfit `ss01`/`salt`: alternate e and 1 that change the face's character.
- Outfit `frac`/`sups`: cover only 1/4, 1/2, 3/4 and superscript 1 to 4, so they would fail on arbitrary values.

## Practical notes

- `@font-face` URLs percent-encode the square brackets in the file names; both engines loaded all three faces from those URLs.
- Weight ranges in `@font-face` (200 900 and 100 900) match the fvar axes, so every CSS weight maps onto the variable axis.
- Do not feed table numbers formatted with U+202F or U+2009 (for example from a Finnish or French `Intl.NumberFormat`) into the Outfit table; those spaces fall back to another font. English formatting with commas is fully covered.
- The roman TTF is 1.2 MB and the italic 0.86 MB, so they are heavy for a web page. See the licence note before making smaller copies.

## Licence check (OFL 1.1)

- Both families are SIL OFL 1.1 with fsType 0 (embedding unrestricted), so self-hosting the files as they are is fine. Keep both OFL.txt files next to the fonts.
- **Mismatch to be aware of:** the Source Serif 4 TTFs declare `Reserved Font Name 'Source'` in their own copyright string (name ID 0, Adobe 2014-2021), but `SourceSerif4-OFL.txt` beside them names no Reserved Font Name. The font's embedded notice is the stricter one, so treat "Source" as reserved.
- What this means in practice: a subset (for example Latin only) is a Modified Version under the OFL. A modified copy of Source Serif 4 must not be distributed under a name containing "Source", so it would need a new internal name and a matching new `font-family` in the CSS (for example "Article Serif"). Serving the unmodified TTFs, as article.css does, avoids the question. Outfit declares no Reserved Font Name, so a subset of it only needs to keep the licence.
- If you do subset, keep the features this stylesheet relies on: smcp, c2sc, onum, pnum, tnum, kern and liga.
