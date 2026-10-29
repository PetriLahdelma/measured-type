# docs-theme.css: RTL and typography review for the Arabic edition

**Scope:** `docs-theme.css` (Northlight docs theme, 2014), 44 lines.
**Verdict:** not RTL-ready. Almost every layout rule uses physical `left`/`right` properties, so with `dir="rtl"` the page keeps its English geometry while the text runs the other way. There is also no Arabic font in the stack, and a few typographic defaults are wrong in any language.

**How this was checked:** I rendered the original stylesheet and the corrected one below in Chromium (Playwright, 1280 px viewport) under `<html dir="ltr" lang="en">` and `<html dir="rtl" lang="ar">`, then read back the computed styles and element positions. The measured results are in the [Verification](#verification) section.

**Prerequisite for every fix below:** the Arabic pages must set `<html lang="ar" dir="rtl">` in the markup. Do not set `direction: rtl` in CSS. Logical properties, `:dir()` and `text-align: start/end` all key off the document direction, and `lang` drives font selection and hyphenation.

---

## Findings at a glance

| # | Line | Selector | Problem | Severity |
|---|------|----------|---------|----------|
| 1 | 5 | `body` | Verdana has no Arabic glyphs; line-height and size are tuned for Latin | High |
| 2 | 15-20 | `.sidebar` | `float: left`, `margin-right`, `text-align: right` do not mirror | High |
| 3 | 22-29 | `.callout` | Accent border, padding, margin and radii stay on the left; shadow lands on the accent side | High |
| 4 | 38 | `.docs-main h2` | `text-align: left` pins Arabic headings to the wrong edge | High |
| 5 | 34 | `.docs-main ul` | `padding-left` adds to the UA's right padding in RTL: list indents twice on the wrong axis | High |
| 6 | 35 | `.docs-main blockquote` | 2em indent stays on the left | High |
| 7 | 32 | `.nav-next::after` | "Next" arrow points right; spacing on the wrong side; arrow is announced by screen readers | High |
| 8 | 37 | `.note-badge` | Pinned to the top-right corner in both directions | Medium |
| 9 | 31 | `.breadcrumb .sep` | `translateX(2px)` nudges the separator the wrong way | Low |
| 10 | 40 | `.hero-illustration` | Tilt direction does not mirror | Low (design call) |
| 11 | 2, 7-12 | `*`, `.docs-main` | `content-box` plus fixed `width: 960px` gives a 1024 px box that overflows | Medium |
| 12 | 13 | `.docs-main p` | `75ch` is measured from Verdana's "0", not the Arabic font | Low |
| 13 | 43 | `@media print` | `widows: 1; orphans: 1` explicitly allows stranded single lines | Medium |

Lines 4 (`html { font-size: 100% }`) and 39 (`text-align: center`) are fine as they are.

---

## Detailed findings and fixes

### 1. No Arabic font, and Latin-tuned metrics (line 5) - High

```css
body { font-family: Verdana, sans-serif; font-size: 1rem; line-height: 1.6; color: #222; }
```

- **Font:** Verdana contains no Arabic script. Every Arabic character falls through to whatever the OS returns for `sans-serif`, which differs across Windows, macOS, Android and Linux, so the edition will look different on every platform and may pick a font with poor joining or diacritic support. Name an Arabic face explicitly. Tahoma is a sensible system fallback: it is Verdana's narrower sibling by the same designer and ships with Arabic glyphs on Windows and macOS. For consistent rendering, self-host a web font such as Noto Sans Arabic or IBM Plex Sans Arabic.
- **Line height:** Arabic has tall ascenders (alef, lam), deep descenders and stacked marks (harakat, shadda over a letter with a dot). At `1.6` marks from adjacent lines collide or get clipped, especially in vocalised text. Use about `1.8`.
- **Size:** at the same nominal size, Arabic letterforms read noticeably smaller than Verdana's very large x-height. Bump the body size slightly for Arabic (about `1.0625rem`, i.e. 17 px).

**Fix:** keep the Latin rule and add a language-scoped override. `:lang()` matches on the inherited `lang`, so `body:lang(ar)` works with `lang="ar"` on `<html>`.

```css
body:lang(ar) {
  font-family: "Noto Sans Arabic", Tahoma, Verdana, sans-serif;
  font-size: 1.0625rem;
  line-height: 1.8;
}
```

Putting the Arabic face first means embedded Latin (product names, code identifiers) renders in that font's Latin glyphs, which harmonise with the Arabic. If you prefer Latin runs to stay in Verdana, put `Verdana` first instead; the browser then falls back per character for Arabic, but expect a visible size mismatch between Verdana and the Arabic face. Load the web font with `font-display: swap` and subset it to the Arabic ranges you actually use.

### 2. Sidebar does not mirror (lines 15-20) - High

```css
.sidebar { float: left; width: 240px; margin-right: 24px; text-align: right; }
```

In RTL the sidebar must move to the right edge (navigation sits at the reading start) and its gutter must face the content. Measured in RTL with the original CSS: the sidebar still floats **left**.

`text-align: right` was chosen so that LTR sidebar labels hug the content column. In RTL the content is to the sidebar's left, so the labels must align left. That is the *end* edge in both directions.

**Fix:**

```css
.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}
```

`float: inline-start` is supported in Chrome/Edge 118+, Firefox 55+ and Safari 15+. If you must support older Chromium, add a fallback:
`.sidebar:dir(rtl) { float: right; }` after `float: left`. Better still, replace the float with a grid or flex layout, which mirrors automatically.

### 3. Callout accent, radii and shadow (lines 22-29) - High

```css
.callout {
  border-left: 4px solid #0a6;
  padding-left: 16px;
  margin-left: 0;
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}
```

All five box properties are physical, so in RTL the green accent bar ends up on the trailing edge, away from where Arabic lines start. Measured in RTL: `border-left-width: 4px`, `border-right-width: 0px`.

The shadow is a quieter problem. In LTR it sits on the right and bottom, opposite the accent. If only the border is flipped, the shadow lands on the **same** side as the accent bar and the callout looks lopsided. Either flip its x-offset with the direction, or make it vertical-only so there is nothing to flip.

**Fix:**

```css
.callout {
  --callout-shadow-x: 2px;
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;
  border-end-start-radius: 6px;
  box-shadow: var(--callout-shadow-x) 2px 0 rgba(0, 0, 0, 0.1);
}
.callout:dir(rtl) { --callout-shadow-x: -2px; }
```

Mapping for the radii in horizontal writing: `border-top-left-radius` becomes `border-start-start-radius` (block-start, inline-start) and `border-bottom-left-radius` becomes `border-end-start-radius` (block-end, inline-start).

Unrelated to RTL: `#0a6` is hardcoded. If the docs theme has tokens, move it to one (for example `--color-accent`).

### 4. Headings forced left (line 38) - High

```css
.docs-main h2 { text-align: left; }
```

This overrides the natural alignment, so every Arabic `h2` sits flush left while the body text below it starts on the right. Measured in RTL: `text-align: left`.

**Fix:** `text-align: start;` or delete the rule entirely, since `start` is the initial value.

### 5. List indentation doubles in RTL (line 34) - High

```css
.docs-main ul { padding-left: 1.5em; }
```

Browsers give lists a default `padding-inline-start: 40px`. In LTR your `padding-left` overrides it because both resolve to the left side. In RTL the UA default resolves to the **right**, so it survives, and your rule adds an extra 1.5em on the left. Measured in RTL: `padding-left: 24px` **and** `padding-right: 40px`. Lists end up indented on both sides, with the bullet gutter at the default width instead of your 1.5em.

**Fix:** `padding-inline-start: 1.5em;`

### 6. Blockquote indent on the wrong side (line 35) - High

```css
.docs-main blockquote { margin: 1.5em 0 1.5em 2em; }
```

The four-value shorthand is physical (top right bottom left), so the 2em indent stays on the left. Measured in RTL: `margin-left: 32px`, `margin-right: 0`.

**Fix:**

```css
.docs-main blockquote {
  margin-block: 1.5em;
  margin-inline: 2em 0; /* start end */
}
```

If the Arabic docs use inline `<q>` quotations, also set Arabic quotation marks, which are guillemets: `:lang(ar) q { quotes: "«" "»" "‹" "›"; }`.

### 7. "Next" arrow (line 32) - High

```css
.nav-next::after { content: "\2192"; margin-left: 0.25em; }
```

Three problems:

1. **Direction.** U+2192 RIGHTWARDS ARROW is not a Unicode bidi-mirrored character, so it keeps pointing right in RTL. In Arabic, "next" is to the left, so the arrow points backwards. (Paired glyphs such as `‹ ›` or `( )` do mirror automatically; arrows do not.)
2. **Spacing.** The gap sits on the physical left. In RTL the generated arrow comes after the text, to its left, so the gap ends up on the far side of the arrow and the arrow touches the word.
3. **Accessibility.** Generated content is read by screen readers, so the link is announced as "Next, rightwards arrow". The arrow is decorative.

**Fix:**

```css
.nav-next::after {
  content: "\2192" / "";
  margin-inline-start: 0.25em;
}
.nav-next:dir(rtl)::after { content: "\2190" / ""; }
```

The `/ ""` part gives the pseudo-element empty alternative text. Browsers that do not understand the alt syntax drop the whole declaration, so if you support old Safari or Firefox, precede each one with a plain `content: "\2192";` line. If you replace the glyph with an SVG chevron, mirror it with `.nav-next:dir(rtl)::after { scale: -1 1; }`.

The same check applies to any "previous" link and to the breadcrumb separator glyph in the markup: if it is `›`, it mirrors on its own; if it is `→`, `▸` or an icon, it needs the same treatment.

### 8. Note badge pinned top-right (line 37) - Medium

```css
.note-badge { position: absolute; top: 8px; right: 8px; }
```

Status badges belong in the end corner, which is the top-left in RTL. Measured in RTL: the badge stays on the right.

**Fix:**

```css
.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
```

Also note that no rule in this file establishes a containing block (`position: relative`) for the badge. If the parent is not positioned elsewhere, the badge is placed relative to the page, not its note.

### 9. Breadcrumb separator nudge (line 31) - Low

```css
.breadcrumb .sep { display: inline-block; transform: translateX(2px); }
```

`translateX` is physical. If the 2 px nudge exists to optically centre the separator between crumbs, in RTL it pushes the separator toward the wrong neighbour.

**Fix:**

```css
.breadcrumb .sep { display: inline-block; translate: 2px 0; }
.breadcrumb .sep:dir(rtl) { translate: -2px 0; }
```

Using the standalone `translate` property also stops this rule from clobbering any other `transform` on the element.

### 10. Hero tilt (line 40) - Low, design decision

```css
.hero-illustration { transform: rotate(-4deg); }
```

A counter-clockwise tilt "leans into" LTR reading. In a mirrored layout most teams also mirror the tilt: `.hero-illustration:dir(rtl) { rotate: 4deg; }` (and switch the base rule to `rotate: -4deg;`). Whether the illustration itself should be flipped with `scale: -1 1` depends on its content: never flip artwork that contains text, logos, clocks or real-world objects with a fixed handedness. Ask the illustrator.

### 11. Box model and fixed width (lines 2, 7-12) - Medium

```css
*, *::before, *::after { box-sizing: content-box; }
.docs-main { width: 960px; margin: 0 auto; padding-left: 32px; padding-right: 32px; }
```

With `content-box`, the padding is added to the 960 px width. Measured: `.docs-main` renders **1024 px** wide, so it overflows any viewport narrower than that, including most tablets in portrait. It is not an RTL bug, but the Arabic edition will inherit it, and horizontal scroll in RTL starts at the right edge, which makes the overflow even more confusing.

**Fix:**

```css
*, *::before, *::after { box-sizing: border-box; }
.docs-main {
  inline-size: 100%;
  max-inline-size: 960px;
  margin-inline: auto;
  padding-inline: 32px;
}
```

Switching the global box model affects every element with padding or a border, so check components with explicit widths after the change.

### 12. Measure in `ch` (line 13) - Low

```css
.docs-main p { max-width: 75ch; }
```

`ch` is the advance width of "0" in the first available font. In the Latin edition that is Verdana's very wide zero, so 75ch is closer to 48em, already on the long side. In the Arabic edition the value depends on which font comes first in the stack, so the measure changes when the font stack changes. Arabic also reads comfortably at a similar or slightly shorter line length than Latin.

**Fix:** use the logical name and pick the measure per language:

```css
.docs-main p { max-inline-size: 70ch; }
.docs-main p:lang(ar) { max-inline-size: 38em; }
```

Check the final value visually: target roughly 10 to 15 Arabic words per line.

### 13. Print widows and orphans (line 43) - Medium, typographic

```css
@media print { p { widows: 1; orphans: 1; } }
```

The default for both properties is `2`. Setting them to `1` explicitly allows a single line of a paragraph to be stranded at the top or bottom of a printed page, which is the thing these properties exist to prevent.

**Fix:** `p { widows: 2; orphans: 2; }` (or `3` for long-form docs). Also add `h2, h3 { break-after: avoid; }` so headings do not end up alone at the foot of a page.

---

## Arabic typography guardrails (not in this file yet, but worth adding)

These are not bugs in the current file. They are rules that commonly break Arabic and that the docs theme should lock down before content is translated:

- **Never letter-space Arabic.** Any `letter-spacing` breaks cursive joining. Add `:lang(ar) { letter-spacing: 0; }` and audit component styles (buttons, eyebrows, small caps labels) that set tracking.
- **No faux italics.** Arabic has no italic tradition and synthesised oblique looks broken. Use `:lang(ar) :is(em, i, cite) { font-style: normal; }` and convey emphasis with weight or colour instead. Set `font-synthesis: none` for the Arabic face if it lacks a bold you rely on.
- **No `text-transform: uppercase`** for meaning; Arabic has no case, so labels that rely on caps for hierarchy lose it.
- **Isolate mixed-direction runs.** Code, file paths, version numbers and English product names inside Arabic sentences should be wrapped in `<bdi>` or `<code>` and styled with `unicode-bidi: isolate`. Code blocks should stay LTR: `pre, code { direction: ltr; unicode-bidi: isolate; }` with `text-align: left` on `pre`.
- **Justification:** if the theme ever justifies text, Arabic justifies by kashida (letter extension), which browsers handle poorly. Keep `text-align: start` for Arabic body text.

---

## Corrected stylesheet

Drop-in replacement. It behaves identically to the original in LTR (except the 960 px box-model fix in finding 11) and mirrors correctly in RTL.

```css
/* Northlight docs theme (2014), RTL-ready */
*, *::before, *::after { box-sizing: border-box; }

html { font-size: 100%; }
body { font-family: Verdana, sans-serif; font-size: 1rem; line-height: 1.6; color: #222; }
body:lang(ar) {
  font-family: "Noto Sans Arabic", Tahoma, Verdana, sans-serif;
  font-size: 1.0625rem;
  line-height: 1.8;
}

.docs-main {
  inline-size: 100%;
  max-inline-size: 960px;
  margin-inline: auto;
  padding-inline: 32px;
}
.docs-main p { max-inline-size: 70ch; }
.docs-main p:lang(ar) { max-inline-size: 38em; }

.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}

.callout {
  --callout-shadow-x: 2px;
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;
  border-end-start-radius: 6px;
  box-shadow: var(--callout-shadow-x) 2px 0 rgba(0, 0, 0, 0.1);
}
.callout:dir(rtl) { --callout-shadow-x: -2px; }

.breadcrumb .sep { display: inline-block; translate: 2px 0; }
.breadcrumb .sep:dir(rtl) { translate: -2px 0; }

.nav-next::after { content: "\2192"; content: "\2192" / ""; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190"; content: "\2190" / ""; }

.docs-main ul { padding-inline-start: 1.5em; }
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }

.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
.docs-main h2 { text-align: start; }
.figure-caption { text-align: center; }

.hero-illustration { rotate: -4deg; }
.hero-illustration:dir(rtl) { rotate: 4deg; } /* confirm with design */

:lang(ar) { letter-spacing: 0; }
:lang(ar) :is(em, i, cite) { font-style: normal; font-weight: 700; }
pre, code { direction: ltr; unicode-bidi: isolate; }
:lang(ar) q { quotes: "«" "»" "‹" "›"; }

@media print {
  p { widows: 2; orphans: 2; }
  h2, h3 { break-after: avoid; }
}
```

Browser support note: logical properties, `float: inline-start`, `:dir()` and individual transform properties (`translate`, `rotate`, `scale`) are all available in current Chrome, Edge, Firefox and Safari. `:dir()` landed in Chromium 120 (late 2023); if you support older Chromium, replace `:dir(rtl)` with `[dir="rtl"] &` style attribute selectors such as `[dir="rtl"] .callout`.

---

## Verification

Computed values from Chromium, test page with each selector present, `lang="ar" dir="rtl"`:

| Check | Original CSS in RTL | Corrected CSS in RTL |
|---|---|---|
| `.docs-main` rendered width | 1024 px (overflows) | 960 px |
| Sidebar side | left (wrong) | right |
| Sidebar `text-align` | right (wrong) | end, resolves to left |
| `h2` `text-align` | left (wrong) | start |
| Callout border L / R | 4px / 0 (wrong) | 0 / 4px |
| Callout shadow x-offset | +2px (same side as accent) | -2px |
| `ul` padding L / R | 24px / 40px (doubled) | 0 / 25.5px |
| Blockquote margin L / R | 32px / 0 (wrong) | 0 / 34px |
| Next arrow glyph | → (wrong) | ← (alt text empty) |
| Next arrow gap L / R | 4px / 0 (wrong) | 0 / 4.25px |
| Note badge corner | right (wrong) | left |
| Separator nudge | +2px (wrong) | -2px |
| Body font / line-height | Verdana, sans-serif / 25.6px | Noto Sans Arabic stack / 30.6px |

In LTR the corrected stylesheet reproduces the original geometry for every row except the width, which drops from the overflowing 1024 px to the intended 960 px.

Not verified here: actual Arabic glyph rendering with the web font loaded (the test machine had no Noto Sans Arabic installed), print pagination and real docs markup. Before launch, review a real translated page in Safari and Chrome on Windows, since system Arabic fallbacks differ most there.
