# docs-theme.css: RTL and typography review for the Arabic edition

Scope: `docs-theme.css` (Northlight docs theme, 2014). Goal: the same stylesheet
serves `<html lang="en" dir="ltr">` and `<html lang="ar" dir="rtl">` with no
LTR change unless called out as a separate design note.

Method: I rendered a test page with every selector in the file in Chromium
(Playwright) at 1280px and 640px (640px = 1280px at 200% zoom), in LTR English
and RTL Arabic, read computed styles and boxes, checked which fonts actually
painted the Arabic text and counted characters per line with
`scripts/measure-line.js`. Numbers below are measured, not estimated.

Principle for every fix: **convert, don't redesign.** Each physical value maps
to the logical value that keeps today's LTR rendering pixel-identical
(`text-align: right` becomes `end`, `float: left` becomes `inline-start`).
I re-ran the probe on the patched file: LTR boxes, paddings and borders were
identical to the original; RTL mirrored as intended.

---

## Broken (renders wrong in RTL, or is invalid)

### 1. `.callout`: accent bar, padding and radius stay on the left
Measured in RTL: `border-left-width: 4px`, `border-right-width: 0`,
`padding-right: 0`. The green bar sits on the *end* side of Arabic text, the
16px padding sits next to it and the first word of every line touches the
right edge with no padding at all. The rounded corners stay on the left too.

Fix:
```css
.callout {
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;   /* was border-top-left-radius */
  border-end-start-radius: 6px;     /* was border-bottom-left-radius */
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1); /* keep: a light-source offset is physical */
}
```

### 2. `.note-badge`: pinned to the top right, on top of the first word
`top: 8px; right: 8px` keeps the badge at the physical top right. In LTR that
is the end of the first line; in RTL it is the *start* of the first line, so
it covers the first Arabic word of the callout (measured: badge at x 1084 to
1112, callout text starting at x 1120 with zero start padding).

Fix:
```css
.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
```
Measured after the fix: the badge moves to x 168 to 201 in RTL (end of the
first line), same as LTR. Note: nothing in this file gives the badge a
positioned ancestor. If the callout is its container, add
`.callout { position: relative; }`, otherwise the badge pins to the page
corner in both directions.

### 3. `.sidebar`: stays on the left, the end side in Arabic
`float: left; margin-right: 24px; text-align: right` puts the navigation on the
end side of an RTL page (measured: x 160 to 400 in both directions), with its
gutter facing the page edge in the wrong reading order.

Fix (keeps LTR identical: right-aligned text becomes `end`, not `start`):
```css
.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}
```
Measured after the fix: sidebar at x 880 to 1120 in RTL, headings sit flush
against it.

### 4. `.docs-main h2 { text-align: left }`: Arabic headings ragged on the wrong side (§2.1.3)
In RTL every paragraph sets from the right while every h2 sets from the left,
next to the sidebar float. Measured: Arabic h2 text at x 424 to 546, the
paragraph start edge at x 1120.

Fix: `text-align: start` (or delete the declaration; `start` is the inherited
default).

### 5. `.docs-main ul { padding-left: 1.5em }`: lists indented on both sides
Browsers indent lists with a default `padding-inline-start: 40px`. A physical
`padding-left` does not replace it in RTL. Measured in RTL: `padding-left: 24px`
plus `padding-right: 40px`, so Arabic lists lose 24px on the left and get the
default 40px on the right instead of the intended 1.5em.

Fix:
```css
.docs-main ul { padding-inline-start: 1.5em; }
```
If numbered steps should match, add `ol` to the selector; that is a design change (today `ol` keeps the 40px default).

### 6. `.docs-main blockquote { margin: 1.5em 0 1.5em 2em }`: quote indented from the wrong edge
The 2em indent is the fourth (left) value. In RTL (measured `margin-left: 32px`,
`margin-right: 0`) quotes sit flush against the start edge and the indent opens
on the ragged end, so quotes no longer look set off.

Fix:
```css
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }
```

### 7. `.nav-next::after { content: "\2192" }`: "Next" points backwards
U+2192 RIGHTWARDS ARROW is not Bidi_Mirrored, so the browser never flips it.
In Arabic, "next" is to the left, and the arrow still points right (measured:
`"→"` in RTL). The `margin-left` also lands on the wrong side, gluing the arrow
to the text.

Fix (swap the character, don't `scaleX(-1)` it; the second `content` adds empty
alt text so screen readers don't announce "rightwards arrow", and the first
line is the fallback for engines without alt-text syntax):
```css
.nav-next::after {
  content: "\2192";
  content: "\2192" / "";
  margin-inline-start: 0.25em;
}
.nav-next:dir(rtl)::after {
  content: "\2190";
  content: "\2190" / "";
}
```
A "previous" link, if there is one, needs the mirror rule.

### 8. `.breadcrumb .sep { transform: translateX(2px) }`: optical nudge goes the wrong way
`translateX` is physical. In LTR the nudge moves the separator toward the next
crumb; in RTL the next crumb is on the left, so +2px pushes it toward the
previous one.

Fix (keeps the transform, so layout stays exactly as today):
```css
.breadcrumb .sep { display: inline-block; transform: translateX(2px); }
.breadcrumb .sep:dir(rtl) { transform: translateX(-2px); }
```
About the separator glyph: if it is `›` or `>`, do **not** mirror it. Those are
Bidi_Mirrored and already point left in an RTL run; adding `scaleX(-1)` would
flip them back. If it is an SVG or icon-font chevron, it does need
`:dir(rtl) .breadcrumb .sep svg { transform: scaleX(-1); }`. A `/` needs nothing.

### 9. Verdana has no Arabic: the Arabic edition renders in whatever the OS picks
I checked the font file: Verdana has 0 glyphs in the Arabic block
(U+0600 to U+06FF). On macOS Chromium painted the Arabic sample with 71 glyphs
from Geeza Pro and 15 from Verdana (the spaces and Latin punctuation). So word
spaces come from Verdana while letters come from Geeza Pro, and Windows,
Android and Linux will each substitute a different face with different size,
weight and line metrics. Uncontrolled fallback is not a typographic decision.

Fix: give Arabic its own stack on the root element's `body`, never with a bare
`:lang(ar)` selector (that would match every element and override `code`,
`pre` and `kbd`, which must stay monospace):
```css
:root:lang(ar) body {
  font-family: "Noto Sans Arabic", "Segoe UI", Tahoma, "Geeza Pro", sans-serif;
  line-height: 1.8;
}
```
Self-host Noto Sans Arabic (or the house Arabic face) as WOFF2 so every
platform gets the same face; the system names are fallbacks only. It's a
humanist sans with wide counters, so it pairs with Verdana better than a
Naskh would. Measured with the stack in place (Tahoma rendered on this
machine): one font for the whole paragraph, 87 glyphs, no split.

Line height: Arabic has tall ascenders, deep descenders and, in vocalized
text, stacked harakat above and below. 1.6 is tight for that; 1.8 is the
starting point I'd test with fully vocalized sample text (Quranic quotations,
teaching examples), then adjust per face.

---

## Hurts reading

### 10. `.docs-main p { max-width: 75ch }`: about 92 characters per line in English, 124 in Arabic (§2.1.2)
`ch` is the width of Verdana's zero (0.636em), wider than its average letter
(0.521em). Measured at 16px: **91.6 characters per line** (range 82 to 95) in
English, well past the 75 ceiling and 66 ideal. Arabic is worse: `ch` still
comes from Verdana, but the fallback Arabic face is narrower, so the same box
held **123.5 characters per line**, almost double the ideal.

Fix:
```css
.docs-main p { max-inline-size: 34em; }
```
Measured: English 64.6 characters per line (range 59 to 68); Arabic with the
new stack 72.8 (range 67 to 75). Both inside 45 to 75. Because `em` follows the
font size and not one face's zero, it also stays stable when the Arabic stack
falls back. Re-measure once the self-hosted Arabic face is in, and tighten to
about 32em for Arabic if it lands above 75.

This is the only change that alters the LTR rendering (lines get shorter). It
fixes a real readability fault in both editions, so I'd ship it, but it is a
design decision; make it deliberately rather than as part of the RTL
conversion.

### 11. `.docs-main { width: 960px }`: horizontal scroll at 200% zoom (WCAG 1.4.10)
With `box-sizing: content-box` the box is 960 + 2 × 32 = 1024px wide whatever
the viewport. At 1280px and 200% zoom (640 CSS px) the page scrolled sideways:
measured `scrollWidth` 1032 against a 640px viewport. In RTL the overflow runs
off the left edge, where users scroll less naturally. Same fault in English.

Fix (same width on wide screens, shrinks below it):
```css
.docs-main {
  max-inline-size: 960px;
  margin-inline: auto;
  padding-inline: 32px;
}
```
Measured after the fix at 640px: `scrollWidth` 640, no horizontal scroll.
`margin: 0 auto` and the `padding-left`/`padding-right` pair were symmetric, so
they never broke RTL; the logical form just keeps the file consistent and
survives vertical writing modes.

### 12. `@media print { p { widows: 1; orphans: 1 } }`: explicitly allows widows and orphans (§2.4.8)
The browser default is 2. Setting 1 tells the engine a single stranded line at
the top or bottom of a printed page is fine, which is exactly what Bringhurst
says to avoid.

Fix:
```css
@media print {
  p { widows: 2; orphans: 2; }
}
```
(Chromium and Safari honor these; Firefox ignores them harmlessly.)

---

## Refinement

### 13. Markup the CSS depends on
Direction belongs in the HTML, not in CSS `direction`, so `:dir()` works and
reader modes keep it:
```html
<html lang="ar" dir="rtl">
```
Docs are full of strings that must stay LTR inside Arabic text: code, commands,
file paths, URLs, version numbers, key names. Mark them at the source:
`<pre dir="ltr">`, `<code dir="ltr">` (or `<bdi>`), and `dir="auto"` on any
user-supplied or fetched string such as search results and comment authors.
Otherwise `npm install --save` style strings reorder their punctuation.
English terms left untranslated in Arabic prose get `lang="en"`.

### 14. Keep Arabic free of tracking, caps and justification
There is no `letter-spacing`, `text-transform: uppercase` or
`text-align: justify` in this file today; keep it that way for Arabic.
Letterspacing breaks the joins between letters, Arabic has no case, and
justification would need kashida that browsers handle unevenly. Any future
uppercase label style should be scoped `:lang(en)`, and Arabic emphasis should
use weight or color. Don't add `hyphens: auto` for Arabic either; it has no
hyphenation convention.

### 15. Leave the physical things physical
These are fine as they are and should not be "converted":
- `box-shadow: 2px 2px 0` on `.callout`: a light-source offset.
- `.hero-illustration { transform: rotate(-4deg) }`: a rotated graphic. Mirror
  the illustration itself only if it contains directional content (an arrow,
  a reading-order flow).
- `.figure-caption { text-align: center }`: center is direction-neutral. Keep
  captions to one or two lines; a long centered caption reads poorly in either
  script.

### 16. Small cleanups
- `*, *::before, *::after { box-sizing: content-box }` restates the default.
  It's harmless, but anyone switching to `border-box` later changes the
  `.docs-main` width by 64px; decide that separately.
- Verdana also lacks U+2192 and U+2190, so the "Next" arrow is drawn by a
  fallback font. An inline SVG with a `:dir(rtl)` mirror would match the text
  weight; the swapped characters above are the minimal fix.
- Design note, not part of the conversion: right-aligned (ragged-start) text
  in `.sidebar` makes multi-line nav entries harder to scan in English. If it
  changes to `start`, it changes in both editions.

---

## Patched stylesheet

Drop-in replacement. LTR output is identical to the original except items 10
and 11 (shorter lines, no fixed width) and 12 (print widows), which are
deliberate.

```css
/* Northlight docs theme (2014), logical properties for LTR + RTL */
*, *::before, *::after { box-sizing: content-box; }

html { font-size: 100%; }
body { font-family: Verdana, sans-serif; font-size: 1rem; line-height: 1.6; color: #222; }
:root:lang(ar) body {
  font-family: "Noto Sans Arabic", "Segoe UI", Tahoma, "Geeza Pro", sans-serif;
  line-height: 1.8;
}

.docs-main {
  max-inline-size: 960px;
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
  position: relative; /* only if .callout is the badge's container */
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

@media print {
  p { widows: 2; orphans: 2; }
}
```

## Before you ship

1. Re-run the line count with the real Arabic face and real docs copy:
   `node scripts/measure-line.js ar/page.html ".docs-main > p"`.
2. Check callouts with a badge, lists, nested lists, blockquotes, breadcrumbs
   and Next/Previous links in an Arabic page in Chromium, Safari and Firefox.
3. Paste a code block and an inline command into an Arabic paragraph and check
   that the punctuation stays in order.
4. Zoom to 200% and 400% in both editions: no horizontal scroll, no clipped
   harakat at line-height 1.8.
