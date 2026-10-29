# docs-theme.css: RTL and typography review for the Arabic edition

Scope: every rule in `docs-theme.css` (44 lines). Findings were checked by rendering the stylesheet in headless Chromium twice, once with `<html lang="en" dir="ltr">` and once with `<html lang="ar" dir="rtl">`, and reading computed styles and box positions. The corrected stylesheet at the end was put through the same check.

## What the render showed (current file, `dir="rtl"`)

| Element | Expected in RTL | Actual |
|---|---|---|
| `.sidebar` | floats right, text aligned toward content (left) | floats **left**, text aligned **right** |
| `.callout` accent border | on the right | on the **left** (`border-left: 4px`, `border-right: 0`) |
| `.docs-main ul` | indent on the right only | **40px right (UA default) plus 24px left**: two indents |
| `blockquote` indent | right | **left** (`margin-left: 32px`) |
| `h2` | right aligned like the body text | **left** aligned while paragraphs are right aligned |
| `.nav-next::after` | arrow pointing left (forward in RTL) | `→`, pointing **back** |
| `.docs-main` width | 960px | **1024px** (content-box plus 64px padding; affects both directions) |

The root cause is the same in almost every rule: physical properties (`left`, `right`, `top-left`, `translateX`) where the intent is "start side" or "end side". The fix is logical properties, which follow `dir` automatically, so one stylesheet serves both editions with no `[dir="rtl"]` override layer to maintain.

Set direction in markup, not CSS: `<html lang="ar" dir="rtl">`. Do not use `direction: rtl` in the stylesheet; it does not set the base direction for bidi resolution the way the `dir` attribute does, and `:dir()` selectors will not see it.

## Findings by line

### Breaks in RTL

**L7-12 `.docs-main`: `width: 960px` with `padding-left` / `padding-right`**
Symmetric today, so it does not visibly break, but the fixed `width` causes horizontal overflow on narrow screens and pairs physical padding with the rest of the system.
```css
.docs-main {
  max-inline-size: 960px;
  margin-inline: auto;
  padding-inline: 32px;
}
```

**L13 `.docs-main p { max-width: 75ch; }`**
Use `max-inline-size: 75ch`. Note that `ch` is the width of the digit "0" in the rendered font. When the Arabic font changes, the measure changes with it, so check line length in the Arabic edition visually (aim for roughly 9 to 12 words per line) rather than trusting the number.

**L15-20 `.sidebar`: `float: left`, `margin-right`, `text-align: right`**
Render confirmed the sidebar stays on the left in RTL and its text stays right aligned (pushed away from the content instead of toward it).
```css
.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}
```
`float: inline-start` needs Chrome 118+, Safari 15+, Firefox 55+. Better still, retire the float and lay out `.docs-main` with grid or flex (`display: grid; grid-template-columns: 240px 1fr; gap: 24px`): grid columns follow the writing direction with no extra rules.

**L22-29 `.callout`: border, padding, margin, radii all on the left; physical shadow**
The accent bar marks the start edge of the text. In RTL it must move to the right, along with the rounded corners.
```css
.callout {
  --shadow-x: 2px;
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;  /* was border-top-left-radius */
  border-end-start-radius: 6px;    /* was border-bottom-left-radius */
  box-shadow: var(--shadow-x) 2px 0 rgba(0, 0, 0, 0.1);
}
.callout:dir(rtl) { --shadow-x: -2px; }
```
`box-shadow` has no logical form. With the bar mirrored, a hard 2px offset shadow still falling to the right reads as a one-off; flipping its x offset keeps the mirrored component consistent. If the design system instead wants one fixed light source across both editions, leave the shadow alone, but decide it deliberately.

**L31 `.breadcrumb .sep { transform: translateX(2px); }`**
Transforms are physical; in RTL the nudge pushes the separator toward the wrong neighbour. Use a logical offset:
```css
.breadcrumb .sep { display: inline-block; position: relative; inset-inline-start: 2px; }
```
Also check the separator glyph in the markup. `›` (U+203A) and `‹` are Bidi_Mirrored and flip on their own in RTL text. `→`, `>` used as an arrow, and SVG chevrons do not and need explicit handling (see L32). `/` is neutral and safe.

**L32 `.nav-next::after { content: "\2192"; margin-left: 0.25em; }`**
Two problems. U+2192 is not a mirrored character, so "next" points backwards in Arabic (render confirmed `→`). And `margin-left` puts the gap on the wrong side, since `::after` renders on the left in RTL.
```css
.nav-next::after { content: "\2192" / ""; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190" / ""; }
```
The `/ ""` alt text keeps screen readers from announcing "right arrow" after the link name (Chrome 77+, Safari 17.4+, Firefox 128+; older browsers ignore the whole declaration, so keep a plain `content: "\2192";` line before it if those matter). Apply the same rule to any `.nav-prev` and to chevron icons in pagination or disclosure widgets.

**L34 `.docs-main ul { padding-left: 1.5em; }`**
The worst silent bug in the file. The browser default for lists is `padding-inline-start: 40px`, which in RTL maps to the right. The author rule sets the left side, so it does not replace it: the render showed 40px of padding on the right **and** 24px on the left. Bullets end up over-indented and the text column narrows.
```css
.docs-main ul,
.docs-main ol { padding-inline-start: 1.5em; }
```

**L35 `.docs-main blockquote { margin: 1.5em 0 1.5em 2em; }`**
The four-value shorthand is physical: indent stays on the left.
```css
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }
```

**L37 `.note-badge { position: absolute; top: 8px; right: 8px; }`**
Corner badges mirror with the layout (top-right in LTR becomes top-left in RTL).
```css
.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
```

**L38 `.docs-main h2 { text-align: left; }`**
Forces left-aligned headings over right-aligned Arabic body text. The rule restates the default, so delete it. If an explicit value is required, use `text-align: start`.

**L40 `.hero-illustration { transform: rotate(-4deg); }`**
Leave as is unless the illustration itself is mirrored for the Arabic edition. Do not auto-mirror art that contains text, logos, clocks, hands or real-world objects. If the art is mirrored, mirror the tilt too: `.hero-illustration:dir(rtl) { transform: scaleX(-1) rotate(-4deg); }`.

**L39 `.figure-caption { text-align: center; }`**: fine in both directions.

### Typographically wrong

**L5 `font-family: Verdana, sans-serif`: no Arabic glyphs**
Verdana has no Arabic coverage, so every Arabic character falls through to whatever the OS picks for generic `sans-serif`. That means a different face per platform, metrics that do not match the Latin, and a Latin face (Verdana, very large x-height) that towers over the Arabic in mixed lines. Give Arabic its own stack and size:
```css
:lang(ar) body, body:lang(ar) {
  font-family: "Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif;
  font-size: 1.125rem;
  line-height: 1.8;
}
```
- Pick one primary face and self-host it (Noto Naskh Arabic for a book-like reading face, Noto Sans Arabic or IBM Plex Sans Arabic for a UI-like one). The others are platform fallbacks.
- Arabic reads smaller than Latin at the same `font-size`; 1.125rem is a starting point to tune against the chosen face.
- Arabic has tall ascenders, deep descenders and stacked diacritics (harakat). 1.6 clips or crowds vowelled text; 1.75 to 1.9 is the usual range.
- Keep Verdana (or its replacement) after the Arabic family only if Latin terms inside Arabic text should use it; otherwise the Arabic face's own Latin is usually better matched.

**L42-44 `@media print { p { widows: 1; orphans: 1; } }`**
Wrong in any language. A value of 1 explicitly allows a single stranded line at the top or bottom of a printed page, which is the thing these properties exist to prevent. The browser default is 2; set 2 or 3:
```css
@media print { p { widows: 2; orphans: 2; } }
```

**L2 `box-sizing: content-box` on everything**
Not RTL specific, but it is why `.docs-main` renders at 1024px instead of 960px and why the 240px sidebar is wider than its declared width once padding is added. Switch to `border-box`. Check any component that compensated for the extra width before shipping the change.

### Missing rules the Arabic edition needs

These are not in the file yet but will break docs pages:

1. **Code stays LTR.** Code samples, commands, file paths and keyboard shortcuts must not be reordered by the bidi algorithm, and `pre` must not right-align.
   ```css
   pre, code, kbd, samp { direction: ltr; unicode-bidi: isolate; }
   pre { text-align: left; }
   ```
2. **No synthetic italics.** Arabic has no italic tradition, and fonts rarely ship one, so the browser slants the glyphs, which breaks the calligraphic stroke. Emphasise with weight or colour instead:
   ```css
   :lang(ar) :is(em, i, cite, dfn) { font-style: normal; font-weight: 700; }
   ```
3. **Never add `letter-spacing` or `text-transform` to Arabic.** Tracking breaks the joins between connected letters. If any component in the wider theme sets `letter-spacing` (eyebrows, buttons, labels), reset it under `:lang(ar)` with `letter-spacing: 0`.
4. **Avoid `text-align: justify` for Arabic body text** unless tested in every target browser. Justification by kashida (letter extension) is supported unevenly and inter-word stretching looks worse in Arabic than in Latin.
5. **Embedded LTR runs** (product names, version numbers, URLs) inside Arabic sentences: wrap them in `<bdi>` or `<span dir="ltr">` in the content, so punctuation such as a trailing period does not jump to the wrong end.
6. **Numerals** (Western 0-9 versus Arabic-Indic) are an editorial decision. Decide once and tell translators; CSS cannot convert them reliably.

## Corrected stylesheet

Verified in the same render harness: in `dir="rtl"` the sidebar floats right with end-aligned text, the callout border and radii sit on the right, the shadow offset is -2px, the list has a single 1.5em indent on the right, the blockquote indents on the right, the badge sits top-left, the breadcrumb nudge flips, the arrow is `←`, `pre` stays LTR, `em` is upright and the body uses the Arabic stack at 1.8 line height. LTR output is unchanged apart from the 960px width fix.

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
:lang(ar) body, body:lang(ar) {
  font-family: "Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif;
  font-size: 1.125rem;
  line-height: 1.8;
}
:lang(ar) :is(em, i, cite, dfn) { font-style: normal; font-weight: 700; }

.docs-main {
  max-inline-size: 960px;
  margin-inline: auto;
  padding-inline: 32px;
}
.docs-main p { max-inline-size: 75ch; }

.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}

.callout {
  --shadow-x: 2px;
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;
  border-end-start-radius: 6px;
  box-shadow: var(--shadow-x) 2px 0 rgba(0, 0, 0, 0.1);
}
.callout:dir(rtl) { --shadow-x: -2px; }

.breadcrumb .sep { display: inline-block; position: relative; inset-inline-start: 2px; }
.nav-next::after { content: "\2192"; content: "\2192" / ""; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190"; content: "\2190" / ""; }

.docs-main ul,
.docs-main ol { padding-inline-start: 1.5em; }
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }

.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
.figure-caption { text-align: center; }
.hero-illustration { transform: rotate(-4deg); }

pre, code, kbd, samp { direction: ltr; unicode-bidi: isolate; }
pre { text-align: left; }

@media print {
  p { widows: 2; orphans: 2; }
}
```

Browser floor for this version: `:dir()` needs Chrome 120+, Safari 16.4+, Firefox 49+. If older Chromium matters, duplicate each `:dir(rtl)` rule as `[dir="rtl"] .callout` (and so on), which works when `dir` is set on `<html>`.

## Before shipping

- Open three real Arabic pages (one with code, one with a callout and lists, one with breadcrumbs and pagination) in Chrome, Safari and Firefox with `dir="rtl"`.
- Read a page with fully vowelled text to confirm diacritics do not collide at the chosen line height.
- Print one page to PDF to confirm the widows and orphans change.
- Grep the rest of the theme for `left`, `right`, `translateX` and `letter-spacing`; the same patterns almost certainly exist outside this file.
