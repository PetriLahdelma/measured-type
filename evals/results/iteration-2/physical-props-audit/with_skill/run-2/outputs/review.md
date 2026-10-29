# docs-theme.css: RTL and typography review for the Arabic edition

Every rule in this file that describes text flow is written in physical terms
(`left`, `right`, `width`, `translateX`), so an Arabic page set with
`<html lang="ar" dir="rtl">` keeps an LTR skeleton under RTL text. The
biggest single improvement is to convert those rules to logical properties.
The conversion below was checked in Chromium: the English page stays
**pixel-identical** (byte-identical screenshots at 1280px) and the Arabic page
mirrors correctly. Two typographic problems are separate from direction and
affect both editions: the measure (92 characters per line in English, 119 in
Arabic) and the fixed 960px container, which makes the page scroll sideways
on phones.

Labels follow the house convention: **standard** (spec or WCAG), **measured**
(checked in the browser or font file), **convention**, **preference**.
Section numbers refer to Bringhurst (§).

## What was measured

Test page: the stylesheet applied to a mock docs page (breadcrumb, sidebar,
h2, paragraphs, callout with badge, list, blockquote, "next" link) in
Playwright Chromium at 1280px, once as `lang="en" dir="ltr"` and once as
`lang="ar" dir="rtl"`.

| Check | Original, LTR | Original, RTL | Logical conversion, RTL |
|---|---|---|---|
| Sidebar position (x) | 160 to 400 | 160 to 400 (still left) | 880 to 1120 (start side) |
| `h2` alignment | left | left, while body text is right | start (right) |
| Callout border | left 4px | left 4px (the end side) | right 4px |
| `ul` padding left / right | 24px / 0 | **24px / 40px** (indented on both sides) | 0 / 24px |
| Blockquote margin left / right | 32px / 0 | 32px / 0 | 0 / 32px |
| "Next" arrow | → | → (points backwards) | ← |
| Page width at a 375px viewport | 1032px scroll | 1032px scroll | 1032px (fixed only by the measure fix) |

Line length, counted with `scripts/measure-line.js` (graphemes per full line):

| Setup | Chars per line | Face that rendered |
|---|---|---|
| English, original `max-width: 75ch` | **91.6** (82 to 95) | Verdana |
| Arabic, original `max-width: 75ch` | **119** (116 to 122) | Geeza Pro for Arabic, Verdana for spaces and Latin |
| English, proposed `max-inline-size: 34em` | 64.4 (59 to 68) | Verdana |
| Arabic, proposed `34em` with an Arabic stack | 70 (65 to 73) | Tahoma |

Verdana has **no Arabic glyphs** (0 code points in U+0600 to U+06FF, checked
with fontTools), so today the Arabic edition renders in whatever fallback each
OS picks.

---

## Broken (renders wrong in RTL or is invalid)

### 1. `.sidebar` stays on the left and its text flips alignment. §2.1.3, standard

`float: left` keeps the sidebar on the left in Arabic, where navigation belongs
on the start (right) side. `margin-right` has to move with it or the gap ends
up on the outer edge. `text-align: right` is end-aligned in English but
start-aligned in Arabic, so the sidebar's alignment silently changes meaning.

```css
.sidebar {
  float: inline-start;
  inline-size: 240px;
  margin-inline-end: 24px;
  text-align: end;
}
```

`right` maps to `end` (not `start`) so English is unchanged. Design note, not
part of the conversion: end-aligned (ragged-start) navigation is harder to
scan than start-aligned; consider `text-align: start` as its own decision for
both editions (preference).

### 2. `.docs-main h2 { text-align: left }`. §2.1.3, standard

In RTL the heading sits flush left against the floated sidebar while the
paragraphs below are flush right. Fix: `text-align: start;`

### 3. `.docs-main ul { padding-left: 1.5em }` double-indents lists. Measured

Browsers indent lists with a default `padding-inline-start: 40px`. The physical
rule adds 24px on the left, and in RTL the default 40px stays on the right, so
Arabic lists are indented on both sides (measured: 24px left, 40px right).

```css
.docs-main ul { padding-inline-start: 1.5em; }
```

Apply the same to `ol` if the docs use it.

### 4. `.callout` accent border and radii on the wrong side. Standard

The green rule marks the start of the text. In Arabic it lands on the end
side, detached from where reading begins.

```css
.callout {
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 16px;
  margin-inline-start: 0;
  border-start-start-radius: 6px;
  border-end-start-radius: 6px;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1); /* keep: a light source is physical */
}
```

### 5. `.nav-next::after { content: "\2192" }` points backwards. Standard

U+2192 is not Bidi_Mirrored, so "next" in Arabic shows → (back). The
`margin-left` also lands between the arrow and the outer edge instead of
between the word and the arrow.

```css
.nav-next::after { content: "\2192" / ""; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190" / ""; }
```

The `/ ""` alt text keeps screen readers from announcing "rightwards arrow"
after the link text; drop it if a target browser lacks support (the rule is
then ignored, so keep a plain `content: "\2192"` declaration before it as a
fallback if needed). Any "previous" link needs the mirror image of this rule.

### 6. `.docs-main blockquote { margin: 1.5em 0 1.5em 2em }`. §2.3.3, standard

The indent is physical, so Arabic quotes indent from the end edge.

```css
.docs-main blockquote { margin-block: 1.5em; margin-inline: 2em 0; }
```

(See item 11 for the vertical value.)

### 7. `.note-badge { top: 8px; right: 8px }`. Standard, plus a latent bug

Use `inset-block-start: 8px; inset-inline-end: 8px;` so the badge sits in the
end corner in both directions. Separately: nothing in this stylesheet gives
the badge a positioned ancestor. In the test page it anchored to the page
corner (offsetParent was `<body>`), not to its callout. If the badge lives
inside `.callout`, add `position: relative` there; check the real markup.

### 8. `.breadcrumb .sep { transform: translateX(2px) }`. Standard

A physical nudge toward the following crumb; in RTL it nudges away from it.

```css
.breadcrumb .sep { display: inline-block; transform: translateX(2px); }
.breadcrumb .sep:dir(rtl) { transform: translateX(-2px); }
```

Do not add `scaleX(-1)` to the separator glyph. If it is `›`, `>`, or `»`, it
is Bidi_Mirrored and already points the right way in Arabic; flipping it would
reverse it. Only an arrow character, an SVG or an icon-font chevron needs
swapping.

### 9. `.docs-main` is a fixed 960px box: the page scrolls sideways on phones. §2.1.2, standard (WCAG 1.4.10)

`width: 960px` with the global `box-sizing: content-box` makes the box
960 + 64 = 1024px wide. Measured: at a 375px viewport the document is 1032px
wide in both editions. Page zoom scales the `px` value too, so at 400% zoom
it never fits. This is direction-neutral but blocks any mobile reading.

```css
*, *::before, *::after { box-sizing: border-box; }
.docs-main {
  max-inline-size: 60rem;   /* 960px at the default size, now a ceiling */
  margin-inline: auto;
  padding-inline: 2rem;
}
```

After the change the 375px viewport has no horizontal scroll (measured).
`border-box` changes English layout by design (the box becomes 960px wide in
total instead of 1024px); review it as a deliberate change, not as part of the
RTL conversion. At 320px the 240px floated sidebar no longer fits beside the
text; stack it with a media or container query.

---

## Hurts reading

### 10. Measure is far too long in both editions. §2.1.2, measured

`.docs-main p { max-width: 75ch }` gives 91.6 characters per line in English
(range 82 to 95). `ch` is the width of the zero: in Verdana 0.636em against an
average character of 0.502em, so 75ch overshoots by about a quarter. In Arabic
it is worse: `ch` still comes from Verdana's zero (Verdana is first in the
stack and has a `0`), while the Arabic letters render in a narrower fallback
(average 0.387em), giving **119 characters per line**.

```css
.docs-main p { max-inline-size: 34em; }
```

Measured: 64.4 characters per line in English and 70 in Arabic with the
Tahoma stack below, both inside 45 to 75. Re-run
`node scripts/measure-line.js page.html ".docs-main > p"` on the real Arabic
page with the face you actually serve, and have an Arabic editor confirm the
line feels right; grapheme counts in Arabic and Latin are not the same reading
experience.

### 11. No Arabic face in the stack. §2.1.9 and taste "families", measured

Verdana covers no Arabic, so every reader gets a different fallback (Geeza Pro
on macOS here; Segoe UI or Tahoma on Windows; Noto on Android), with Verdana
still supplying the spaces and Latin punctuation inside Arabic lines. Pick one
Arabic face that pairs with Verdana (a humanist sans, open counters, large
x-height) and set it on the root, never with a bare `:lang(ar)` selector, which
would also hit `code` and `pre`:

```css
:root:lang(ar) body {
  font-family: "Noto Sans Arabic", Tahoma, "Geeza Pro", sans-serif;
}
```

Serve the chosen face as a web font subset by `unicode-range`, without
stripping OpenType features, and check it with
`python3 scripts/font-features.py font.woff2`: it must have `init medi fina
isol rlig` in GSUB and `mark mkmk` in GPOS. Tahoma, checked here, has all of
them (`mark` adjusts 1775 glyphs).

### 12. Fake italic on Arabic. §2.1.9, convention

Arabic has no italic. Tahoma, Geeza Pro and most Arabic faces ship no italic
style, so `<em>`, `<i>` and `<cite>` would be slanted synthetically. Emphasize
by weight instead:

```css
:root:lang(ar) { font-synthesis-style: none; }
:root:lang(ar) :is(em, i, cite) { font-style: normal; font-weight: 700; }
```

### 13. Leading for vocalised Arabic. §2.2.1, measured

`line-height: 1.6` is fine for plain Arabic (ink height about 1.0em in Geeza
Pro and Tahoma). With full harakat (shadda plus kasra, hamza below) the ink of
Geeza Pro reaches **1.6em**, exactly the line height, so marks on adjacent
lines can touch; Tahoma stays at 1.24em. If the docs include vocalised text
(Quranic quotations, teaching material, names), either choose a face like
Tahoma whose marks stay compact or raise the leading for those passages:

```css
:root:lang(ar) .docs-main .vocalised { line-height: 1.8; }
```

### 14. Print `widows: 1; orphans: 1`. §2.4.8, convention

This explicitly allows a single stranded line at the top or bottom of a
printed page, which is worse than the browser default of 2.

```css
@media print {
  p { widows: 3; orphans: 3; }
  h2, h3 { break-after: avoid; }
  blockquote, figure, .callout { break-inside: avoid; }
}
```

(Chromium and Safari honour `widows` and `orphans`; Firefox ignores them.)

---

## Refinement

- **`margin: 0 auto` and `padding-left/right: 32px`** are symmetric, so they
  render correctly in RTL already. Convert them to `margin-inline: auto` and
  `padding-inline: 32px` anyway so the file has one vocabulary and survives a
  future vertical layout (convention).
- **Blockquote rhythm.** `1.5em` margins with a 1.6 line height put the quote
  off the beat. Use one body line: `margin-block: 1lh;` (§2.2.2, convention).
- **Headings and paragraphs**: `h2 { text-wrap: balance; }` and
  `.docs-main p { text-wrap: pretty; }` reduce single-word last lines in both
  languages; Arabic headings in translation often run longer than English ones
  (§2.4.8, convention).
- **Leave alone** (physical on purpose): `box-shadow: 2px 2px` (light source),
  `.hero-illustration { transform: rotate(-4deg) }` (a tilted graphic; do not
  mirror an illustration that contains text or a logo),
  `.figure-caption { text-align: center }` (direction-neutral).
- **Guard for later**: never add `letter-spacing` to Arabic text (it breaks
  the joins), never `text-transform: uppercase` as emphasis (no case), keep
  `hyphens` off for Arabic and keep `text-align: start` rather than `justify`
  unless kashida justification has been tested in every target browser.

## Outside the stylesheet (needed for the Arabic edition to work)

- `<html lang="ar" dir="rtl">`: set direction in HTML, not with CSS
  `direction`. `:dir(rtl)` above reads the attribute.
- `dir="ltr"` on `pre` and `code` blocks, and `<bdi>` (or
  `<span dir="ltr">`) around inline API names, file paths, URLs, version
  numbers and keyboard shortcuts so their characters stay in order.
- Digits: decide per region. Measured in ICU 78: `Intl.NumberFormat('ar')`
  gives `1,234.5` (Western digits), while `ar-SA` and `ar-EG` give `١٬٢٣٤٫٥`
  (Arabic-Indic). Pick one locale tag for the edition and format every number
  through it; `Intl` also inserts bidi marks (`50‎%‎`), so never compare
  formatted strings by hand.
- Quotation marks: use `q { quotes: auto; }` and agree the house style
  (guillemets are common in Arabic publishing) with the Arabic editor, then
  check the rendered marks rather than the source.

---

## Proposed stylesheet

Logical conversion plus the typographic fixes. Items marked `/* LTR change */`
alter the English edition on purpose; everything else renders identically in
English (verified).

```css
/* Northlight docs theme */
*, *::before, *::after { box-sizing: border-box; }            /* LTR change */

html { font-size: 100%; }
body { font-family: Verdana, sans-serif; font-size: 1rem; line-height: 1.6; color: #222; }
:root:lang(ar) body { font-family: "Noto Sans Arabic", Tahoma, "Geeza Pro", sans-serif; }
:root:lang(ar) { font-synthesis-style: none; }
:root:lang(ar) :is(em, i, cite) { font-style: normal; font-weight: 700; }

.docs-main {
  max-inline-size: 60rem;                                      /* LTR change */
  margin-inline: auto;
  padding-inline: 2rem;
}
.docs-main p { max-inline-size: 34em; text-wrap: pretty; }     /* LTR change */

.sidebar {
  float: inline-start;
  inline-size: 15rem;
  margin-inline-end: 1.5rem;
  text-align: end;
}

.callout {
  position: relative; /* anchors .note-badge; confirm against the markup */
  border-inline-start: 4px solid #0a6;
  padding-inline-start: 1rem;
  margin-inline-start: 0;
  border-start-start-radius: 6px;
  border-end-start-radius: 6px;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.breadcrumb .sep { display: inline-block; transform: translateX(2px); }
.breadcrumb .sep:dir(rtl) { transform: translateX(-2px); }

.nav-next::after { content: "\2192" / ""; margin-inline-start: 0.25em; }
.nav-next:dir(rtl)::after { content: "\2190" / ""; }

.docs-main ul { padding-inline-start: 1.5em; }
.docs-main blockquote { margin-block: 1lh; margin-inline: 2em 0; } /* LTR change: 25.6px, was 24px */

.note-badge { position: absolute; inset-block-start: 8px; inset-inline-end: 8px; }
.docs-main h2 { text-align: start; text-wrap: balance; }
.figure-caption { text-align: center; }
.hero-illustration { transform: rotate(-4deg); }

@media print {
  p { widows: 3; orphans: 3; }
  h2, h3 { break-after: avoid; }
  blockquote, figure, .callout { break-inside: avoid; }
}
```

Verified in Chromium with this file: RTL sidebar at the start edge, callout
border, list and quote indents on the right, ← for "next", badge inside its
callout, no horizontal scroll at 375px, 64 characters per line in English and
70 in Arabic (Tahoma).
