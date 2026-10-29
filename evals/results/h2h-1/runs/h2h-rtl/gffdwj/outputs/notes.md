# help.rtl.css notes

`help.rtl.css` is a drop-in replacement for `help.css`. Both editions link it; only the `dir`/`lang` on `<html>` differ.

## Direction fixes (layout mirrors in Arabic)

Everything in `help.css` that named a physical side now uses a logical (start/end) property. These resolve to left/right in English and flip in Arabic:

| Before | After | Why |
|---|---|---|
| `.title h2 { text-align: left }` | `text-align: start` | The Arabic heading was pinned to the wrong edge. |
| `.title h2 { padding-right: 4rem }` | `padding-inline-end` | Keeps the room for the tag on the side where the tag actually sits. |
| `.tag { top; right: 0 }` | `inset-block-start; inset-inline-end: 0` | The "New" pill moves to the end of the heading line (left in Arabic). |
| `.steps { padding-left }` | `padding-inline-start` | List numbers sit on the right in Arabic and need the indent there. |
| `.note { border-left; padding-left }` | `border-inline-start; padding-inline-start` | The callout rule moves to the leading edge. |

Arrows and separators:

- `.next::after` uses "→", which browsers never mirror. In RTL it becomes "←" so it still points forward.
- The breadcrumb separator "›" should mirror in theory, but Chromium drew it unmirrored in testing, so RTL swaps it to "‹" explicitly.
- The breadcrumb row is flex, so its order already follows the text direction. I added `flex-wrap: wrap` so a long trail wraps instead of overflowing at high zoom; it has no effect at normal widths.

## Arabic text settings (scoped to `:lang(ar)`)

- Body goes from 16px to 18px with 1.75 leading. Arabic letter bodies read smaller than Latin at the same nominal size, and dots and vowel marks need vertical room. The tag gets the same proportional bump; the heading keeps tighter 1.4 leading so the tag still lines up with it.
- Font stack names Arabic-capable system faces (Segoe UI, SF Arabic, Geeza Pro, Noto Sans Arabic, Tahoma) after `system-ui`, so no platform falls back to an arbitrary default.
- `letter-spacing: normal` and `font-synthesis-style: none`: tracking breaks the joins in a connected script, and a fake slanted italic is meaningless in Arabic. Weight synthesis stays on so headings stay bold.

## Verification

Rendered with Playwright (Chromium, 800px viewport); scripts and screenshots are in `_test/`.

- English with `help.rtl.css` vs `help.css`: 0 differences in position, size, font size or weight across every element.
- Arabic (`_test/ar.html`, the same markup with Arabic copy): heading and text start at the right edge, tag at the heading's left end, note border on the right (4px right, 0px left), list indent on the right (24px), both arrows point left.

## Not changed

- List numbers stay Western digits ("1. 2. 3."). If the Arabic editorial style prefers Eastern Arabic digits, add `:lang(ar) .steps { list-style-type: arabic-indic; }`.
- The 36rem content width holds about 60 to 70 characters per line at both sizes, so no change was needed.
