# article.css: font decisions

Every feature below was checked against the font files themselves (fontTools dump of `fvar`, `GSUB`, `GPOS`, `OS/2`, `hmtx`), not assumed from the family name. The files were read only, never modified. Output was rendered in Chromium to confirm the result.

## What the files actually contain

| | Source Serif 4 Roman | Source Serif 4 Italic | Outfit |
|---|---|---|---|
| Axes | wght 200-900, opsz 8-60 | wght 200-900, opsz 8-60 | wght 100-900 |
| Small caps (`smcp`, `c2sc`) | yes (355 / 346 glyphs) | **no** | no |
| Figures | default tabular lining; `onum`, `pnum`, `tnum`, `lnum` | same | default proportional lining; `tnum` only |
| `case` | yes | yes | **no** |
| Ligatures | `liga` (fi fl ff ffi ffl ft) | `liga` (16, incl. fb fh fk) | `liga` (fi fl ff fj tt + "outfit" wordmarks), `dlig` |
| Other | `zero`, `frac`, `sups`, `subs`, ss01/ss02 = Cyrillic locale forms | adds ss03 (alt ampersand) | ss01/`salt` = alternate e g k m |

## Decisions

**Optical size.** `font-optical-sizing: auto` lets the opsz axis track font-size. Body text at 17-20px lands on opsz 17-20, the design's text range. It also does work for the italic acronyms below.

**Prose figures.** Source Serif 4's default digits are tabular lining (all 500 units wide), which is a table setting. Running text uses `oldstyle-nums proportional-nums` (`onum` + `pnum`) so "2023", "1,284" and "37%" sit with the lowercase.

**Acronyms in roman.** `font-variant-caps: all-small-caps` turns on `c2sc` + `smcp`, both present, so WCAG, SAP and API become true small caps with 0.05em tracking. The default dotted `abbr[title]` underline is removed; it is noise in long reading.

**Acronyms inside `em` (the trap).** The italic file has no `smcp` and no `c2sc`. `all-small-caps` there would make the browser synthesize small caps by shrinking capitals, which come out thin and off-colour. The CSS builds them on purpose instead: `font-size: 0.82em` (the roman small-cap height 550 divided by cap height 670, so roman and italic acronyms match), a lower opsz picked automatically for the smaller size, `font-weight: 460` to restore stroke weight and 0.06em tracking. Rendered side by side, the italic and roman versions match in height.

**Headings.** Outfit 600 / 550 with slight negative tracking at display size, `text-wrap: balance`, no hyphenation. Outfit has no italic, so `em` in a heading borrows the real Source Serif 4 italic rather than a faux oblique (`font-synthesis: none` everywhere guards against fake bold, italic and small caps). Outfit has no small caps either, so acronyms in headings and the table stay as capitals.

**Outfit ligatures.** `liga` is kept for fi, fl and tt. It also contains wordmark ligatures for lowercase "outfit", "outfitted" and "outfitter", which tighten the word into the Outfit logotype. Capitalised "Outfit" and words such as "outfitting" in title case are unaffected. If a heading ever needs lowercase "outfit", wrap it in a span with `font-variant-ligatures: no-common-ligatures`. `dlig` (Th, Tl, rf) and the ss01 alternates are decorative and left off.

**Eyebrow.** Outfit has no `case` or `cpsp`, so uppercase spacing is set by hand (0.1em). `tnum` keeps counters like "03 / 07" steady.

**Results table.** Outfit with `tabular-nums` (`tnum` maps all ten digits to 590-unit `.tf` forms) and right-aligned number columns, so values line up by place value. Outfit has only lining figures, which suits a table. Two content notes: the minus sign U+2212 exists but is not figure-width (526 vs 590), and Outfit has **no thin space** (U+2009, U+202F), so use commas for thousands or the narrow space will fall back to another font.

**Not used, on purpose.** `zero` (slashed zero reads as code), `frac` (Outfit only has three precomposed fractions), `font-variant-position` (Chrome ignores it and the markup has no `sup`).

## Loading

- `@font-face` uses weight ranges (`200 900`, `100 900`) so one file serves every weight. Brackets in the file names are percent-encoded in `url()`.
- `font-display: swap` plus metric-matched fallbacks (`size-adjust`, `ascent-override`, `descent-override`) on local Georgia and Arial, computed from the files' advance widths and hhea metrics, so the swap does not reflow the article.
- The TTFs are 1.2 MB, 855 KB and 111 KB. Serving WOFF2 copies would cut that substantially. Neither OFL file declares a Reserved Font Name, so a WOFF2 conversion or subset could keep the family name; ship the OFL text with any such copy.
