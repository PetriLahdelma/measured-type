# Font decisions for article.css

I checked all three served files with `scripts/font-features.py`, which counts the glyphs each feature actually covers. Having a tag is not the same as covering the glyphs, and the roman and the italic turned out to differ. I left the font files unchanged.

| Feature | Source Serif 4 roman | Source Serif 4 Italic | Outfit |
|---|---|---|---|
| `onum` oldstyle figures | 0-9 | 0-9 | absent |
| `pnum` / `tnum` | both | both | both (`tnum` covers 0-9) |
| `smcp` / `c2sc` small caps | 355 / 346 glyphs, a-z and A-Z | **absent** | absent |
| `case` | yes | yes | **absent** |
| `kern` (GPOS) | yes | yes | yes |
| Axes | wght 200-900, opsz 8-60 | wght 200-900, opsz 8-60 | wght 100-900 (default instance Thin) |

The default figures come from `hmtx`. In Source Serif 4 every digit is 500 units wide, so the defaults are tabular lining. In Outfit the `1` is 321 units and the `0` is 659, so the defaults are proportional lining.

## What I turned on and why

- **Body figures: `oldstyle-nums proportional-nums`.** Source Serif's tabular lining defaults make numbers shout in running text and leave gaps around the narrow digits. Both features are present in the roman and the italic. When rendered, `1111` is 30.9px wide and `0000` is 40.2px, so the proportional widths really are applied.
- **Acronyms: `font-variant-caps: all-small-caps` with 0.05em tracking.** This uses the roman's real `c2sc`. Acronyms then sit at x-height instead of shouting. I kept them on one line and stopped them hyphenating.
- **Acronyms inside `em`.** The italic file has no small caps at all. Asking for them there would give either full caps (with `font-synthesis: none`) or shrunken fake capitals (without it). Inside `em`, `i` and `cite` I explicitly set `font-variant-caps: normal` with 0.03em tracking. Those acronyms are italic capitals, so the emphasis stays italic. The alternative was upright roman small caps inside the italic, but that breaks the emphasised passage in the middle. If house style prefers it, switch the rule to `font-style: normal`.
- **`font-synthesis: none` on the whole article.** No faux bold, italic or small caps can appear. Outfit has no italic, so an `em` in a heading stays upright, which is the honest fallback.
- **`font-optical-sizing: auto`.** Source Serif's opsz axis then follows the size: the text cut at 18px, with sturdier serifs for small text and finer ones for large text.
- **Results table: `tabular-nums` in Outfit.** It uses Outfit's `tnum`, so the columns align (the `312` and `148` cells both render 37.8px for four digits). The numeric columns are end-aligned and do not wrap. I did not request `lining-nums`: Outfit has no `lnum` because its figures are already lining.
- **Eyebrow: uppercase via `text-transform`, 0.08em tracking, weight 600, 14px.** Outfit has no `case` feature, so hyphens and parentheses in an eyebrow cannot be raised to cap height. Write eyebrow copy without them; an en dash range such as 2025–2026 still looks fine.
- **Not used:** Outfit's `ss01` alternates and `dlig` change the face's character rather than helping reading. Source Serif's `zero`, `frac` and `sups` have no matching content.
- **Kerning:** `font-kerning: normal` everywhere, so all three files use their GPOS kerning.
- **`@font-face`:** each variable file declares its full weight range, so the browser never synthesizes bold. This matters for Outfit, whose default instance is Thin. Brackets in the file names are percent-encoded in `url()`. All three faces loaded in Chromium.

## Measure, scale and rhythm

- **Body:** 1.125rem (18px) at line-height 1.5. One body line `--line` is 27px, and every gap is a whole or half line. Measured in Chromium, the gaps are 13.5 / 27 / 40.5px.
- **Measure: `max-inline-size: 31em`.** `scripts/measure-line.js` counted **66.6 characters per line** (range 59-72) at 1280px. My first value, 36em, gave 78. On a 375px phone it is about 37 characters, which is normal for that width; hyphenation (limits 6 3 3) helps there.
- **Headings (Outfit 600):**
  - h2 is 2rem with line-height 1.5 lines (1.27).
  - h3 is 1.375rem with line-height one line (1.23).
  - That gives steps of 1.45x and 1.22x, and wrapped headings stay on the 27px interval.
- **Paragraphs:** block paragraphs separated by one line, with no indents. Text is ragged with `text-wrap: pretty`.
