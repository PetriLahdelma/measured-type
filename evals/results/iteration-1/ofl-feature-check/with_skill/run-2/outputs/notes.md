# Font decisions for article.css

## What the files actually contain

Checked with `font-features.py` on the three served files (glyph counts are what each feature substitutes):

| Feature | Source Serif 4 roman | Source Serif 4 italic | Outfit |
|---|---|---|---|
| axes | wght 200–900, opsz 8–60 | wght 200–900, opsz 8–60 | wght 100–900 (default instance is Thin) |
| default figures | tabular lining (every digit 500 units) | tabular lining | proportional lining |
| `onum` | yes, 0–9 | yes, 0–9 | **absent** |
| `lnum` | only from oldstyle alternates | same | **absent** (not needed) |
| `tnum` | yes | yes | yes, 0–9 |
| `smcp` / `c2sc` | 355 / 346 glyphs, A–Z, a–z, accents, figures | **absent** | **absent** |
| `case` | yes | yes | **absent** |
| `kern` (GPOS) | yes | yes | yes |

## Decisions

- **Body figures:** `oldstyle-nums proportional-nums`. Source Serif 4 defaults to tabular lining, which looks stiff in prose. Both roman and italic have `onum`, so emphasized numbers match.
- **Acronyms (WCAG, SAP, API):** `all-small-caps` with 0.05em tracking. The roman maps capitals through `c2sc`, so these are drawn small caps, not shrunken capitals. Rendered check: `WCAG` measures 50.2px as small caps against 56.1px as full caps.
- **Acronyms inside `em`:** the italic has no small caps. With `font-synthesis: none` set, the browser does not fake them (forcing small caps in the italic rendered at exactly the full-caps width, so nothing changed). I set them as true italic full capitals with light tracking, which keeps the emphasis unbroken. The alternative is `font-style: normal` on `em abbr`, which gives roman small caps but visually breaks out of the italic phrase. Choose that if house style prefers small caps everywhere.
- **Optical size:** `font-optical-sizing: auto` lets the 8–60 `opsz` axis follow the 18px body.
- **Outfit, headings and eyebrow:** default lining proportional figures are right for display, so `font-variant-numeric` is reset to `normal`. No `onum` or `lnum` is requested because Outfit has neither. Outfit has no `case`, so a hyphen or parenthesis in the uppercase eyebrow stays at lowercase height. Keep eyebrow labels to words and figures; en dash ranges still read fine. Outfit has no italic, so an `em` in a heading stays upright instead of becoming a fake slant.
- **Results table:** Outfit `tabular-nums` on the number columns only, right-aligned so values line up on the last digit. Label cells keep proportional figures, since tabular ones looked like a monospace "a11y". The table is auto width so figures stay close to their labels.
- **Not used:** Outfit `ss01`, `dlig` and `frac` (its `frac` covers only 1 and 3). Source Serif `zero`, `sups` and `ordn` are not needed for this markup. Everything goes through `font-variant-*` instead of `font-feature-settings`, so kerning and default ligatures stay on.
- **@font-face:** each file declares its full `wght` range. This matters most for Outfit, whose default instance is Thin. The roman and italic share one family name with `font-style` set, so `em` picks the real italic. `font-display: swap`.

## Measure and rhythm

- 18px body on a 1.6 leading gives `--line` = 28.8px. h2 (32px) and h3 (24px) sit on 1.25 and 1 lines, and every gap is a quarter, half or whole multiple of `--line`. Rendered gaps under h2 and h3 are 21.6px and 14.4px, as intended.
- `max-inline-size: 31em` measured 66 characters per line in Chromium (range 59–72), unchanged at 200% zoom. `60ch` would not give 66 here: the oldstyle zero is 0.56em against a 0.47em average character.
- On a 375px phone the column falls to about 41 characters, which is normal for 18px text at that width.

## Production note

The TTFs are served as given. Converting copies to WOFF2 (and subsetting by `unicode-range`) would cut transfer size. Do not let a subsetter drop `onum`, `smcp`, `c2sc` or `tnum`, and re-run the feature check on whatever files actually ship.
