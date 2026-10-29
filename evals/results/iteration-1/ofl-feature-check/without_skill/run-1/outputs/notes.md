# article.css: font decisions

All three files were inspected with fontTools (name, fvar, OS/2, GSUB, GPOS). Nothing was modified. Every feature turned on in the CSS exists in the font that renders it; the ones that are missing are worked around on purpose.

## What the files contain

| | Source Serif 4 Roman | Source Serif 4 Italic | Outfit |
|---|---|---|---|
| Axes | wght 200-900, opsz 8-60 | wght 200-900, opsz 8-60 | wght 100-900 (default is Thin) |
| Small caps | smcp, c2sc (c2sc covers 0-9 and &) | **none** | none |
| Figures | default tabular lining; onum, pnum, lnum, tnum, zero | same | default **proportional** lining; tnum, pnum only |
| case | yes | yes | **no** |
| Ligatures | liga: ff fi fl ffi ffl ft fj | liga, more f-combinations | liga (fi fl ff t_t, plus an "outfit" wordmark ligature), dlig |
| Other | frac, sups, subs, sinf, ordn; ss01/ss02 are Cyrillic only | ss03 alternate ampersand | ss01/salt alternates for e g k m n t 1 & |

## Decisions

**Optical size.** `font-optical-sizing: auto` lets Source Serif 4 pick the opsz that matches the rendered px size (17-19px body gets the text cut). I never set opsz in `font-variation-settings`, because that freezes one cut for every size.

**Body figures: `oldstyle-nums proportional-nums`.** Source Serif 4 defaults to tabular lining figures (every digit 500 units wide). In prose that leaves holes around the 1 and makes years and counts stand taller than the lowercase. Proportional oldstyle figures read as text.

**Acronyms: `font-variant-caps: all-small-caps`.** This turns on c2sc + smcp, so WCAG, SAP and API set in true small caps (553 units tall against 670 for capitals) with +0.035em tracking. Since c2sc also maps digits and &, a code like "ISO 27001" inside an abbr stays in one texture.

**Acronyms inside em.** The italic has no smcp or c2sc. Left alone, browsers would *synthesise* small caps there (scaled capitals, thin stems). So `.prose` sets `font-synthesis-small-caps: none`, and `em abbr` falls back to the italic's real capitals with light tracking. In the roman they are small caps, in the italic they are capitals. That is a deliberate, honest fallback, not a faked glyph.

**Results table: `tabular-nums`.** Outfit's default digits are proportional (0 is 659 units, 1 is 321) and kerned in pairs, so columns drift. Its `.tf` digits are all 590 units and carry no kerning pairs. In Chromium and WebKit, "312", "111.8" and "40" measured exactly 3, 4 and 2 digit widths. Number columns are right-aligned. Outfit has only lining figures, so there is no lnum/onum to set. Outfit's minus sign (526) and % are not tabular and it has no figure space (U+2007), so keep suffixes consistent per column.

**Eyebrow.** Outfit 600, 12px, uppercase, +0.09em tracking. Outfit has no `case` feature, so hyphens and brackets cannot be raised to cap height; keep them out of eyebrow copy.

**Headings.** Outfit 600 with slight negative tracking at h2 size, `text-wrap: balance`. Cap heights match closely (Outfit 676, Source Serif 670; x-heights 460 vs 475), so the two families sit together without size tweaks.

**Ligatures and kerning.** Common ligatures and kerning are on (the browser default, stated explicitly). Discretionary ligatures (Outfit dlig: T_h, r_t, f_t) are left off; they are decorative. One gotcha: Outfit's standard `liga` contains a wordmark ligature for "outfit", "outfitted" and "outfitter" that sets the word about 6% tighter. It only fires on that word, so I left `liga` on.

**Not used, on purpose.** Outfit ss01/salt (a stylistic rework of e, g, k, m, n, t, 1, &; a brand call, not a legibility one). Source Serif 4 ss01/ss02 (Cyrillic locale forms, irrelevant for `lang="en"`). `zero`, `frac`, `sups`: no slashed zeros, fractions or superscripts in this markup. Outfit `sups` only covers 1-4 and `ordn` is empty, so never use `font-variant-position` with it.

**Fallback metrics.** `Source Serif 4 Fallback` (Georgia) and `Outfit Fallback` (Arial, Arial Bold for weights 550+) use `size-adjust` and ascent/descent overrides computed from letter-frequency-weighted advance widths and the web fonts' typo metrics. Measured in Chromium, a 600px three-line paragraph keeps the same height and the unwrapped width stays within 0.3% (serif) and 1% (Outfit), so the swap does not reflow the article.

## Deployment notes

- File names contain `[`, `]` and `,`, so the `url()`s are percent-encoded.
- The TTFs are large (Source Serif 4 roman 1.2 MB, italic 855 KB) because they carry Greek, Cyrillic and two axes. For production, generate WOFF2 copies (and a Latin `unicode-range` subset) as a build step, keep these originals untouched and keep the opsz axis in the subset. Preload the roman only.
- Both fonts are OFL 1.1. The license files sit beside them in `fonts/` and should ship with them. Neither copyright line declares a Reserved Font Name, so a subset or WOFF2 copy may keep the family names (a converted or subset file still counts as a Modified Version under the OFL, so it must stay under the OFL).
