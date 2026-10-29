# docs-theme.css: RTL and typography review for the Arabic edition

Scope: every rule in `docs-theme.css` (44 lines). Findings were checked by rendering the file in headless Chromium with `<html lang="ar" dir="rtl">` and reading computed styles; the proposed fixes were rendered the same way in both directions (results at the end).

Precondition: direction must come from markup (`<html lang="ar" dir="rtl">`), not from `direction: rtl` in CSS. Everything below assumes `dir` and `lang` are set on the root, so `:dir(rtl)` and `:lang(ar)` match.

## Severity key

- **Breaks**: wrong in RTL; readers will see it.
- **Typo**: typographically wrong, in Arabic or in general.
- **Tidy**: no visible bug today, but should change while you are in here.

---

## 1. RTL findings

| # | Line | Rule | Severity | What happens in RTL |
|---|------|------|----------|---------------------|
| 1 | 16-19 | `.sidebar { float: left; margin-right: 24px; text-align: right; }` | Breaks | The sidebar stays on the left, so it sits at the *end* of the reading line instead of the start. The gutter lands on the wrong side and the text alignment flips to the wrong edge (it is ragged toward the content in LTR and ends up flush against the content in RTL). |
| 2 | 23-26 | `.callout` `border-left`, `padding-left`, `margin-left`, `border-top-left-radius`, `border-bottom-left-radius` | Breaks | The accent bar, its padding and its rounded corners stay on the left, which is the trailing edge in Arabic. A callout bar belongs at the start of the line. |
| 3 | 28 | `.callout { box-shadow: 2px 2px ... }` | Breaks (design call) | Box shadows have no logical form. Once the bar moves to the right, the shadow still falls to the right, so it piles up on the bar side. Flip the x offset in RTL so the shadow stays opposite the bar. |
| 4 | 31 | `.breadcrumb .sep { transform: translateX(2px); }` | Breaks | Transforms are physical. The nudge pushes the separator toward the previous crumb in RTL instead of away from it. Also check the separator glyph itself: `›`, `>` and `/` behave differently (see note A). |
| 5 | 32 | `.nav-next::after { content: "\2192"; margin-left: 0.25em; }` | Breaks | U+2192 RIGHTWARDS ARROW is not a Bidi-mirrored character, so "next" still points right, which means *back* in Arabic. The `::after` box moves to the left end of the link, so `margin-left` now pads the outer edge and the arrow touches the text. Screen readers also announce "right arrow" after the link text. |
| 6 | 34 | `.docs-main ul { padding-left: 1.5em; }` | Breaks | Measured: in RTL the list gets `padding-left: 24px` **and** `padding-right: 40px`. The UA default is `padding-inline-start: 40px`, which maps to the right in RTL, and your physical rule does not override it. Result: double indentation, a dead 24px gap on the left and bullets not aligned with your 1.5em design. |
| 7 | 35 | `.docs-main blockquote { margin: 1.5em 0 1.5em 2em; }` | Breaks | The 2em indent stays on the left (the trailing side). Quotes look pushed away from the margin they should hang off. |
| 8 | 37 | `.note-badge { top: 8px; right: 8px; }` | Breaks | The badge stays top-right, which is the start corner in RTL, where it collides with headings and the first word of the line. It should sit in the end corner. |
| 9 | 38 | `.docs-main h2 { text-align: left; }` | Breaks | Measured: computed `left` in RTL. Arabic headings will be flush left while the body text is flush right. The rule is redundant in LTR anyway (`start` is the default). |
| 10 | 40 | `.hero-illustration { transform: rotate(-4deg); }` | Design call | A tilt reads as "leaning into" the reading direction. Mirrored layouts usually flip it. Flip the rotation only; do not mirror the image itself if it contains text, UI screenshots, logos or a recognisable scene. |
| 11 | 8-11 | `.docs-main` `width`, `margin: 0 auto`, `padding-left`, `padding-right` | Tidy | Symmetric, so nothing breaks, but convert to logical properties so the file has one consistent model and nobody later adds an asymmetric `padding-left`. |
| 12 | 39 | `.figure-caption { text-align: center; }` | OK | Direction-neutral. Leave it. |

**Note A, breadcrumb glyph.** If the separator is text, `›` (U+203A), `<`, `>`, `(` and `)` are Bidi-mirrored and the browser flips them automatically inside an RTL run. `/` and `→` are not mirrored. If the separator is an SVG or a background image, it will not flip; mirror it with `:dir(rtl) .sep svg { transform: scaleX(-1); }`.

## 2. Typography findings

| # | Line | Rule | Severity | Problem |
|---|------|------|----------|---------|
| 13 | 5 | `font-family: Verdana, sans-serif;` | Typo (Breaks for Arabic) | Verdana has no Arabic glyphs. Every Arabic character falls through to the OS generic `sans-serif`: Geeza Pro on macOS/iOS, Segoe UI or Tahoma on Windows, Noto on Android. The edition will look different on every platform and the line metrics will not match what you designed. Verdana's very large x-height also makes embedded Latin terms (product names, API names) look oversized next to Arabic. Declare an Arabic face explicitly for `:lang(ar)` and put it **first**, so shared characters (digits, comma, parentheses, question mark) come from the Arabic font and match the surrounding text. |
| 14 | 5 | `font-size: 1rem` | Typo | At the same nominal size Arabic letterforms read noticeably smaller than Latin (smaller bowls, shorter core height). Body Arabic at 16px is tight for long-form docs; 18px (`1.125rem`) is a reasonable starting point. Keep `rem` so user zoom still works. |
| 15 | 5 | `line-height: 1.6` | Typo | Arabic has tall ascenders (alef, lam), deep descenders and stacked marks (harakat, shadda). At 1.6 vocalised text and Quranic or poetic quotations will clip or collide between lines. Use around 1.8 for Naskh-style body text. |
| 16 | 13 | `.docs-main p { max-width: 75ch; }` | Typo | `ch` is the width of "0" in the *first available font*, which is Verdana, not the Arabic font actually painting the text. Verdana's "0" is wide (about 10.2px at 16px; measured paragraph width 763px), so the Arabic measure is whatever falls out of a Latin metric. Also 75 characters is at the loose end even for Latin. Give Arabic its own measure in `em` and tune it with real content (start around 36-40em at 18px). Use `max-inline-size` so it stays correct if a vertical script is ever added. |
| 17 | 43 | `@media print { p { widows: 1; orphans: 1; } }` | Typo (general) | This explicitly *allows* single stranded lines at page breaks, which is the opposite of what these properties are for. The CSS default is already 2. Set 2 (or 3 for a more book-like result), or delete the rule. |
| 18 | 2 | `*, *::before, *::after { box-sizing: content-box; }` | Tidy | A no-op (it is the initial value), but it means `.docs-main` is 1024px wide, not 960px (measured), because padding is added on top. Switch to `border-box` and set the outer size you actually want. The fix below keeps the current rendered width of 1024px. |
| 19 | (UA) | Italic from `em`, `i`, `cite`, `dfn`, `var`, `address` | Typo (Breaks for Arabic) | Not in this file, but the theme inherits UA italics. Arabic has no italic tradition and most Arabic fonts ship no italic, so the browser synthesises a slant that leans the wrong way for a right-to-left script and looks broken. Turn italic off for Arabic and use weight (or colour) for emphasis. |
| 20 | (missing) | Code samples and inline code | Breaks | Docs are full of code. Inside an RTL paragraph, inline code like `npm install --save` gets its neutral characters (`--`, `.`, `/`, `()`) reordered at the boundaries, and code blocks become right-aligned with punctuation on the wrong end. Code must be forced LTR and isolated from the surrounding Arabic. Prefer `dir="ltr"` on `<pre>` in the markup; the CSS below is the safety net. |

Things that are fine and must stay that way: there is no `letter-spacing` in the file (adding any to Arabic breaks the cursive joins) and no `text-align: justify` (browser justification for Arabic does not use kashida and produces ugly word gaps). Keep both out of the Arabic edition.

---

## 3. Proposed replacement

Drop-in replacement for `docs-theme.css`. LTR rendering is unchanged except the print widows/orphans fix; RTL now mirrors. Every logical property used here (`float: inline-start`, `inset-*`, `border-start-start-radius`, `:dir()`, `content` alt text) is supported in current Chrome, Edge, Firefox and Safari.

```css
/* Northlight docs theme (2014, RTL-ready 2026) */
*, *::before, *::after { box-sizing: border-box; }

html { font-size: 100%; }
body { font-family: Verdana, sans-serif; font-size: 1rem; line-height: 1.6; color: #222; }

/* Arabic edition: Arabic face first so digits and punctuation match the text.
   Self-host the web font; the rest are platform fallbacks. */
:lang(ar) body,
body:lang(ar) {
  font-family: "Noto Naskh Arabic", "IBM Plex Sans Arabic", "Geeza Pro", Tahoma, sans-serif;
  font-size: 1.125rem;
  line-height: 1.8;
}

.docs-main {
  max-inline-size: 1024px;      /* was 960px content + 64px padding under content-box */
  margin-inline: auto;
  padding-inline: 32px;
}
.docs-main p { max-inline-size: 75ch; }
.docs-main:lang(ar) p { max-inline-size: 38em; }   /* tune with real Arabic copy */

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

.breadcrumb .sep { display: inline-block; margin-inline-start: 2px; }

/* Second declaration hides the decorative arrow from screen readers;
   older engines keep the first one. */
.nav-next::after {
  content: "\2192";
  content: "\2192" / "";
  margin-inline-start: 0.25em;
}
.nav-next:dir(rtl)::after {
  content: "\2190";
  content: "\2190" / "";
}

.docs-main ul { padding-inline-start: 1.5em; }
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }

.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
/* h2 { text-align: left } removed: the default (start) is correct in both directions. */
.figure-caption { text-align: center; }

.hero-illustration { transform: rotate(-4deg); }
.hero-illustration:dir(rtl) { transform: rotate(4deg); }

/* Arabic has no italic: no synthesised slant, emphasise with weight. */
:lang(ar) { font-synthesis-style: none; }
:lang(ar) :is(em, i, cite, dfn, var, address) { font-style: normal; font-weight: 700; }

/* Code is always LTR and isolated from surrounding Arabic. */
pre, code, kbd, samp { direction: ltr; unicode-bidi: isolate; }
pre { text-align: left; }

@media print {
  p { widows: 2; orphans: 2; }
}
```

Notes on the replacement:

- **Font choice.** Noto Naskh Arabic is a safe, open-licensed Naskh for long reading. If the brand wants a sans to sit next to Verdana, IBM Plex Sans Arabic or Noto Sans Arabic pair better. Pick one, self-host it with `font-display: swap`, and check it has a real bold (otherwise the emphasis rule triggers synthetic bold, which is acceptable in Arabic but heavier than designed).
- **Digits.** Whether the edition uses Western (0-9) or Eastern Arabic (٠-٩) digits is a content and locale decision (Maghreb usage differs from the Gulf and Levant), not a CSS one. Decide it once with the translators; ordered lists can follow with `ol:lang(ar) { list-style-type: arabic-indic; }` if you choose Eastern digits.
- **`.note-badge`** needs a positioned ancestor; the original relies on one existing in the markup, and so does the fix.
- **Assets.** Audit icons for direction: arrows, chevrons, "external link", undo/redo and progress indicators need mirroring; clocks, checkmarks, media play buttons and logos do not.

## 4. Verification

Rendered in headless Chromium, `<html lang="ar" dir="rtl">` versus `lang="en" dir="ltr"`.

| Check | Original, RTL | Fixed, RTL | Fixed, LTR |
|-------|---------------|------------|------------|
| `ul` padding left / right | 24px / **40px** (double indent) | 0 / 27px | 24px / 0 |
| `.callout` border left / right | **4px** / 0 | 0 / 4px | 4px / 0 |
| `.callout` rounded corner | top-left | top-right | top-left |
| `.callout` shadow x | 2px | -2px | 2px |
| `.nav-next::after` glyph, margin | **→**, margin-left | ←, margin-right | →, margin-left |
| `.sidebar` float | **left** | inline-start (right) | inline-start (left) |
| `.note-badge` corner gap | top-right | 8px from left edge | 8px from right edge |
| `h2` text-align | **left** | start | start |
| `em` font-style | italic | normal | italic |
| body line-height | 25.6px | 32.4px | 25.6px |
| `.docs-main` outer width | 1024px | 1024px | 1024px |

Not verified here: real Arabic copy for the paragraph measure, the chosen web font's bold and diacritic clearance, and iOS Safari rendering. Do those with a translated page before launch.
