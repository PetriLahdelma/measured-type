# help.rtl.css: notes

`help.rtl.css` replaces `help.css` for both editions. It is the same stylesheet with every left/right value rewritten as start/end of the line, plus two small rules for Arabic. `help.html` is untouched; the Arabic edition only needs `lang="ar" dir="rtl"` on `<html>` and a link to this file.

## What changed and why

| Original | Now | Why |
|---|---|---|
| `.help { max-width }` | `max-inline-size` | The measure is a line length, so it follows the text direction. |
| `.title h2 { text-align: left }` | `text-align: start` | In Arabic, `left` would push the heading to the wrong edge. |
| `.title h2 { padding-right: 4rem }` | `padding-inline-end` | The space kept clear for the badge has to move with the badge. |
| `.tag { top: 0.25rem; right: 0 }` | `inset-block-start` / `inset-inline-end` | The "New" badge sits at the end of the heading line in both editions. |
| `.steps { padding-left }` | `padding-inline-start` | A physical left padding leaves the browser's default list indent on the right in Arabic, so the list was padded on both sides. |
| `.note { border-left; padding-left }` | `border-inline-start` / `padding-inline-start` | The rule marking the note belongs at the start of the line. |
| `.next::after { content: " →" }` | adds `.next:dir(rtl)::after { content: " ←" }` | Arrows are not mirrored by the browser; "next" has to point leftward in Arabic. |
| breadcrumb `›` separator | left as is | The browser mirrors `›` inside right-to-left text. Measured: it points left in the Arabic test page in Chromium and WebKit, so flipping it would turn it back the wrong way. |
| (new) `:root:lang(ar) body` | Arabic-capable font stack, `line-height: 1.8` | Arabic needs a family that covers the script on every platform and more leading for its deeper descenders and stacked marks. It's set on `body`, so any code or monospace text added later keeps its own family. |

I added no letter-spacing anywhere. Tracking breaks the joins between Arabic letters. The flex breadcrumb, the symmetric margins and the badge's padding already work in both directions, so they stay as they were.

## Verified

- **English unchanged.** Screenshots of `help.html` with the old and the new stylesheet are byte-identical at 1280 px and at 320 px (Chromium).
- **Arabic mirrors.** I tested the same markup with `dir="rtl" lang="ar"`, plus a copy with Arabic text (`check/rtl-ar.html`). The heading aligns right and the badge sits at its left end without overlapping the text. The note rule and the list indent are on the right, the breadcrumb runs right to left, the separator and the "next" arrow point left, and there's no sideways scroll at 320 px. The rendered-page audit found nothing in the Arabic copy.
- **Not verified:** Firefox (no engine installed here). The Arabic font is whatever the OS supplies through the stack; no web font was tested.

## For the editors

- Step numbers use Western digits (1. 2. 3.). If the Arabic house style prefers Arabic-Indic digits, add `:root:lang(ar) .steps { list-style-type: arabic-indic; }`. That's a content decision, so I didn't make it.
- In the Arabic copy, wrap file names, URLs, shortcuts or product codes in `<bdi>` or `<span dir="ltr">` so their characters stay in order.

Scratch test pages and scripts are in `check/`.
