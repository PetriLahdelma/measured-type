# help.rtl.css: notes

`help.rtl.css` replaces `help.css` for both editions. The English page renders pixel-identically to `help.css`; with `<html dir="rtl" lang="ar">` the layout mirrors.

## What changed

| Original (physical) | Now (logical) | Effect in Arabic |
|---|---|---|
| `.title h2 { text-align: left }` | `text-align: start` | Heading aligns right instead of being pinned left |
| `.title h2 { padding-right: 4rem }` | `padding-inline-end` | Space reserved for the pill on the left |
| `.tag { right: 0 }` | `inset-inline-end: 0` | "New" pill sits at the end of the heading line (left) |
| `.steps { padding-left }` | `padding-inline-start` | List numbers hang on the right, not clipped |
| `.note { border-left; padding-left }` | `border-inline-start; padding-inline-start` | Rule and indent move to the right edge |

No physical fallbacks are kept next to the logical properties: in RTL a leftover `padding-left` would pad both sides.

Unchanged because they already follow direction: the flex breadcrumb row (it runs right to left on its own), symmetric margins and padding, and `.help`'s `max-width` (the block sits on the right in RTL).

## Things logical properties can't flip

- **Breadcrumb separator.** English keeps `›`. RTL uses `‹`. The glyph is wrapped in an LTR isolate (`unicode-bidi: isolate; direction: ltr`) because both angle quotes are bidi-mirrored characters. Without the isolate, the Unicode bidi algorithm mirrors `‹` back to `›` when Arabic text is next to it, but not when Latin text is. I tested this: with no isolate, Chromium and WebKit both drew the Arabic separators pointing right. With the isolate, they point left whatever language the link text is in.
- **"Next" arrow.** `→` is not a mirrored character, so RTL swaps it explicitly for `←`.

## Arabic-only touches (keyed on `:lang(ar)`)

- Step numbers use Eastern Arabic digits (`list-style-type: arabic-indic`). This is a market choice. Remove the rule if the edition targets the Maghreb, where Western digits are the norm.
- `line-height` rises from 1.6 to 1.8 so vowel marks and tall letters don't crowd the lines (for example the shadda in مُصدَّر).

## Small hardening

- The breadcrumb row gets `flex-wrap: wrap` so a longer translated trail wraps instead of overflowing. This makes no difference at normal widths.

## Verification (Chromium + WebKit, 320px and 800px)

- **English:** full-page screenshots with `help.rtl.css` are byte-identical to the ones with `help.css`.
- **Arabic:** an Arabic test page plus the English markup switched to `dir="rtl" lang="ar"` both pass the same checks. The pill sits on the left and never overlaps the heading. The border, list padding and heading padding are on the right. There is no horizontal overflow. A pixel test (all text hidden except the generated glyphs) confirms the separators and arrow point left.
- Firefox was not tested because it isn't installed here.
- Test pages and scripts are in `_test/`.

## Left as is (outside this task)

The note's 4px colored side rule is part of the existing English design, so it is kept and only mirrored.
