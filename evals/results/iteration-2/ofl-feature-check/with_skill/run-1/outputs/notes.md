# article.css: font decisions

The font files were read with fontTools (`font-features.py --check`) and were not modified. Everything was verified in Chromium 156 against a test page with the real markup.

## What the files contain

| | Source Serif 4 roman | Source Serif 4 italic | Outfit |
|---|---|---|---|
| Axes | wght 200–900, opsz 8–60 | wght 200–900, opsz 8–60 | wght 100–900 (default instance is **Thin**) |
| Default digits | tabular lining | tabular lining | proportional lining |
| `onum` / `pnum` | yes, full 0–9 | yes, full 0–9 | no `onum`; `pnum` is the default |
| `tnum` | default already | default already | yes, full 0–9 |
| `smcp` / `c2sc` | yes, about 350 glyphs each | **absent** | absent |
| `case` | yes | yes | **absent** |
| other | `liga` (f), `zero`, `frac`, `sups` | same | `liga`, `dlig`, `ss01`, `salt` |

## Decisions

- **Text figures in prose.** Source Serif's default digits are tabular lining, so a "14 product teams" sentence would shout. `.prose` sets `oldstyle-nums proportional-nums`. Measured: "1111" is 30.9px with the setting and 36.7px with the default.
- **Tabular figures in the table.** Outfit's default digits are proportional ("1111" 22.2px vs "8888" 35.2px), so a column of numbers would not align. The table sets `lining-nums tabular-nums`, and every digit then measures 9.45px. Numeric cells are end-aligned. Rows are separated with an inset box-shadow hairline, so rules take no layout space.
- **True small caps for acronyms in roman.** `abbr` uses `all-small-caps` with +0.05em tracking. These are real `c2sc` glyphs: WCAG measures 47.5px against 52.5px as full caps, and the strokes match the lowercase.
- **Acronyms inside `em`: full italic capitals, not fake small caps.** The italic file has no `smcp` or `c2sc`. If synthesis were allowed, Chromium would shrink the capitals to 36.4px, which is a fake. With `font-synthesis: none` they render as real italic caps. The rule `:is(em, i) abbr` sets `font-variant-caps: normal` on purpose, with +0.04em tracking. The alternative is roman small caps inside the italic passage (`font-style: normal`). That breaks the emphasis, so it was rejected.
- **No `case` on the eyebrow.** Outfit has no case-sensitive forms, so turning the feature on would do nothing. Hyphens and dashes in the uppercase eyebrow stay at lowercase height. Avoid parentheses in eyebrow copy.
- **Ligatures:** defaults only. Source Serif `liga` covers fi/fl. Outfit's `dlig` and `ss01` alternates stay off, because they are decorative and serve no reading purpose here.
- **Optical size:** `font-optical-sizing: auto`, so 18px body text gets opsz 18. `font-synthesis: none` stops faux bold, italic and small caps.
- **`@font-face`:** weight ranges are declared explicitly. This matters most for Outfit, whose default instance is Thin. File names are percent-encoded (`%5B`, `%2C`, `%5D`) because `[`, `,` and `]` are reserved in URLs.

## Measure, scale, rhythm

- Body text is 18px (1.125rem) with a line-height of 1.6, so one line is 28.8px. The measure is `max-inline-size: 31em`, which gives **66.6 characters per line** (range 59–72), the same at 200% zoom. As a reference, 33em gave 71, and `ch` would mislead here because the zero is 0.56em while the average character is 0.45em.
- The scale uses a ratio of about 1.2, all in fixed rem: eyebrow 13px, table 16px, body 18px, h3 22px, h2 26px.
- Each heading line is exactly one body line. An h2 block takes 4 lines, an h3 block 3 lines and an eyebrow plus h2 5 lines. The table takes 9 lines (caption 1.5 plus five rows of 1.5). Measured block offsets all land on the interval. The exception is a table whose row label wraps at phone width, which adds 0.75 of a line.
- Paragraphs are marked by a one-line space and are not indented, because case studies are skimmed as much as read.
- Hyphenation: `hyphens: auto` with `hyphenate-limit-chars: 6 3 4`. The after-value is 4 because Chromium counts trailing punctuation: with 3 it produced "earli-er.". Headings and labels are not hyphenated.
- WCAG checks: no clipping with the 1.4.12 spacing overrides, and no horizontal scroll at 320px. Contrast: ink 16.8:1, muted 7.2:1, dark-mode muted 7.3:1.

## Follow-ups (not done)

- Serve WOFF2 instead of TTF; the roman file is 1.2 MB. Neither OFL file declares a Reserved Font Name, so converting or subsetting is allowed. Keep the OFL texts with the files, and check that `smcp`, `c2sc`, `onum` and `tnum` survive any subset (rerun `font-features.py`).
- A metric-matched Georgia fallback (`size-adjust`, `ascent-override`) would reduce the layout shift during `swap`.
- `em` inside Outfit headings renders upright, because Outfit has no italic and synthesis is off.
- Every `abbr` is set in small caps. If lowercase abbreviations such as "e.g." are ever marked up as `abbr`, give acronyms a class and scope the rule to it.
- Dark mode drops body weight to 380 to offset irradiation. Map the colour tokens and the `[data-theme]` hook to the site's own theme switch.
