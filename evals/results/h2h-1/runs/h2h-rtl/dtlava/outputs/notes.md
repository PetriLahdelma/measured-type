# help.rtl.css notes

`help.rtl.css` is a drop-in replacement for `help.css`. It serves both editions from the same markup; only `dir`/`lang` on `<html>` change. `help.html` is untouched.

## What changed

| Rule | Was | Now | Why |
|---|---|---|---|
| `.title h2` | `text-align: left; padding-right: 4rem` | `text-align: start; padding-inline-end: 4rem` | The heading aligns to the reading start, and the space kept clear for the badge moves to the side the badge is on. |
| `.tag` | `right: 0` | `inset-inline-end: 0` | The "New" badge sits at the end of the heading row in both directions. With `right: 0` it would have ended up on top of the Arabic heading. |
| `.steps` | `padding-left` | `padding-inline-start` | The list numbers need their gutter on the right in Arabic. Otherwise they hang outside the content box. |
| `.note` | `border-left`, `padding-left` | `border-inline-start`, `padding-inline-start` | The accent rule marks the start edge of the callout, so in Arabic it belongs on the right. |
| `.next::after` | `" →"` only | `" ←"` under rtl | U+2192 is not mirrored by the bidi algorithm, so a "next" arrow has to be swapped explicitly. An `[dir="rtl"]` rule covers older browsers. `:dir()` rules come after it, so modern browsers also handle nested `dir` islands. |
| Arabic type | none | `:lang(ar)` font stack, `line-height: 1.7` | This names Arabic-capable faces after `system-ui`, so the fallback is predictable. It also adds a little leading for Arabic's taller ascenders, descenders and diacritics. |

## Deliberately left alone

- **Breadcrumb separator "›"**: unchanged on purpose. U+203A is a bidi-mirrored character, so in an rtl line the browser draws it pointing left by itself. Swapping it for "‹" under rtl would get mirrored too and end up pointing the wrong way. I checked this in Chromium and WebKit renders.
- **Breadcrumb order**: `display: flex` follows the inline direction, so the trail runs right to left automatically.
- **Symmetric shorthands** (`margin: 0 0 1.5rem`, `margin: 1.5rem 0`, `padding: 0 0.5em`, the separator's `margin: 0 0.5em`) are already direction-neutral.
- **List numerals**: these stay `decimal`. Switching to `arabic-indic` digits is an editorial choice for the Arabic copy, not a layout fix. If the translation uses Eastern Arabic digits in the text, add `:lang(ar) .steps { list-style-type: arabic-indic; }` to match.

## Verification

`_test/check.js` renders the English page with `help.css` and with `help.rtl.css`. The screenshots are byte-identical in Chromium and WebKit, so the English edition does not change. It also renders an Arabic copy (`_test/ar.html`, `dir="rtl" lang="ar"`) and confirms the following:

- the badge is flush to the left edge;
- the heading padding, list gutter and note border are on the right;
- the breadcrumb runs right to left with left-pointing separators;
- the link ends in "←".

Firefox was not available in this environment.
