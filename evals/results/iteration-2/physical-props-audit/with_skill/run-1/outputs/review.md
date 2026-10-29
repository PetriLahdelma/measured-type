# docs-theme.css: RTL and typography review for the Arabic edition

Scope: `docs-theme.css` (Northlight docs theme, 2014). Rule numbers are
Bringhurst sections (`§2.1.2` and so on). Each finding carries a label:
**standard** (WCAG or a spec), **measured** (checked in a browser or font
file), **convention** or **preference**.

## How this was checked

The theme was rendered in Chromium (Playwright, 1280px window) with a test page
containing every selector in the file, once as `<html lang="en" dir="ltr">`
and once as `<html lang="ar" dir="rtl">` with Arabic text. Computed boxes were
compared for the original sheet and the fixed sheet at the end of this review.
Line lengths were counted with `scripts/measure-line.js` (rendered graphemes per
full line). Font coverage was read from the font files with fontTools.

Result in one sentence: in RTL the original sheet puts the sidebar, the callout
border, the blockquote indent, the badge and the heading alignment on the wrong
side, indents lists on both sides, and points the "next" arrow backwards; the
fixed sheet mirrors all of them while the LTR boxes stay pixel-identical.

| Element | Original, RTL (measured) | Fixed, RTL (measured) |
|---|---|---|
| `.sidebar` | floats left, 24px gap on its right (toward nothing) | floats right, 24px gap toward the text |
| `.callout` | 4px border and 16px padding on the left (end) side; text touches the right edge | border, padding and radii on the right (start) side |
| `.docs-main ul` | padding 24px left **and** 40px right (indented twice) | 24px on the right only |
| `blockquote` | 32px indent on the left (end) | 32px indent on the right (start) |
| `.note-badge` | top right, collides with the start of the breadcrumb | top left |
| `.breadcrumb .sep` | nudged 2px toward the previous crumb | nudged 2px toward the next crumb |
| `h2` | `left`: heading flush left while paragraphs are flush right | `start`: flush right with the text |
| `.nav-next::after` | `→` points back toward the start | `←` points forward |
| LTR, all of the above | | identical boxes to the original |

## Broken (renders wrong in RTL, or is invalid)

- **`.sidebar` `float: left; margin-right: 24px; text-align: right`** (measured).
  All three are physical, so in Arabic the sidebar stays on the left (the end
  side), its gutter faces the page edge instead of the text, and its text
  aligns away from the content column. Convert each value to the logical value
  that keeps today's LTR result: `right` becomes `end`, not `start`.
  Fix:
  ```css
  .sidebar { float: inline-start; inline-size: 240px; margin-inline-end: 24px; text-align: end; }
  ```

- **`.callout` `border-left`, `padding-left`, `margin-left`, `border-*-left-radius`** (measured).
  The accent rule marks where the line starts. In RTL it lands on the end side
  and the text sits flush against the unpadded right edge (visible in the
  render).
  Fix:
  ```css
  .callout {
    border-inline-start: 4px solid #0a6;
    padding-inline-start: 16px;
    margin-inline-start: 0;
    border-start-start-radius: 6px;
    border-end-start-radius: 6px;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);   /* keep: a shadow is physical */
  }
  ```

- **`.docs-main ul { padding-left: 1.5em }`** (measured: 24px left + 40px right in RTL).
  The browser's default list indent is `padding-inline-start: 40px`. A physical
  `padding-left` adds a second indent on the left while the 40px default stays
  on the right, so Arabic lists are indented on both sides and the bullets sit
  40px in instead of 24px.
  Fix: `.docs-main ul { padding-inline-start: 1.5em; }` (do the same for `ol`
  if the docs use it).

- **`.docs-main blockquote { margin: 1.5em 0 1.5em 2em }`** §2.3.3 (measured).
  The quote is indented from the left, which in Arabic is the end of the line,
  so it no longer reads as set in from the text.
  Fix: `.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }`

- **`.docs-main h2 { text-align: left }`** §2.1.3 (measured).
  In Arabic the paragraphs run flush right (`start`) but every h2 is pinned
  flush left, so headings detach from their sections.
  Fix: `.docs-main h2 { text-align: start; }` (or delete the rule: `start` is
  the inherited default).

- **`.note-badge { right: 8px; top: 8px }`** (measured).
  In the RTL render the badge sits on top of the first breadcrumb item,
  because the breadcrumb now starts on the right.
  Fix: `.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }`
  This sheet never sets `position: relative` on the badge's parent; confirm
  the containing block in the templates.

- **`.nav-next::after { content: "\2192"; margin-left: 0.25em }`** (measured).
  U+2192 is not Bidi_Mirrored (checked in the Unicode data), so in Arabic the
  "next" link points back toward the start. The pseudo-element itself moves to
  the correct end of the RTL line; only the glyph and its margin are wrong.
  Swap the character and use a logical margin. The `/ ""` alternative text
  keeps screen readers from announcing "right arrow"; the plain declaration
  before it is the fallback for engines without that syntax.
  Fix:
  ```css
  .nav-next::after { content: "\2192"; content: "\2192" / ""; margin-inline-start: 0.25em; }
  .nav-next:dir(rtl)::after { content: "\2190"; content: "\2190" / ""; }
  ```
  Use a matching `.nav-prev` rule with the arrows reversed, if one exists.

- **`.breadcrumb .sep { transform: translateX(2px) }`** (measured).
  A transform is physical by nature. The nudge moves the separator toward the
  next crumb in LTR and toward the previous one in RTL.
  Fix: keep it and flip it under `:dir(rtl)`:
  ```css
  .breadcrumb .sep { display: inline-block; transform: translateX(2px); }
  .breadcrumb .sep:dir(rtl) { transform: translateX(-2px); }
  ```
  Do **not** add `scaleX(-1)` if the separator is `›`, `»` or `>`: those are
  Bidi_Mirrored and the browser already draws `›` as `‹` in an RTL run (seen
  in the render). Only an SVG or icon-font chevron, or a `→` arrow, needs
  `transform: translateX(-2px) scaleX(-1)`. `/` needs nothing.

- **No Arabic face in the stack: `font-family: Verdana, sans-serif`** §2.1.9 (measured).
  Verdana has no Arabic glyphs (checked: no U+0628 in Verdana.ttf). In the
  Arabic render Chromium drew the letters in Geeza Pro (632 glyphs) **and the
  word spaces and Latin punctuation in Verdana** (145 glyphs), so the word
  space comes from a different font than the letters. The fallback face is
  whatever the OS picks, so the edition will look different on macOS, Windows
  and Android. Name an Arabic family, and swap it on `body` rather than with a
  bare `:lang(ar)`, which would also hit `code`, `pre` and `kbd` and take
  their monospace away.
  Fix:
  ```css
  body:lang(ar) { font-family: "Noto Sans Arabic", Tahoma, "Geeza Pro", sans-serif; }
  ```
  Self-host Noto Sans Arabic (or another Arabic humanist sans you prefer).
  Tahoma is Matthew Carter's narrower sibling of Verdana and does cover Arabic
  (checked), so it is a sensible fallback next to Verdana.

- **`@media print { p { widows: 1; orphans: 1 } }`** §2.4.8 (standard behaviour, convention value).
  The initial value is 2. Setting 1 explicitly *allows* a single line to be
  stranded at the top or bottom of a printed page, the opposite of what the
  rule is usually there for.
  Fix: `@media print { p { widows: 3; orphans: 3; } }`, or delete the rule to
  get the default of 2. (Not supported in Firefox; harmless there.)

## Hurts reading

- **`.docs-main p { max-width: 75ch }`** §2.1.2 (measured).
  `ch` is the width of Verdana's zero (0.636em), wider than its average
  character (0.502em). Counted in Chromium at 16px:
  - English: **91.6 characters per line** (range 82 to 95), about 40% over
    the 66 ideal and over WCAG 1.4.8's 80.
  - Arabic: **123 characters per line** (range 119 to 126). `ch` still comes
    from Verdana's zero while the Arabic letters average 0.379em, so the box
    holds nearly twice the ideal.
  Fix: `.docs-main p { max-inline-size: 34em; }`. Measured: 64.6 characters
  in English (59 to 68), 73 in Arabic set in Tahoma (65 to 78), unchanged at
  200% zoom. Measure the Arabic edition again once Noto Sans Arabic is served,
  because the count depends on the face that renders; tighten to 32em if it
  runs long.

- **`.docs-main { width: 960px }` with `content-box` and 32px padding** (standard, WCAG 1.4.10; measured).
  The column is 1024px wide plus the 8px body margins. In an 800px window the
  document is 1032px wide and scrolls sideways; at 400% zoom on a 1280px
  screen it fails reflow badly. `max-inline-size` renders identically on wide
  screens and shrinks on narrow ones (measured: 800px document at 800px).
  Fix:
  ```css
  .docs-main { max-inline-size: 960px; margin-block: 0; margin-inline: auto; padding-inline: 32px; }
  ```
  `margin: 0 auto` and the symmetric padding were already direction-safe; the
  logical form just makes the sheet consistent and ready for vertical text.

- **Faux italic in Arabic** §2.1.9 (convention).
  Arabic has no italic tradition, and neither Noto Sans Arabic, Tahoma nor
  Geeza Pro ships an italic, so every `em` in the Arabic edition is a
  browser-slanted oblique (computed `font-style: italic` in the render).
  Emphasise by weight instead:
  ```css
  :lang(ar) em, :lang(ar) i { font-style: normal; font-weight: bold; }
  ```
  If the docs use `<i>` for icons or terms, scope this to the prose
  container.

- **Line height for Arabic** §2.2.1 (measured, still to do).
  `line-height: 1.6` clears Tahoma and Geeza Pro comfortably (ascent plus
  descent 1.21 and 1.23 of the em). Before shipping, check the face you
  actually serve with vowel marks (harakat) in the sample; if its ascent plus
  descent approaches 1.6, raise it with `body:lang(ar) { line-height: 1.8; }`.

## Things to keep, and things not to add

- **`.callout` `box-shadow: 2px 2px`** and **`.hero-illustration { transform: rotate(-4deg) }`**
  are physical on purpose (a light source and a tilted graphic); leave them.
  One design note, not part of the conversion: in RTL the callout shadow now
  falls on the same side as the accent border. If that looks heavy, add
  `.callout:dir(rtl) { box-shadow: -2px 2px 0 rgba(0, 0, 0, 0.1); }`.
  Supply an RTL version of any illustration that contains text or a UI
  screenshot instead of mirroring it.
- **`.figure-caption { text-align: center }`** is direction-neutral; keep.
- **No `letter-spacing` anywhere**: correct, and it must stay that way for
  Arabic, where tracking breaks the joins. If uppercase label styles are
  added later, reset `letter-spacing: normal` for `:lang(ar)`.
- **No `text-align: justify` and no `hyphens`**: correct. Do not add
  hyphenation for Arabic, and keep the text ragged unless kashida
  justification has been tested in every engine.
- **`html { font-size: 100% }` and `body { font-size: 1rem }`**: correct;
  reader settings and zoom scale the text.

## Markup the CSS depends on

- `<html lang="ar" dir="rtl">` on every Arabic page. Set direction with the
  `dir` attribute, not CSS `direction`: `:dir(rtl)` reads the attribute, and
  reader modes and feeds strip CSS.
- Code stays LTR: `<pre dir="ltr">` for blocks and `<code dir="ltr">` (or
  `<bdi>`) for inline code, file paths, URLs, version numbers and key
  combinations, so their punctuation does not reorder inside Arabic sentences.
  Do this in the Markdown renderer, not by hand.
- `dir="auto"` on search inputs and on any user-generated strings.
- `lang="en"` on English product names or quoted English passages inside
  Arabic text.

## Locale conventions to settle (not CSS, but they ship with the edition)

Formatting with `Intl.NumberFormat` depends on the exact locale tag (checked
in Node's ICU; confirm in the target browsers):

| Tag | 1234567.5 | 50% |
|---|---|---|
| `ar` | 1,234,567.5 | 50‎%‎ |
| `ar-EG`, `ar-SA` | ١٬٢٣٤٬٥٦٧٫٥ | ٥٠٪؜ |
| `ar-MA` | 1.234.567,5 | 50‎%‎ |

Decide whether the docs use Western or Arabic-Indic digits and pin it
(`ar-u-nu-latn` or `ar-u-nu-arab`) instead of passing bare `ar`. Version
numbers, code samples and CLI output must stay in Western digits regardless.
Use `q { quotes: auto; }` and check the rendered marks in each engine.

## Refinement

- **`blockquote` margins of 1.5em** §2.2.2 (convention). One body line is
  25.6px (16px × 1.6); 1.5em is 24px, so text after each quote drifts 1.6px
  off the line grid per quote. `margin-block: 1lh` keeps the rhythm. This
  changes LTR spacing, so ship it separately from the RTL conversion.
- **Verdana has no `→`** (checked in the cmap), so the "next" arrow is drawn by
  a fallback font in both editions. An inline SVG with `:dir(rtl)` mirroring,
  or a face that has arrows, gives a consistent glyph.
- **`*, *::before, *::after { box-sizing: content-box }`** restates the
  initial value. Harmless, but it is why the 960px column is really 1024px.
  Moving to `border-box` is a layout change for both editions; decide it on
  its own.
- **Fixed `px` spacing** (`32px`, `24px`, `16px`, `8px`) does not follow the
  reader's font size. Converting to `rem` or `lh` is a preference, not an RTL
  issue.

## Fixed stylesheet

Drop-in replacement. LTR rendering at desktop widths is unchanged apart from
the corrected measure; RTL mirrors correctly.

```css
/* Northlight docs theme (2014), logical edition */
*, *::before, *::after { box-sizing: content-box; }

html { font-size: 100%; }
body { font-family: Verdana, sans-serif; font-size: 1rem; line-height: 1.6; color: #222; }
body:lang(ar) { font-family: "Noto Sans Arabic", Tahoma, "Geeza Pro", sans-serif; }

.docs-main {
  max-inline-size: 960px;
  margin-block: 0;
  margin-inline: auto;
  padding-inline: 32px;
}
.docs-main p { max-inline-size: 34em; }

.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}

.callout {
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;
  border-end-start-radius: 6px;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.breadcrumb .sep { display: inline-block; transform: translateX(2px); }
.breadcrumb .sep:dir(rtl) { transform: translateX(-2px); }

.nav-next::after { content: "\2192"; content: "\2192" / ""; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190"; content: "\2190" / ""; }

.docs-main ul { padding-inline-start: 1.5em; }
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }

.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
.docs-main h2 { text-align: start; }
.figure-caption { text-align: center; }
.hero-illustration { transform: rotate(-4deg); }

:lang(ar) em, :lang(ar) i { font-style: normal; font-weight: bold; }

@media print {
  p { widows: 3; orphans: 3; }
}
```

Before release: render the Arabic edition in Chromium, Safari and Firefox
with the served Arabic webfont, run `measure-line.js` on a real Arabic page
again, and check one page at 320 CSS px wide.
