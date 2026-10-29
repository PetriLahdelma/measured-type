# help.rtl.css

A drop-in replacement for help.css. The English page renders exactly as before; the Arabic edition only needs `dir="rtl" lang="ar"` on `<html>`.

## What changed

| help.css | help.rtl.css | Why |
| --- | --- | --- |
| `.title h2 { text-align: left; padding-right: 4rem }` | `text-align: start; padding-inline-end: 4rem` | The heading aligns to the reading edge, and the gap reserved for the badge moves to the side the badge is on. |
| `.tag { right: 0 }` | `inset-inline-end: 0` | The "New" badge sits at the end of the title row in both directions. Added `white-space: nowrap` so a longer translated label never breaks inside the pill. |
| `.steps { padding-left: 1.5rem }` | `padding-inline-start: 1.5rem` | Room for the list numbers on the start side; in RTL, `padding-left` would push the numbers past the right edge. |
| `.note { border-left; padding-left }` | `border-inline-start; padding-inline-start` | The accent rule marks where reading starts. |
| `.crumbs li + li::before { margin: 0 0.5em }` | `margin-inline: 0.5em` | Same values, written logically. The flex row already reverses with `dir`, and the `›` separator is a mirrored character, so it renders as `‹` in RTL with no extra rule. |
| `.next::after { content: " →" }` | `"\00A0→"`, and `"\00A0←"` under `[dir="rtl"]` | Arrows are not mirrored by the bidi algorithm, so "next" needs its own glyph in RTL. The no-break space stops the arrow wrapping onto a line by itself. |
| (none) | `:lang(ar) { letter-spacing: 0 }` | Arabic letters join; any tracking breaks the joins. A guard against a later rule adding it. |

Left alone on purpose: the font stack (`system-ui` ships Arabic on current macOS, iOS, Windows and Android), the unitless `1.6` line-height (it leaves room for Arabic marks above and below), the `36rem` measure, and the list numbering (`decimal` gives Western digits; if the Arabic copy uses Eastern Arabic digits, add `:lang(ar) .steps { list-style-type: arabic-indic; }`, which is a content decision for the translator).

## Verification

`rtl-check.cjs` renders help.html in Chromium (Playwright) at 1024px and 320px:

- LTR with help.css and LTR with help.rtl.css produce byte-identical screenshots at both widths.
- RTL (`dir="rtl" lang="ar"`): content block pinned to the right edge, heading right-aligned with its 64px gap on the left, badge on the left end of the title row, breadcrumbs ordered right to left with `‹` separators, list numbers and the note rule on the right, and the link arrow `←`. Screenshot: `rtl-preview.png` (rendered with the English copy, since no Arabic text was supplied).

Not verified: rendering with real Arabic copy, Firefox and Safari, and 200% zoom.
