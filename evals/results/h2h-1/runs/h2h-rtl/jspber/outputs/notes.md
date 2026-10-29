# help.rtl.css notes

`help.rtl.css` replaces `help.css`. Link it from both editions; `help.html` is untouched.

## What changed

| Rule | Before | After | Why |
|---|---|---|---|
| `.title h2` | `text-align: left; padding-right: 4rem` | `text-align: start; padding-inline-end: 4rem` | Arabic headings align right. The space kept free for the badge moves with the badge. |
| `.tag` | `right: 0` | `inset-inline-end: 0` | The "New" badge sits at the end of the heading row in both languages. |
| `.steps` | `padding-left: 1.5rem` | `padding-inline-start: 1.5rem` | List numbers sit on the right in Arabic. Before, the indent stayed on the left and the browser's default 40px indent stayed on the right, so the list was indented on both sides. |
| `.note` | `border-left`, `padding-left` | `border-inline-start`, `padding-inline-start` | The red rule marks the edge where reading starts: left in English, right in Arabic. |
| `.next::after` | `" →"` | `" →"`, and `" ←"` under `[dir="rtl"]` | Arrows don't mirror automatically. A right arrow on an Arabic page points backwards. |
| Breadcrumb separator | `"›"` | `"›"` in English; under `[dir="rtl"]`, a small left-pointing chevron drawn with two borders | See below. |

Left alone on purpose:
- **Font stack.** I tried naming Arabic fonts after `system-ui`. In Chromium on macOS that switched the Arabic text from the system's Arabic UI face to an older one, which I confirmed by measuring text widths. `system-ui, sans-serif` already picks a proper Arabic face when `lang="ar"`.
- **No letter-spacing or `text-transform`.** Arabic letters join to each other, and tracking breaks those joins.
- **Line height stays 1.6.** That leaves room for Arabic vowel marks above and below the letters.
- Flex rows, symmetric margins, `top`, and `border-radius` already follow the direction or don't depend on it.

## Breadcrumb separator

In theory, `›` is a mirrored character and would flip on its own in RTL. In practice, on macOS (both Chromium and WebKit) the separator pointed the wrong way when it sat next to Arabic text, and pointed the right way next to Latin text. The glyph comes from a fallback font chosen by the neighbouring script. The character that came out right on macOS would come out backwards on a platform that mirrors correctly, so no single angle character is safe. A chevron drawn with CSS borders doesn't depend on any font, so it points left everywhere. It also takes its colour from the separator rule. Since it is not text, screen readers no longer read out a stray character in the Arabic edition.

## Verification

`test/render.js` loads `help.html`, swaps the stylesheet, and for RTL sets `dir="rtl" lang="ar"` and fills in placeholder Arabic text.
- **English:** the page with `help.css` and the page with `help.rtl.css` produce byte-identical screenshots in Chromium and WebKit.
- **Arabic:** I measured the geometry and checked the screenshots in both engines (`test/shots/*-rtl-new.png`):
  - the heading is right-aligned and does not overlap the badge;
  - the badge sits on the left;
  - list indent, note rule and note padding are on the right;
  - the separator and the "next" arrow point left.
- **Not verified:** Firefox (not installed here), Windows, and Android rendering.

## Decisions for the Arabic editors

- **List numbers.** They render as Western digits (1. 2. 3.). Many Middle Eastern audiences expect Arabic-Indic digits (١. ٢. ٣.). If you want those, add `[dir="rtl"] .steps { list-style-type: arabic-indic; }`.
- **Quotation marks.** Arabic quotation marks and punctuation come from the translation, not the CSS.
- **Nested direction.** The RTL rules key off `dir="rtl"` on an ancestor. If an English island inside the Arabic page needs its own arrow or separator, give it `dir="ltr"` and add matching overrides.
