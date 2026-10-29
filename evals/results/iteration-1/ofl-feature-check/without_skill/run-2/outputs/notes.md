# article.css: font decisions

Every feature choice below comes from reading the three font files with fontTools (GSUB/GPOS feature lists, glyph mappings, advance widths). Each choice was then checked in a Chromium render of sample case-study markup at 900px and 375px.

## What the files actually contain

| | Source Serif 4 roman | Source Serif 4 italic | Outfit |
|---|---|---|---|
| Axes | opsz 8-60, wght 200-900 | opsz 8-60, wght 200-900 | wght 100-900 |
| Small caps (`smcp`, `c2sc`) | yes | **no** | **no** |
| Default figures | tabular lining (all 500 units) | tabular lining | **proportional** lining (0 = 659, 1 = 321) |
| `onum` / `pnum` / `tnum` | yes / yes / yes | yes / yes / yes | no / yes / yes |
| `case` | yes | yes | **no** |
| Other | `frac`, `zero`, `sups`, `subs` | same, plus `ss03` alt ampersand | `liga`, `dlig`, `ss01`/`salt` (alt e g k m) |

## Decisions

**Acronyms (`abbr`) in roman text: `font-variant-caps: all-small-caps`.** The roman has real small caps through `c2sc` and `smcp`, so WCAG, SAP and API sit at x-height and stop shouting in a paragraph. There is 0.04em tracking because small caps need a little air.

**Acronyms inside `em`: full caps, no small caps.** The italic file has no small-cap glyphs. With `all-small-caps` left on, Chromium faked them by shrinking the capitals: thin, too small and visibly mismatched. I confirmed this in a render. So `em abbr` resets to `font-variant-caps: normal` and gets 0.02em tracking. As a second layer, `.prose` sets `font-synthesis: none`. If an acronym in a context without small caps is ever missed, it falls back to real capitals and is never faked.

**Acronyms in headings, eyebrow and table: normal caps.** Outfit has no small caps either, so the same synthesis problem applies there.

**Body figures: `oldstyle-nums proportional-nums`.** The serif's default figures are tabular lining, which look like capitals in running text and leave gaps in "1,180". Oldstyle proportional figures sit with the lowercase and match the small-cap acronyms. Headings reset to `normal`, since Outfit has only lining figures.

**Results table: `lining-nums tabular-nums` in Outfit.** Outfit's default figures are proportional, so the columns would not align. `tnum` switches to its `.tf` equal-width set. Number columns are right-aligned so digits line up by place value.

**Optical size: `font-optical-sizing: auto`, never `font-variation-settings`.** The opsz axis follows font-size: body at 17-19px gets the sturdier text cut, and any larger lead text gets the finer display cut. Pinning opsz or wght in `font-variation-settings` would freeze them and stop them inheriting.

**Ligatures: defaults on, `dlig` off.** The serif's `liga` (fi, fl, ff, ffi, ft) is standard. Outfit's `liga` includes an "outfit" ligature. I rendered it to check that it is not a wordmark: it only joins t and f, so it is safe in words like "outfitted". Outfit's `dlig` (T_h, r_t, f_t and others) is decorative and stays off.

**Eyebrow: uppercase Outfit with 0.1em tracking.** Outfit has no `case` feature, so caps spacing is set by hand.

**Not used, on purpose.**
- `frac`: applying it globally would turn dates such as 10/2026 into fractions.
- `zero` (slashed zero): exists only in the serif, and there is no code in this content.
- Outfit `ss01`: a brand look choice (alternate e, g, k, m), not a readability fix.
- Serif `ss01`/`ss02`: Cyrillic locale alternates, not relevant here.
- `case` in the serif: there are no all-caps serif settings.

## Other settings

- `@font-face` declares weight ranges (200 900, 100 900) so the browser uses the axis instead of synthesizing bold. The italic is registered as `font-style: italic` on the same family, so `em` gets the true italic. `font-display: swap`.
- Measure: 64ch, about 70 characters per line. Line-height 1.6 for the serif (its ascender plus descender is 1.37em) and 1.15 to 1.25 for headings.
- `hyphens: auto` relies on `lang="en"`. Also set: `text-wrap: pretty` on paragraphs, `balance` on headings and `hanging-punctuation` (Safari only).
- Colors inherit. Rules use `color-mix()` on `currentColor`, so the stylesheet hardcodes no colors and follows the site theme. `--prose-eyebrow-color` is an optional hook.

## Follow-ups outside this file

- The TTFs are 1.2 MB (roman), 0.86 MB (italic) and 0.11 MB (Outfit). They were left unmodified as asked. Converting them to WOFF2 and subsetting to Latin would cut most of that weight; the `src` URLs would then change.
- The file names contain `[`, `]` and `,`. They work quoted in `url()` against a normal static server. Some CDNs or build tools mishandle them, so renaming on deploy is worth considering.
