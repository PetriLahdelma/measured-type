# Logical CSS, direction and language

Typography follows the writing direction and the language, so the stylesheet
should too. The approach: write LTR first, express it in flow-relative terms,
and let `lang` and `dir` drive everything that varies. Done this way, an RTL or
vertical edition is a content change, not a CSS rewrite.

## Contents

- Think in flow, not sides
- Physical to logical map
- Document setup: lang, dir and isolation
- Mixed-direction strings
- Mirroring
- Script-specific typography
- Locale conventions: the pattern, with EN, FI and SV worked through
- Translation and expansion

## Think in flow, not sides

Bringhurst's vocabulary is physical because he wrote for left-to-right books.
Translate it:

| Bringhurst | Flow-relative meaning | CSS |
|---|---|---|
| flush left | flush to the start edge | `text-align: start` |
| ragged right | ragged at the end edge | `text-align: start` |
| indent | from the start edge | `text-indent` (already logical) |
| outdent into the left margin | into the start margin | negative `text-indent` + `padding-inline-start` |
| measure (line length) | inline size | `max-inline-size` |
| column depth | block size | `block-size` |
| space above / below | block start / end | `margin-block-start` / `-end` |

## Physical to logical map

| Physical | Logical |
|---|---|
| `width`, `height` | `inline-size`, `block-size` |
| `max-width`, `min-height` | `max-inline-size`, `min-block-size` |
| `margin-left` / `-right` | `margin-inline-start` / `-end` |
| `margin-top` / `-bottom` | `margin-block-start` / `-end` |
| `margin: 0 auto` | `margin-inline: auto` |
| `padding: 1rem 2rem` | `padding-block: 1rem; padding-inline: 2rem` |
| `border-left` | `border-inline-start` |
| `border-top-left-radius` | `border-start-start-radius` |
| `left: 0` / `right: 0` | `inset-inline-start: 0` / `inset-inline-end: 0` |
| `top: 0; bottom: 0` | `inset-block: 0` |
| `float: left` | `float: inline-start` |
| `clear: left` | `clear: inline-start` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `resize: horizontal` | `resize: inline` |
| `overflow-x` | `overflow-inline` (newer; keep `overflow-x` as fallback) |
| `scroll-padding-top` | `scroll-padding-block-start` |
| `background-position: left` | no logical keyword; flip with `:dir(rtl)` |
| `transform: translateX()` | physical by nature; flip with `:dir(rtl)` when directional |

**Convert, don't redesign.** Map each physical value to the logical value that
keeps today's LTR rendering identical: `text-align: right` becomes `end` (not
`start`), `margin-right` becomes `margin-inline-end`, `float: left` becomes
`float: inline-start`. If the original choice looks wrong, raise it as a
separate design note; never fold a redesign into the RTL conversion, or the
LTR editions change without anyone deciding it.

Keep physical properties only for things that are physical: box-shadow
offsets, a rotated illustration, a gradient direction tied to a light source.
In audits, flag physical properties that describe text flow (indents, quote
borders, list padding, measure) and leave decorative ones alone.

Flexbox and grid are already flow-relative: `justify-content: flex-start`,
`start`, `end` and `row` follow the direction. `left` and `right` keywords in
`justify-content` are physical; avoid them.

## Document setup: lang, dir and isolation

```html
<html lang="en" dir="ltr">
  ...
  <p>The Finnish word <span lang="fi">sisu</span> resists translation.</p>
  <blockquote lang="sv">...</blockquote>
  <p>Comment by <bdi>{userName}</bdi>: ...</p>
  <input name="q" dir="auto">
</html>
```

- Set direction with the HTML `dir` attribute, not CSS `direction`. Direction
  is a property of the content; CSS may be stripped (reader modes, feeds) and
  `:dir()` reads the attribute.
- `lang` selects the hyphenation dictionary, `quotes: auto`, the font's `locl`
  forms (localized glyphs), line-breaking rules, screen-reader voice and
  spell-check. Put it on `<html>` and on every passage in another language,
  including single words and names that need correct hyphenation.
- `dir="auto"` on user-generated or fetched text lets the first strong
  character decide. `<bdi>` (or `unicode-bidi: isolate`) isolates an inserted
  string so its direction cannot reorder the punctuation around it.
- Style by language and direction with `:lang(fi)` and `:dir(rtl)` rather than
  classes like `.fi` or `.rtl`.

## Mixed-direction strings

In RTL pages, numbers stay LTR automatically, but some strings need help:

- Phone numbers, IBANs, product codes, URLs, email addresses, code: wrap in
  `<bdi>` or `<span dir="ltr">` so their characters stay in order.
- Ranges with an en dash and numbers with signs can reorder; isolate them.
- In LTR pages with RTL names or quotes, the same isolation keeps commas and
  parentheses where they belong.

## Mirroring

Mirror only what has direction: back/forward arrows, chevrons in breadcrumbs
and "next" links, progress bars, list bullets set as images, the side a
drawer opens from.

```css
:dir(rtl) .icon--directional { transform: scaleX(-1); }
```

Do not mirror clocks, checkmarks, media playback symbols (play points the way
the tape runs), logos, charts with numeric axes or text inside images.

**Glyphs that mirror by themselves.** Unicode marks paired punctuation as
Bidi_Mirrored, and browsers draw them flipped in RTL runs: `( ) [ ] { } < >`,
`« » ‹ ›` and similar. A `›` breadcrumb separator therefore already points the
right way in Arabic; adding `scaleX(-1)` would flip it back. Arrows such as
`→` (U+2192) and `←` are **not** mirrored: swap the character under
`:dir(rtl)` or use a logical icon. SVG and icon-font arrows never mirror on
their own.

**List indentation.** Browsers indent lists with a default
`padding-inline-start: 40px`. A physical `padding-left` on `ul` adds to the
left in RTL while the default 40px stays on the right, so the list ends up
indented on both sides. Override `padding-inline-start` instead.

**Fonts per language.** Swap families on the root or `body`
(`:root:lang(ar) { font-family: ... }`), never with a bare `:lang(ar)`
selector: that matches every element and overrides `code`, `pre` and `kbd`,
which must stay monospace and `dir="ltr"`.

## Script-specific typography

- **Joining scripts** (Arabic, Syriac, N'Ko, many Indic scripts): no
  `letter-spacing`; it breaks connections. Emphasis by weight or color, not by
  tracking or caps (there are no caps). Justification uses kashida
  (elongation), which `text-justify` may or may not support; set ragged unless
  tested.
- **CJK**: measure in `ic` (one ideograph): `max-inline-size: 35ic` for about
  35 characters; `line-break: strict`; `text-spacing-trim` and
  `text-autospace` for punctuation and Latin-CJK spacing; no hyphenation;
  `word-break: keep-all` for Korean if breaking inside words is unwanted.
- **Vertical writing** (`writing-mode: vertical-rl`): every logical property
  above keeps working; physical ones do not. This is the strongest argument
  for logical CSS in a design system.
- **Line height**: scripts with tall stacks (Thai, Devanagari, Vietnamese with
  stacked diacritics) need more leading than Latin; set it per `:lang()`.
- **Fonts**: give each script a family that covers it in the stack, and use
  `:lang()` to swap stacks where the default fallback is poor.

## Locale conventions: the pattern

Every locale you ship needs answers to the same questions. Settle them per
locale before writing the formatting code, and test the rendered DOM rather
than the source strings:

1. Quote marks, primary and secondary (`quotes: auto` plus an explicit
   fallback for engines that guess wrong).
2. Decimal mark, digit grouping and the grouping character (often a
   no-break or narrow no-break space).
3. Where the currency and percent signs go and whether a space separates
   them; `Intl` gets these right and emits no-break spaces.
4. Number and unit: `Intl` `style: 'unit'` emits a plain space, so bind it
   yourself, and decide whether the house style uses localized unit
   abbreviations.
5. Dates, times, ranges and ordinals.
6. Hyphenation: does the language build long compounds, and does every
   target engine have a dictionary for it?
7. Heading case (title case is mostly an English habit) and how much the
   copy expands relative to the source language.

English, Finnish and Swedish are worked through below as the reference
example. Finnish and Swedish matter here because both build long compounds,
which is where unhyphenated narrow columns fail first.

### EN, FI and SV worked example

| | English | Finnish (fi) | Swedish (sv) |
|---|---|---|---|
| Primary quotes | “ ” (US); UK often ‘ ’ | ” ” (U+201D on both sides) | ” ” (U+201D on both sides) |
| Secondary quotes | ‘ ’ | ’ ’ | ’ ’ |
| Alternative | | » » | » » |
| Apostrophe | ’ | ’ in consonant gradation (*vaa’an*) and after foreign names ending in a silent letter (*Bordeaux’ssa*); abbreviations inflect with a colon instead (*CSS:n*) | ’ (rare) |
| Thousands | 1,000 | 1 000 (no-break space) | 1 000 (no-break space) |
| Decimal | 2.5 | 2,5 | 2,5 |
| Currency | €1,000 | 1 000 € | 1 000 € / 1 000 kr |
| Percent | 50% | 50 % | 50 % |
| Negative | −5 (U+2212 in typeset text) | −5 (Intl emits U+2212) | −5 (Intl emits U+2212) |
| Time | 3:00 PM / 15:00 | klo 15.00 | 15.00 or 15:00 |
| Date | October 27, 2026 / 27 October 2026 | 27.10.2026 | 27 oktober 2026 / 2026-10-27 |
| Ranges | 9–5, pp. 12–24 | 9–17, ma–pe | 9–17, mån–fre |
| Ordinals | 27th | 27. | 27:e (1:a and 2:a for numbers ending in 1 or 2, except 11:e and 12:e) |

Implementation:

```js
new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(1000);
// "1 000,00 €" with no-break spaces
// Intl groups four-digit numbers in fi and sv ("1 000"). Some house styles
// leave them unspaced; useGrouping: 'min2' gives "1000" and still "10 000".
new Intl.NumberFormat('sv-SE', { style: 'percent' }).format(0.5);   // "50 %"
// Unit style uses a PLAIN space; bind it yourself:
new Intl.NumberFormat('fi-FI', { style: 'unit', unit: 'gigabyte' })
  .format(250).replace(/ /g, ' ');                            // "250 Gt"
```

Note that Finnish unit output is `Gt`/`Tt` (gigatavu, teratavu). Many Finnish
products write `GB`; if the house style does, keep unit labels in the
translation strings instead of using `style: 'unit'`.

```css
q { quotes: auto; }                              /* follows lang */
:lang(fi) q, :lang(sv) q { quotes: "\201D" "\201D" "\2019" "\2019"; }  /* explicit fallback */
```

Hyphenation: Finnish and Swedish build long compounds
(*käyttöliittymäsuunnittelija*, *användargränssnittsdesigner*). In narrow
columns and on phones, unhyphenated compounds leave huge gaps or overflow.
Enable `hyphens: auto` for reading text in these languages and check each
engine, because dictionary coverage varies; where it is missing, insert soft
hyphens (`&shy;`) at render time with a pattern-based hyphenator, at least for
headings and cards. Add `overflow-wrap: break-word` as the last line of
defense for strings no dictionary knows.

Diacritics: Å, Ä and Ö reach above the cap height. Tight display leading
(below about 1.05) and `overflow: hidden` on headings can clip them; test
display styles with *ÅÄÖ* in the sample text.

## Translation and expansion

- Finnish and Swedish copy often runs longer than English (Finnish words are
  long, Swedish phrases similar or slightly longer). Never fix widths or
  heights on text containers; let headings and buttons wrap.
- `text-wrap: balance` on headings keeps translated titles from leaving a
  single word on the last line.
- Check every component in the longest language, not only in English.
- Capitalization rules differ: English title case is not used in Finnish or
  Swedish headings (sentence case). Never hard-code casing in CSS for
  multilingual headings except for deliberate all-caps styles.
