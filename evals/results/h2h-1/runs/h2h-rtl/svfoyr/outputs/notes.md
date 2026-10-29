# help.rtl.css: notes

`help.rtl.css` replaces `help.css` for both editions. Every side-specific rule now refers to the start or end of the line instead of left or right, so the browser mirrors the page whenever the html element has `dir="rtl"`. `help.html` is unchanged.

## What was wrong under `dir="rtl"` and what changed

| Element | Problem with the old stylesheet in RTL | Change |
|---|---|---|
| Heading | `text-align: left` pinned the Arabic title to the wrong edge | `text-align: start` |
| "New" badge | `right: 0` kept it on the right, on top of where the RTL title starts | `inset-inline-end: 0` |
| Space reserved for the badge | `padding-right: 4rem` sat on the title's starting side | `padding-inline-end: 4rem` |
| Numbered steps | `padding-left` set the wrong side; the browser's default 40px stayed on the marker side, so the indent became 40px instead of 24px | `padding-inline-start: 1.5rem` |
| Note | Red rule and indent stayed on the left, where Arabic lines end | `border-inline-start` and `padding-inline-start` |
| "Next" arrow | `→` is not mirrored by the browser, so it pointed backwards | `←` when the link's direction is RTL (`:dir(rtl)`) |
| Breadcrumb separator | `›` happens to be mirrored automatically, so it already worked | Made explicit: the separator is isolated as LTR (which switches automatic mirroring off) and RTL names `‹` itself, so it can never flip twice or be left pointing backwards |

Left alone because they already follow the writing direction: the breadcrumb flex row, symmetric margins and paddings, `max-width` on the content column, and the badge's `top` offset.

## How it was checked

Playwright, in Chromium and WebKit, at 640px wide. The page was rendered with the old and new stylesheet, as English LTR, English markup under `dir="rtl" lang="ar"`, and with Arabic sample copy swapped in.

- English LTR: the screenshot with the new stylesheet is byte-identical to the old one in both engines.
- RTL: the badge moves to the left end of the title row, the steps indent is 24px on the right, and the note rule is 4px on the right.
- Separator and arrow direction were measured from pixels, not judged by eye: separators point `<` and the arrow is `←` at the line's left end, in both engines and with both English and Arabic text.

The check scripts are in `_check/` (`check.js`, `orient.js` + `orient.py`, `arrow.js` + `arrow.py`).

## Not changed, worth a decision

- The note's 4px colored side rule is a heavy, generic treatment. It is kept because the English page must stay as it is.
- Numerals: the steps use Western digits (1. 2. 3.). Some Arabic markets expect Eastern Arabic-Indic digits; if so, add `:lang(ar) .steps { list-style-type: arabic-indic; }`. That is an editorial call for the Arabic edition.
- Fonts: `system-ui` resolves to a proper Arabic face on macOS, iOS, Windows and Android. Review line height once real Arabic copy with diacritics is in place.
