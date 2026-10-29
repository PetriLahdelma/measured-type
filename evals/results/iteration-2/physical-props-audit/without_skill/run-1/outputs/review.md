# docs-theme.css: RTL and typography review for the Arabic edition

Scope: every rule in `docs-theme.css` (44 lines), checked for right-to-left breakage and typographic correctness.

Method: I read the file, then rendered it in headless Chromium on a test page with `<html lang="ar" dir="rtl">` and real Arabic text, and measured computed styles and element positions. The "Measured" notes below come from that run, not from guesswork. I then wrote the revised stylesheet at the end of this document and ran it through the same page in both `ltr` and `rtl` to confirm the fixes.

Prerequisite: set direction in markup, not CSS. The Arabic pages need `<html lang="ar" dir="rtl">`. Every fix below keys off `dir` (through logical properties and `:dir()`) and `lang` (through `:lang()`). Do not put `direction: rtl` in the stylesheet, because the bidi algorithm and form controls read the attribute.

## Severity key

- **Breaks**: wrong layout or wrong meaning in RTL.
- **Wrong**: renders, but typographically incorrect for Arabic (or for any language).
- **Minor**: polish, or a decision you need to make.

## Findings

### 1. `.sidebar` stays on the left and aligns text away from the content (Breaks)

```css
.sidebar { float: left; width: 240px; margin-right: 24px; text-align: right; }
```

Measured: in RTL the sidebar still floats left with its 24px gutter on the right, and its text is still right-aligned (so it now hugs the outer edge instead of the content).

Fix: the original intent is "sidebar at the start, text aligned toward the content". That is `inline-start` and `end`:

```css
.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}
```

`float: inline-start` is supported in Chrome 118+, Safari 15+ and Firefox 55+. If you need older browsers, or once you touch this layout anyway, replace the float with a grid on `.docs-main` (`grid-template-columns: 240px 1fr`); grid tracks follow the writing direction automatically.

### 2. `.callout` accent bar, padding and radii are pinned to the left (Breaks)

```css
border-left: 4px solid #0a6; padding-left: 16px; margin-left: 0;
border-top-left-radius: 6px; border-bottom-left-radius: 6px;
```

Measured: in RTL the 4px bar and the 16px padding stay on the left, which is the line-end side in Arabic. The bar no longer marks where reading starts.

Fix (radii map to `start-start` = block start + inline start, and `end-start` = block end + inline start):

```css
.callout {
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;
  border-end-start-radius: 6px;
}
```

### 3. `.callout` shadow offset is physical (Minor, decide)

`box-shadow: 2px 2px 0` has no logical form. After fix 2, the RTL callout has its bar on the right and its shadow also on the right, so the component no longer looks like a mirror of the LTR one. Two valid choices:

- Mirror it with the component: `box-shadow: var(--callout-shadow-x, 2px) 2px 0 rgba(0,0,0,.1);` plus `.callout:dir(rtl) { --callout-shadow-x: -2px; }`.
- Remove the question: `box-shadow: 0 2px 0 rgba(0,0,0,.1);`.

Keep it physical only if the shadow represents one global light source across the whole UI. The revised file uses the mirroring option.

### 4. `.nav-next::after` arrow points the wrong way (Breaks, changes meaning)

```css
.nav-next::after { content: "\2192"; margin-left: 0.25em; }
```

Measured: in RTL the generated content is still `→`. U+2192 is not a Bidi_Mirrored character, so the browser will not flip it. In Arabic "next" is to the left, so a right-pointing arrow tells readers to go backwards. The `margin-left` also puts the gap on the wrong side: `::after` sits at the logical end, which is the left in RTL, so the space ends up outside the arrow instead of between the word and the arrow.

Fix:

```css
.nav-next::after { content: "\2192"; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190"; }
```

`:dir()` is supported in Chrome 120+, Safari 16.4+ and Firefox. For older engines use `[dir="rtl"] .nav-next::after` as well. Apply the same rule to any "previous" link and to any arrow or chevron icons (SVG icons need `transform: scaleX(-1)` under `:dir(rtl)`; glyphs like `‹ › « » ( )` mirror on their own, arrows and most icons do not).

### 5. `.breadcrumb .sep` nudge is physical (Breaks, small)

```css
.breadcrumb .sep { display: inline-block; transform: translateX(2px); }
```

`translateX(2px)` always moves right, so in RTL it nudges the separator toward the previous crumb instead of away from it. Replace the transform with a logical margin:

```css
.breadcrumb .sep { display: inline-block; margin-inline-start: 2px; }
```

Also check the separator character in the markup: `›` or `>` will mirror automatically, `→` or an SVG chevron will not (see finding 4).

### 6. `.docs-main h2 { text-align: left; }` forces Arabic headings to the wrong edge (Breaks)

Measured: computed `text-align: left` in RTL, so headings sit flush left while the body text is flush right.

Fix: `text-align: start;`, or delete the declaration, since `start` is the initial value. `.figure-caption { text-align: center; }` is fine as is.

### 7. `.note-badge` stays in the top-right corner (Breaks)

```css
.note-badge { position: absolute; top: 8px; right: 8px; }
```

Measured: in RTL the badge is still 8px from the right edge, so it lands on the side where the Arabic heading or text starts and can overlap it. A corner badge belongs at the inline end.

Fix:

```css
.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
```

Separate from RTL: the file never sets `position: relative` on the badge's container, so the badge positions against whichever ancestor happens to be positioned. Confirm the parent component sets it.

### 8. List indent: the RTL list gets both its own indent and the LTR one (Breaks, subtle)

```css
.docs-main ul { padding-left: 1.5em; }
```

Measured: in RTL the list ends up with `padding-left: 24px` and `padding-right: 40px`. The browser default is `padding-inline-start: 40px`, which maps to the right in RTL, and your `padding-left` overrides a different physical side, so it adds a stray 24px on the left. Result: Arabic lists use the browser's 40px instead of your 1.5em indent, plus dead space on the line-end side.

Fix: `.docs-main ul { padding-inline-start: 1.5em; }`. Do the same for `ol` if it has its own rule.

Optional, editorial decision: if the Arabic edition uses Eastern Arabic numerals, add `.docs-main ol:lang(ar) { list-style-type: arabic-indic; }`. Leave it out if the docs use Western digits, which is common in technical Arabic.

### 9. `blockquote` indent is on the left (Breaks)

```css
.docs-main blockquote { margin: 1.5em 0 1.5em 2em; }
```

Measured: `margin-left: 32px`, `margin-right: 0` in RTL, so the quote is indented at the line end and sits flush with the start edge.

Fix:

```css
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }
```

### 10. `.docs-main` padding: symmetric today, but write it logically (Minor)

`padding-left: 32px; padding-right: 32px;` does not break, because the two values match. Write it as `padding-inline: 32px;` so a future asymmetric edit cannot introduce a mirror bug. Use `margin-inline: auto` for the centering at the same time.

### 11. `.hero-illustration` tilt is directional (Minor, decide)

`transform: rotate(-4deg)` tilts counter-clockwise in both directions. If the tilt is meant to lean "into" the reading direction, mirror it:

```css
.hero-illustration { transform: rotate(var(--hero-tilt, -4deg)); }
.hero-illustration:dir(rtl) { --hero-tilt: 4deg; }
```

Do not mirror the image itself if it contains text, a logo, a screenshot or a code sample.

### 12. Font stack has no Arabic font (Wrong)

```css
body { font-family: Verdana, sans-serif; }
```

Verdana has no Arabic glyphs. Measured on macOS: the Arabic paragraph rendered with two fonts at once. The Arabic letters came from the system fallback (Geeza Pro, 47 glyphs), and the spaces and Latin punctuation came from Verdana (10 glyphs). Word spaces therefore come from a different font than the words, and the fallback differs per OS (Geeza Pro on macOS, Segoe UI or Tahoma on Windows, whatever is installed on Linux and Android), so you cannot control how the Arabic edition looks.

Fix: give Arabic its own stack and put a real Arabic face first, ideally self-hosted so every platform gets the same font:

```css
:lang(ar) {
  font-family: "Noto Naskh Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif;
}
```

Naskh is the conventional style for long-form Arabic reading. For a UI-like docs look, Noto Sans Arabic, IBM Plex Sans Arabic or Vazirmatn are good alternatives; pick one with matching Latin, or pair it deliberately with your Latin face, because Arabic docs are full of Latin code, product names and URLs.

### 13. Size and line-height are tuned for Latin (Wrong)

`font-size: 1rem; line-height: 1.6` works for Verdana, which has an unusually large x-height. Arabic at the same nominal size reads noticeably smaller, and Naskh faces have tall ascenders and deep descenders plus vowel marks (harakat) above and below the letters. At 1.6, lines with diacritics crowd or touch each other.

Fix:

```css
body:lang(ar) { font-size: 1.125rem; line-height: 1.8; }
```

Tune both against the font you choose; 1.7 to 1.9 is the usual range for Naskh body text. Keep `html { font-size: 100%; }`; it correctly respects the user's browser setting.

### 14. Measure: `max-width: 75ch` changes meaning when the font changes (Wrong)

`ch` is the advance width of "0" in the first available font. Measured: with the current stack 75ch = 763px (Verdana's wide zero); with an Arabic font first in the stack, 75ch = 600px. Your line length therefore shifts by about 160px just from the font switch, and neither number is chosen for Arabic. `max-width` is also physical in name (it maps to inline size in horizontal text, so it does not break RTL, but the logical form is clearer).

Fix: use `max-inline-size`, and set the Arabic measure in `em`, which is stable across fonts:

```css
.docs-main p { max-inline-size: 75ch; }
.docs-main p:lang(ar) { max-inline-size: 40em; }
```

Note that 75ch with Verdana is already at the wide end for Latin body text; 65ch to 70ch is more comfortable.

### 15. Print rule allows single-line widows and orphans (Wrong)

```css
@media print { p { widows: 1; orphans: 1; } }
```

`1` means "a single stranded line is fine", which is the opposite of what this rule should do; the CSS default is already `2`. Fix: `p { widows: 2; orphans: 2; }`, or `3` for a more bookish result. Firefox ignores both properties, so it is a Chromium and Safari improvement only.

### 16. Global `box-sizing: content-box` makes the page 1024px wide (Wrong, not RTL)

```css
*, *::before, *::after { box-sizing: content-box; }
.docs-main { width: 960px; ... }
```

`content-box` is already the default, so the rule does nothing except block components that set `border-box`. Measured: `.docs-main` renders 1024px wide (960 plus 2 x 32 padding), and a fixed `width` makes the page scroll horizontally on any screen narrower than that, which includes every phone.

Fix: `box-sizing: border-box` globally and `max-inline-size: 960px` instead of `width`.

## Not in the file, but will break Arabic docs

These are the usual RTL docs failures. The current stylesheet has no rules for them, so they fall to browser defaults, which are wrong for this content.

**Code must stay LTR.** Inside an RTL paragraph, an inline `code` span like `npm install --save` gets reordered by the bidi algorithm (the leading `--` and trailing punctuation jump to the wrong end), and `pre` blocks right-align. Add:

```css
.docs-main :is(pre, code, kbd, samp) { direction: ltr; unicode-bidi: isolate; }
.docs-main pre { text-align: left; }
```

For user-generated or mixed strings (file paths, API names inside Arabic sentences), use `<bdi>` or `dir="auto"` in the markup.

**No synthetic italics.** Browsers render `em`, `i`, `cite`, `dfn` and `var` in italic, and Arabic fonts have no italic, so you get a mechanically slanted Arabic that is typographically wrong. Use weight for emphasis:

```css
:lang(ar) :is(em, i, cite, dfn, var) { font-style: normal; font-weight: bolder; }
```

**Never add `letter-spacing` or `text-transform` to Arabic.** Letter-spacing breaks the joins between connected letters. Neither exists in the file today; keep them out of any `:lang(ar)` scope, including headings and buttons.

## Revised stylesheet

Verified in Chromium: in LTR it renders the same as the original (except for the intentional fixes 15 and 16). In RTL the sidebar, callout bar, badge, list and quote indents, arrow, heading alignment and tilt all mirror, and inline code stays LTR.

```css
/* Northlight docs theme, direction-agnostic revision */
*, *::before, *::after { box-sizing: border-box; }

html { font-size: 100%; }
body {
  font-family: Verdana, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #222;
}
:lang(ar) {
  font-family: "Noto Naskh Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif;
}
body:lang(ar) {
  font-size: 1.125rem;
  line-height: 1.8;
}
:lang(ar) :is(em, i, cite, dfn, var) {
  font-style: normal;
  font-weight: bolder;
}

.docs-main {
  max-inline-size: 960px;
  margin-inline: auto;
  padding-inline: 32px;
}
.docs-main p { max-inline-size: 75ch; }
.docs-main p:lang(ar) { max-inline-size: 40em; }

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
  box-shadow: var(--callout-shadow-x, 2px) 2px 0 rgba(0, 0, 0, 0.1);
}
.callout:dir(rtl) { --callout-shadow-x: -2px; }

.breadcrumb .sep { display: inline-block; margin-inline-start: 2px; }
.nav-next::after { content: "\2192"; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190"; }

.docs-main ul { padding-inline-start: 1.5em; }
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }

.docs-main pre,
.docs-main code,
.docs-main kbd,
.docs-main samp {
  direction: ltr;
  unicode-bidi: isolate;
}
.docs-main pre { text-align: left; }

.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
.docs-main h2 { text-align: start; }
.figure-caption { text-align: center; }
.hero-illustration { transform: rotate(var(--hero-tilt, -4deg)); }
.hero-illustration:dir(rtl) { --hero-tilt: 4deg; }

@media print {
  p { widows: 2; orphans: 2; }
}
```

Note on the RTL measurements: the list indent and quote margin come out at 27px and 36px instead of 24px and 32px because they are `em` values and the Arabic body is now 18px. That is intended.

## Before you ship

- Review the Arabic pages with a native reader, on Windows and Android as well as macOS, after you self-host the chosen font.
- Search the rest of the codebase for the same patterns: `left`, `right`, `margin-left/right`, `padding-left/right`, `border-left/right`, `translateX`, `text-align: left/right`, `float`, arrow characters and directional icons. The stylelint plugin `stylelint-use-logical` can flag new physical properties automatically.
- Decide findings 3, 8 (numerals) and 11 with design; the others are straightforward fixes.
