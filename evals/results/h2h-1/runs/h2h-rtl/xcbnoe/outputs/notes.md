# help.rtl.css: notes

One stylesheet serves both editions. Point help.html (and the Arabic copy) at
`help.rtl.css` instead of `help.css`; the markup is unchanged apart from
`lang="ar" dir="rtl"` on `<html>` in the Arabic edition.

## What changed and why

| Original rule | Problem in RTL | Now |
| --- | --- | --- |
| `.title h2 { text-align: left }` | Arabic heading would hug the wrong edge | `text-align: start` |
| `.title h2 { padding-right: 4rem }` | Space reserved for the badge sits on the side the text starts from | `padding-inline-end` |
| `.tag { top; right: 0 }` | Badge would overlap the start of the Arabic heading | `inset-block-start`, `inset-inline-end` |
| `.steps { padding-left }` | List numbers sit on the right in RTL and would have no room | `padding-inline-start` |
| `.note { border-left; padding-left }` | Accent bar belongs on the reading-start side | `border-inline-start`, `padding-inline-start` |
| `.crumbs li + li::before { margin: 0 0.5em }` | Symmetric already; rewritten as `margin-inline` for consistency | Same spacing |
| Separator `"›"` | It is a bidi-mirrored character, so its RTL rendering depends on each engine mirroring it | Isolated as a left-to-right run so nothing mirrors it, and the RTL edition picks `‹` explicitly |
| `.next::after { content: " →" }` | Arrows are not mirrored, so it would point backwards in Arabic | `←` under `[dir="rtl"]`; a no-break space keeps the arrow on the last word's line |

Additions:

- Arabic body text gets `line-height: 1.8` (Latin stays at `1.6`). Arabic
  letterforms are taller and carry marks above and below the line, so the
  Latin leading looks cramped.
- `.tag` gets `white-space: nowrap` so a translated badge label never breaks.
- The font stack is unchanged. `system-ui` falls back to the platform's Arabic
  face, so no new font is added.

## Verification (Chromium via Playwright)

- English page with `help.css` and with `help.rtl.css`: full-page screenshots
  are byte-identical at 800px.
- Arabic test copy (same markup with Arabic text, `dir="rtl" lang="ar"`): the
  heading and paragraphs are right-aligned, the badge sits at the left end of
  the heading row inside the reserved padding, list numbers and the note bar
  are on the right, and the breadcrumbs run right to left. A pixel check
  confirms the separators point left and the "next" arrow points left.
- Arabic page at 320px: no horizontal overflow and the badge does not overlap
  the heading.
- Not verified: Firefox and Safari rendering, and 200% zoom.

Test files and scripts are in `_check/`; they are scaffolding and can be deleted.
