# help.rtl.css: notes

`help.rtl.css` replaces `help.css` for both editions. Point the `<link>` in
each edition at it; the markup stays the same apart from `dir="rtl" lang="ar"`
on `<html>` in the Arabic one.

## What changed

Every rule that named a physical side now names a side of the text flow, so
"start" means left in English and right in Arabic. Each value maps to the one
that keeps English unchanged (`right` became `end`, never `start`).

| Selector | Before | After | Arabic result |
|---|---|---|---|
| `.help` | `max-width` | `max-inline-size` | same measure |
| `.crumbs ol`, `.note`, `.title h2` | `margin` shorthands | `margin-block` / `margin-inline` | same spacing |
| `.title h2` | `text-align: left`, `padding-right: 4rem` | `text-align: start`, `padding-inline-end: 4rem` | heading flush right; room for the tag on its left |
| `.tag` | `top`, `right: 0` | `inset-block-start`, `inset-inline-end: 0` | "New" tag moves to the left end of the title row |
| `.steps` | `padding-left: 1.5rem` | `padding-inline-start: 1.5rem` | numbers on the right. The old rule left the browser's default 40px on the right too, so Arabic lists were indented on both sides |
| `.note` | `border-left`, `padding-left` | `border-inline-start`, `padding-inline-start` | red rule on the right, where Arabic lines begin |
| `.next::after` | `" →"` | `" →"`, and `" ←"` under `:dir(rtl)` | arrow points the way the reader moves |

Two details that are easy to get wrong:

- **Breadcrumb separator.** `›` is a mirrored character in Unicode, so the
  browser already draws it as `‹` inside right-to-left text. It needs no
  transform; adding `scaleX(-1)` would flip it back the wrong way.
- **Next arrow.** `→` is not mirrored, so it is swapped explicitly. It is also
  marked decorative (`content: " →" / ""`) so screen readers do not announce
  "right arrow" after "Next: …"; the plain declaration before it is the
  fallback for engines that do not understand the alt-text syntax.

Flex layout, `text-indent`, symmetric padding and the pill radius already
follow the direction, so they were left alone.

## How it was checked

- English page with `help.css` and with `help.rtl.css`: screenshots are
  byte-identical at 1280px and 375px in Chromium and WebKit.
- Arabic test copy of the page (Arabic strings, `dir="rtl" lang="ar"`):
  measured tag, note border, list padding and arrow in both engines, and
  inspected the separator and arrow glyphs at high zoom. No horizontal
  scrolling at 375px. Test files are in `check/`.

## Left as is (separate decisions, not part of the RTL conversion)

- **Measure.** `36rem` gives about 82 characters per line in English and 83
  in Arabic at desktop width, longer than the comfortable 45 to 75. Something
  like `max-inline-size: 30rem` would bring it near 66, but that changes the
  English page, so it is a call for the design owner.
- **Arabic text size and leading.** Arabic in the system UI face reads a
  little small at 16px with 1.6 leading. If testing with readers agrees,
  add `:root:lang(ar) body { font-size: 1.0625rem; line-height: 1.75; }`
  (on the root, not a bare `:lang(ar)`, so code samples keep their own font).
- **No letter-spacing or forced justification** was added anywhere; both
  would break or distort joined Arabic letters.
- Long breadcrumb trails do not wrap on phones (`flex-wrap` is not set). That
  is equally true in English; add `flex-wrap: wrap` if trails get longer.
