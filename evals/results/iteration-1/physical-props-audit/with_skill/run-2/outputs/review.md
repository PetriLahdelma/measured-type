# docs-theme.css: RTL and typography review for the Arabic edition

**Verdict.** The sheet was written in physical terms (left, right, width, translateX), so eight rules either point the wrong way or misalign in `dir="rtl"`. Two typographic problems hit every edition: the measure is about 92 characters, and print allows one-line widows and orphans. Everything converts to logical properties without changing today's LTR rendering. A drop-in version is in `docs-theme.fixed.css` next to this file.

**How this was checked.** I rendered an Arabic test page (`<html lang="ar" dir="rtl">` with every component in the sheet) in Chromium at 1280px, once with the original CSS and once with the fixed CSS, and read the computed geometry. I counted line length with the skill's `measure-line.js`.

| Check in `dir="rtl"` | Original | Fixed |
|---|---|---|
| Sidebar float | left side (end edge, wrong) | right side (start edge) |
| `ul` padding | left 24px **and** right 40px (indented on both sides) | right 24px only |
| Blockquote indent | 32px on the left (end side) | 32px on the right (start side) |
| Callout rule and radius | left border, top-left radius | right border, top-right radius |
| Note badge | top right, over the start of the text | top left (end corner) |
| `h2` alignment | `left` (flush to the end edge) | `start` |
| "Next" arrow | `→`, points backwards in Arabic | `←` |
| Breadcrumb separator nudge | +2px toward the end side | `margin-inline-start: 2px` |
| Latin measure, `.docs-main p` | 91.6 chars/line (75ch) | 64.9 chars/line (54ch test; shipped 55ch, about 66) |
| Arabic measure, same paragraphs | 124 chars/line | 68 chars/line |

## Broken (renders wrong or is invalid)

- **`.docs-main ul { padding-left: 1.5em }`** (logical-and-language, list indentation): the browser's default `padding-inline-start: 40px` stays on the right in RTL while your 24px lands on the left, so Arabic lists are indented on both sides. Measured: left 24px, right 40px.
  Fix: `.docs-main ul { padding-inline-start: 1.5em; }`. Apply the same to `ol` if the docs use it.

- **`.sidebar { float: left; margin-right: 24px; text-align: right; width: 240px }`**: in Arabic the sidebar should sit at the start edge (right). It stays left, and its gutter sits on the wrong side.
  Fix:
  ```css
  .sidebar { float: inline-start; inline-size: 240px; margin-inline-end: 24px; text-align: end; }
  ```
  `right` maps to `end`, not `start`, so LTR stays as it is today. Design note, separate from the conversion: end-aligned sidebar text gives every line a ragged start edge, which is harder to scan (§2.1.3). Consider `text-align: start` for both editions as a deliberate change.

- **`.callout`** (`border-left`, `padding-left`, `margin-left`, `border-top-left-radius`, `border-bottom-left-radius`): the accent rule marks where the line starts. In RTL it ends up after the text.
  Fix:
  ```css
  .callout {
    border-inline-start: 4px solid #0a6;
    padding-inline-start: 16px;
    margin-inline-start: 0;
    border-start-start-radius: 6px;
    border-end-start-radius: 6px;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
  }
  ```
  Leave the `box-shadow` physical. It models a light source, not text flow.

- **`.docs-main blockquote { margin: 1.5em 0 1.5em 2em }`**: the 2em indent is on the left, so Arabic quotes are indented from the end edge and sit flush on the start edge.
  Fix: `.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }`

- **`.docs-main h2 { text-align: left }`**: Arabic headings become flush to the end edge, detached from the right-aligned text below.
  Fix: `.docs-main h2 { text-align: start; }`

- **`.note-badge { top: 8px; right: 8px }`**: in RTL the badge covers the start of the callout's first line, which is where Arabic reading begins.
  Fix: `.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }`

- **`.nav-next::after { content: "\2192"; margin-left: 0.25em }`**: U+2192 is not Bidi_Mirrored, so the arrow still points right ("back") in Arabic, and the gap ends up on the wrong side of it.
  Fix:
  ```css
  .nav-next::after { content: "\2192"; content: "\2192" / ""; margin-inline-start: 0.25em; }
  :dir(rtl) .nav-next::after { content: "\2190"; content: "\2190" / ""; }
  ```
  The `/ ""` alt text stops screen readers announcing "rightwards arrow" after "Next". The plain `content` line before it is a fallback for engines that drop the alt-text syntax. Swap the character. Do not use `scaleX(-1)`.

- **`.breadcrumb .sep { transform: translateX(2px) }`**: the nudge is physical, so in RTL it pushes the separator toward the following item instead of away from the preceding one.
  Fix: `.breadcrumb .sep { display: inline-block; margin-inline-start: 2px; }`. Check which character the markup uses. `›`, `»`, `/` or `>` already mirror (or are symmetric) in an RTL run, so leave them alone. If it is `→` or an SVG chevron, swap it under `:dir(rtl)` the same way as the next arrow.

- **`.docs-main { width: 960px; ... }` with `box-sizing: content-box`**: the box is 1024px wide in total, so any viewport or zoom level below 1024 CSS px scrolls sideways (WCAG 1.4.10 reflow). Arabic runs often show up on phones first.
  Fix (logical, and identical to today at 1024px and wider):
  ```css
  .docs-main {
    inline-size: 960px;
    max-inline-size: calc(100% - 64px);
    margin-inline: auto;
    padding-inline: 32px;
  }
  ```

## Hurts reading

- **`.docs-main p { max-width: 75ch }`** §2.1.2: `ch` is the width of Verdana's zero (0.636em), and the average Verdana character with spaces is 0.52em. So 75ch renders **91.6 characters per line** (range 82 to 95), well past the 45 to 75 range and 66 ideal. In Arabic the same box held **124 characters per line**, because `ch` still comes from Verdana's zero while the Arabic glyphs come from a narrower fallback face.
  Fix: `.docs-main p { max-inline-size: 55ch; }`. 54ch measured 64.9 chars/line at 100% and 200% zoom, so 55ch gives about 66. With the Arabic stack below, the Arabic paragraphs measured 68 per line. Re-count once the real Arabic webfont is loaded, since `ch` will not follow it.

- **No Arabic face in the stack** (`font-family: Verdana, sans-serif`): Verdana has no Arabic glyphs, so each OS substitutes its own (Geeza Pro or SF Arabic on macOS, Segoe UI or Tahoma on Windows, Noto on Android). The edition will look different on every platform, and Latin words inside Arabic sentences will sit next to a mismatched Arabic face.
  Fix: self-host one Arabic family with `@font-face` and swap it on the root only, so `code`, `pre` and `kbd` keep their monospace stack:
  ```css
  :root:lang(ar) body {
    font-family: "Noto Sans Arabic", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif;
  }
  ```
  A bare `:lang(ar) { font-family: ... }` would match every element and override code blocks. Pick a family with a Latin companion (Noto Sans Arabic with Noto Sans, or IBM Plex Sans Arabic with IBM Plex Sans) if you want mixed lines to match.

- **`@media print { p { widows: 1; orphans: 1; } }`** §2.4.8: this explicitly *permits* a single stranded line at the top or bottom of a printed page, which is worse than the browser default of 2.
  Fix:
  ```css
  @media print {
    p { widows: 2; orphans: 2; }
    h2, h3 { break-after: avoid; }
    blockquote, figure, pre, table { break-inside: avoid; }
  }
  ```

- **Faux italic in Arabic**: most Arabic faces have no italic, so `em`, `i` and `cite` get a mechanically slanted Arabic, which is a distortion (§2.1.9) and not an Arabic emphasis convention.
  Fix:
  ```css
  :root:lang(ar) body { font-synthesis: none; }
  :root:lang(ar) :is(em, i, cite) { font-style: normal; font-weight: 700; }
  ```

## Refinement

- **Keep letterspacing and hyphenation out of Arabic.** The sheet has none today, which is correct. If you later add tracked uppercase labels or `hyphens: auto`, scope them away from `:lang(ar)`: tracking breaks the joins between Arabic letters, Arabic has no caps, and there is no Arabic hyphenation convention. Keep Arabic `text-align: start` (ragged) unless you test kashida justification.
- **Leading for Arabic.** `line-height: 1.6` is a reasonable start, but Naskh-style faces have taller ascenders and deeper descenders than Verdana. Check that stacked marks (harakat) on adjacent lines don't collide, and raise it under `:root:lang(ar) body` (1.7 to 1.8) if they do.
- **Rhythm** §2.2.2: blockquote margins of 1.5em (24px) sit off the 25.6px body line. `margin-block: 1lh` (or a `--line` token) keeps quotes on the beat in both editions.
- **`text-wrap`**: `text-wrap: pretty` on `.docs-main p` and `text-wrap: balance` on `h2` reduce one-word last lines, especially in translated headings that run longer or shorter than the English.
- **`box-sizing: content-box`** is a 2014 default. Moving to `border-box` is cleaner, but it changes every padded width, so treat it as its own change and not part of the RTL work.
- **Leave alone**: `.hero-illustration { transform: rotate(-4deg) }` and the callout's shadow are physical graphics, so they stay as they are. `.figure-caption { text-align: center }` is direction-neutral.

## Markup the CSS depends on

These are not CSS bugs, but the stylesheet cannot fix them, and docs pages hit all of them:

- `<html lang="ar" dir="rtl">` on the Arabic edition. Set direction with the `dir` attribute, not CSS `direction`, because `:dir(rtl)` (used above) reads the attribute.
- Code is always LTR: `<pre dir="ltr">` on code blocks, `<code dir="ltr">` or `<bdi>` for inline code, file paths, URLs, CLI flags, version strings and keyboard shortcuts inside Arabic sentences. Without it, punctuation such as `--force.` or `v2.1)` reorders.
- English product names inside Arabic prose: wrap them in `<span lang="en">` so screen readers switch voice. Use `dir="auto"` on search inputs and any user-generated text.
- Numbers: choose Western (0 to 9) or Arabic-Indic digits once for the edition and format them with `Intl.NumberFormat`, for example `'ar-u-nu-latn'` or `'ar-u-nu-arab'`, instead of hand-typing them. Use Arabic punctuation (، ؛ ؟) in the translated copy, and `q { quotes: auto; }` so `<q>` follows `lang`.

## Files

- `docs-theme.fixed.css`: the full converted stylesheet with every fix above. LTR output is unchanged except for the deliberate fixes: the measure (75ch to 55ch), print widows and orphans, overflow below 1024px and the accessible arrow.
