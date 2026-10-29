# help.rtl.css

A drop-in replacement for help.css. The Arabic edition links it with `dir="rtl" lang="ar"` on `<html>`; the English page can link it too and renders pixel-identical to help.css (screenshots compared byte for byte in Chromium and WebKit at 700px and 360px).

## What changed

Every left/right property became its logical start/end equivalent, so it follows the document direction:

| help.css | help.rtl.css | Effect in RTL |
|---|---|---|
| `.help { max-width }` | `max-inline-size` | same measure, column sits at the right |
| `.title h2 { text-align: left; padding-right: 4rem }` | `text-align: start; padding-inline-end` | heading aligns right; space is reserved on the left for the tag |
| `.tag { right: 0 }` | `inset-inline-end: 0` | "New" badge moves to the left end of the heading row |
| `.steps { padding-left }` | `padding-inline-start` | list numbers get their gutter on the right |
| `.note { border-left; padding-left }` | `border-inline-start; padding-inline-start` | the red rule sits on the right, where the line starts |

Symmetric values (body padding, the `0 0.5em` separator margin, `margin: 0 0 1.5rem`, the badge radius) needed nothing. The breadcrumb flex row already follows the inline direction.

## The two glyphs

- **Next link arrow.** "→" is not a mirrored character, so in RTL it would point back toward the start of the line. `.next:dir(rtl)::after` swaps it for "←".
- **Breadcrumb separator.** "›" is a mirrored character: browsers already draw it as "‹" in RTL text. Swapping the content by hand without more would flip it back to the wrong way (measured: it then points right in both engines). Relying on automatic mirroring is fragile, so the separator is isolated as LTR (no engine mirrors it) and the RTL glyph is chosen explicitly. Result: it points along the reading direction in both languages.

## Checks

The `check/` folder holds an Arabic test page with the same markup, an English copy pointing at the new stylesheet, and the Playwright scripts used: `shoot.js` (EN identical, computed RTL geometry), `orient.js` (measures which way each separator points from rendered pixels), and `narrow.js` (360px, no horizontal scroll). Firefox was not available in this environment, so it is untested; the features used (logical properties, `:dir()`, `unicode-bidi: isolate`) are supported there.

## Left for the editors

- Step numbers render as Western digits (1, 2, 3). If the Arabic edition uses Arabic-Indic digits in body copy, add `:lang(ar) .steps { list-style-type: arabic-indic; }` so the list matches.
- `system-ui` picks the platform's Arabic face. If the edition has a brand Arabic font, add it ahead of `system-ui` under `:lang(ar)`.
