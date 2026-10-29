# help.rtl.css notes

`help.rtl.css` is a drop-in replacement for `help.css`. Point the page's `<link>` at it (or replace the contents of `help.css` with it). The same file serves the English page (`dir="ltr" lang="en"`) and the Arabic edition (`dir="rtl" lang="ar"`); nothing in it is keyed to the language, only to direction.

## What changed and why

| Rule in help.css | Problem in RTL | Change |
|---|---|---|
| `.title h2 { text-align: left; padding-right: 4rem }` | Arabic heading would hug the wrong edge, and the space reserved for the badge would sit on the side the text starts from. | `text-align: start`, `padding-inline-end` |
| `.tag { right: 0 }` | The "New" badge would stay on the right and land on top of the heading text. | `inset-inline-end: 0` |
| `.steps { padding-left }` | List numbers sit on the right in RTL, so the indent was on the wrong side and the markers hung outside the content box. | `padding-inline-start` |
| `.note { border-left; padding-left }` | The accent rule marks where reading starts, which is the right edge in Arabic. | `border-inline-start`, `padding-inline-start` |
| `.crumbs li + li::before { content: "›"; margin: 0 0.5em }` | The separator has to point to the deeper level, which is leftward in Arabic. Whether the plain character flips depends on bidi mirroring resolving it as right-to-left text. | Glyph is isolated as left-to-right (so it is never mirrored) and chosen per direction: `›` for LTR, `‹` for RTL. Margin uses `margin-inline` (same values). |
| `.next::after { content: " →" }` | The right arrow is not a mirrored character, so it would point backwards in Arabic. | `←` under RTL, `→` under LTR. |

Unchanged: the flex breadcrumb row (flex already follows the inline direction), body type, colours, the `max-width` container and all vertical spacing.

Direction-specific glyphs are selected with both `[dir="rtl"]` and `:dir()` in separate rules. `:dir()` follows the inherited direction (so a nested `dir="ltr"` island inside the Arabic page gets the right arrow), and the attribute rule is a fallback for older browsers; a single selector list would be dropped entirely by a browser that does not recognise `:dir()`.

## How it was checked (Chromium via Playwright, scripts in `_test/`)

- English page with `help.css` vs. with `help.rtl.css`: screenshots are byte-identical.
- Arabic page (`dir="rtl" lang="ar"`, translated sample text): heading starts at the right edge, badge sits at the left end of the title row with the heading padded away from it, list markers and note border are on the right, breadcrumbs run right to left, the separators measure as left-pointing from the rendered pixels, and the "Next" link ends in `←`.
- The untranslated English markup with only `dir="rtl"` flipped gives the same geometry.

## Not covered by CSS

The list items and the note in `help.html` are still English, so in the RTL test their trailing full stops display at the left end of each line. That is correct bidi behaviour for Latin text in an RTL paragraph and goes away once the copy is translated; it needs no style change.
