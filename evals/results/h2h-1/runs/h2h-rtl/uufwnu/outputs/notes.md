# help.rtl.css notes

`help.rtl.css` replaces `help.css`. Point both editions at it: the English page as it is now, and the Arabic page with `<html lang="ar" dir="rtl">`. `help.html` is unchanged.

## What changed

| Rule | Before | Now | Why |
|---|---|---|---|
| `.help` | `max-width` | `max-inline-size` | Caps the line length along the reading axis. |
| `.title h2` | `text-align: left`, `padding-right` | `text-align: start`, `padding-inline-end` | Arabic headings align right. The space kept for the badge moves to the left. |
| `.tag` | `right: 0` | `inset-inline-end: 0` | The "New" badge sits at the end of the heading line in both directions. |
| `.steps` | `padding-left` | `padding-inline-start` | Leaves room for the list numbers, which go on the right in Arabic. |
| `.note` | `border-left`, `padding-left` | `border-inline-start`, `padding-inline-start` | The red rule marks where the line starts, which is the right edge in Arabic. |
| `.next::after` | `" →"` | `" ←"` under `[dir="rtl"]` | `→` is not a mirrored character, so the browser never flips it. "Next" must point along the reading direction. |
| Breadcrumb separator | `"›"` | `"‹"` under `[dir="rtl"]`, isolated as LTR | See below. |
| Arabic body text | n/a | `:lang(ar)`: Arabic-capable font stack, 18px, line-height 1.8 | At the same nominal size Arabic reads smaller than Latin. It also needs more leading for its tall letters, descenders and dots. |

The flex breadcrumb row, the symmetric margins and paddings, and `margin: 1.5rem 0` already work in both directions, so they are unchanged.

## The breadcrumb chevron

`›` is a mirrored character. Chromium already draws it as `‹` in an RTL line. Swapping in `‹` on its own makes it flip back to `›`, which points the wrong way. I checked this by rendering it. The stylesheet sets `‹` and gives the pseudo-element `direction: ltr; unicode-bidi: isolate`. That turns mirroring off, so every engine draws the same left-pointing chevron, whether or not it mirrors generated content.

## Verification (Chromium via Playwright, scratch files in `_check/`)

- English page, old `help.css` vs `help.rtl.css`: the screenshots match byte for byte, and computed boxes are identical.
- Arabic (`ar-markup.html` uses the real markup flipped to `dir="rtl" lang="ar"`; `ar-text.html` adds sample Arabic copy):
  - content is anchored to the right edge;
  - the badge, red rule and list numbers sit on the correct side;
  - the arrow and chevron point left.
- At a 350px viewport (about 200% zoom), neither direction scrolls horizontally.

## Left for the Arabic edition team

- **List digits.** The `ol` keeps Western digits (1. 2. 3.). Arabic-Indic digits are a regional choice. If you want them, add `:lang(ar) .steps { list-style-type: arabic-indic; }`.
- **Embedded Latin.** Wrap embedded Latin strings, such as English UI names like "File", in `<bdi>` or `dir="ltr"` in the translated markup. CSS cannot fix bidi ordering inside the copy.
- **Fonts.** The Arabic stack uses system fonts, so it adds no download. To make rendering consistent, self-host one Arabic family, such as Noto Sans Arabic, as WOFF2 subset to Arabic plus Latin, with `font-display: swap`.
