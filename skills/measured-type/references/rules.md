# The rules in detail

Each section: the principle (paraphrased from Bringhurst), why it matters, how
to do it now and the traps. Numbers follow Bringhurst's book; webtypography.net
covers the ones marked with a section number. Rules from the book that the site
never reached are under "Beyond the site".

## Contents

- 2.1 Horizontal motion: 2.1.1 word space, 2.1.2 measure, 2.1.3 ragged or
  justified, 2.1.4 sentence space, 2.1.5 initials, 2.1.6 letterspacing caps,
  2.1.7 lowercase, 2.1.8 kerning, 2.1.9 distortion, 2.1.10 lists and contents
- 2.2 Vertical motion: 2.2.1 leading, 2.2.2 measured intervals
- 2.3 Blocks and paragraphs: 2.3.1 opening paragraphs, 2.3.2 paragraph
  marking, 2.3.3 block quotations, 2.3.4 verse
- 2.4 Hyphenation and breaks: 2.4.1 minimums, 2.4.3 ladders, 2.4.5 language,
  2.4.6 hard spaces, 2.4.8 widows and orphans
- 3.1 Size: 3.1.1 scale
- 3.2 Figures and capitals: 3.2.1 figures, 3.2.2 small caps, checking fonts
- Beyond the site: punctuation glyphs, ligatures, runts, initials and drop caps

---

## 2.1 Horizontal motion

### 2.1.1 Define the word space to suit the face

**Principle.** Ragged text can keep a fixed word space; justified text needs an
elastic one. Loosely fitted or bold faces want more space between words;
large, tightly fitted display type wants less.

**Now.** The font's own space glyph is usually right for text. `word-spacing`
*adds* to that space; it does not set it. Use `em` so it scales:

```css
.display { word-spacing: -0.05em; }   /* tight display caps or bold */
.caps    { word-spacing: 0.1em; }     /* tracked caps need wider gaps too */
```

**Traps.** Changing `letter-spacing` without adjusting `word-spacing` makes
words run together (tracked caps) or fall apart (tight display). Never use `px`.
WCAG 1.4.12 lets readers raise word spacing to 0.16em, so never depend on
exact widths.

### 2.1.2 Choose a comfortable measure

**Principle.** 45–75 characters for single-column text, 66 ideal; 40–50 per
column in multi-column work.

**Why.** Long lines make the return sweep to the next line error-prone; short
lines break phrases and fragment reading.

**Now.**

```css
.prose { max-inline-size: 34em; margin-inline: auto; }
```

- `em` ties the measure to the type size, so it stays constant when the reader
  zooms. With average letters about 0.5em wide, 34em gives roughly 66–70
  characters. `ch` is the width of "0", which in most text faces is wider than
  the average letter, so `66ch` usually yields well over 66 characters.
  Measured at 18px in Chromium (`scripts/measure-line.js`):

  | Face | zero | average character | `66ch` | `60ch` | `55ch` | `34em` |
  |---|---|---|---|---|---|---|
  | Verdana (wide humanist sans) | 0.64em | 0.52em | 81 | 73 | 67 | 65 |
  | Outfit (wide geometric sans) | 0.66em | 0.45em | 97 | 88 | 81 | 75 |
  | Source Serif 4 (text serif) | 0.51em | 0.47em | 72 | 66 | 59 | 73 |

  The average includes word spaces. Geometric sans faces with round, wide
  figures are the worst case for `ch`. Narrow text serifs break the `em` rule
  of thumb the other way: `34em` overshoots.
- Either unit is fine **once measured**. `em` is stable for one known face;
  `ch` follows whichever face actually renders, so it holds up better when
  fallback fonts of different widths may appear. Never ship a `ch` or `em`
  value from a rule of thumb; count rendered characters (SKILL.md §5).
- Inside components, measure against the container rather than the viewport:
  `max-inline-size: min(34em, 100%)`, or set it from container query units if
  the component sits in variable columns.
- Use `max-inline-size`, not `width`, so narrow screens still fit and vertical
  writing modes keep working.
- Wider measures need more leading (2.2.1). Captions and sidenotes may be
  shorter.

**Traps.** Unconstrained `width: 100%` text on desktop (120+ characters).
Fixed `px` containers whose character count changes as readers zoom. WCAG
1.4.8 (AAA) caps lines at 80 characters, inside Bringhurst's range.

### 2.1.3 Set ragged if ragged setting suits the text and page

**Principle.** Justification trades even word spacing against frequent
hyphens. Narrow columns, sans serifs and monospaced faces look better ragged.

**Now.** Default to `text-align: start` (logical: left in LTR, right in RTL).
Justify only when all of these hold: the measure is wide (60+ characters),
`hyphens: auto` works for the language in every target engine and the face is
a text serif. `text-justify: inter-word` keeps letters unspaced.

**Traps.** `text-align: justify` without hyphenation opens rivers of space,
worst on mobile. `text-align-last: justify` stretches the final line; avoid it.
`text-align: left` is physical and becomes wrong in RTL; use `start`.

### 2.1.4 Use a single word space between sentences

HTML collapses runs of spaces, so double spacing cannot happen by accident. If
you need a specific wider space, use the Unicode space characters rather than
stacked `&nbsp;`:

| Char | Name | Use |
|---|---|---|
| U+2002 | en space | separators in contents lists |
| U+2009 | thin space | around `×`, between initials, French punctuation |
| U+200A | hair space | between initials, around a closed en dash |
| U+202F | narrow no-break space | thousands groups and number-unit pairs |
| U+00A0 | no-break space | keep words together; it also means "do not break" |

For code or verse whose spacing carries meaning, use `<pre>` or
`white-space: pre-wrap`.

### 2.1.5 Add little or no space within strings of initials

`W.B. Yeats` or `W.&#8202;B. Yeats`, with a normal word space before the
surname. All modern fonts can fall back for U+200A, so the hair space is now
safe. Put a no-break space before the surname if a break there would strand
the initials.

### 2.1.6 Letterspace capitals, small caps and long digit strings

**Principle.** Strings of caps or small caps need 5–10% of the type size added.
Long digit strings (serial numbers, IBANs, long codes) read faster spaced.

```css
.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; }
abbr.sc  { font-variant-caps: all-small-caps; letter-spacing: 0.05em; }
.serial  { letter-spacing: 0.05em; font-variant-numeric: tabular-nums slashed-zero; }
```

**Why.** Capitals are designed to sit next to lowercase letters; set together
they crowd, and their counters clog at small sizes.

**Traps.** Negative tracking on uppercase. `letter-spacing` also adds space
after the last letter, which offsets centered labels by one tracking unit;
compensate with `margin-inline-end: -0.08em` when the alignment matters. Never
letterspace joining scripts such as Arabic: it breaks the connections between
letters. Prefer `text-transform: uppercase` over typed capitals so screen
readers and translation keep the real casing.

### 2.1.7 Don't letterspace the lowercase without a reason

Lowercase letters are fitted by the designer at their intended size. Adding
space hurts word shapes and reading speed. Legitimate exceptions: very small
sizes of a face that is fitted tightly, some bold condensed display faces, and
light text on dark grounds (a touch, see `taste.md`). At display sizes many
faces want slight negative tracking (about −0.01em to −0.03em); test each face,
and stop before letters touch.

### 2.1.8 Kern consistently and modestly or not at all

The font's kerning table is the designer's work; use it everywhere:

```css
body { font-kerning: normal; }
```

`auto` lets some engines skip kerning at small sizes. Do not wrap letter pairs
in spans with negative `letter-spacing` in prose; it fights the kerning table
and breaks in fallback fonts. Hand-kerning is acceptable only for a single
fixed piece of display type (a logotype-like headline) in one known font, and
only after `font-kerning: normal` is already on.

### 2.1.9 Don't alter the widths or shapes of letters without cause

**Now.**

- `font-synthesis: none` on fonts you load, then load the weights and italics
  you use. Synthesized bold smears; synthesized italic is a slanted roman;
  synthesized small caps are shrunken capitals.
- No `transform: scaleX()` on text. Width changes belong to a real width axis
  (`font-stretch` / `wdth`) designed by the type designer.
- No negative `letter-spacing` in body text to squeeze copy into a box.
- Variable font axes (`wght`, `wdth`, `opsz`, `GRAD`) are designed
  interpolations, not distortions; use them freely within their ranges.
- With `font-synthesis: none`, a metric-matched fallback needs its own
  `@font-face` per weight and style (regular, bold, italic) pointing at the
  local fallback's matching faces; a single weightless fallback face renders
  bold and italic as regular while the web font loads.

### 2.1.10 Don't stretch the space until it breaks

**Principle.** In lists such as contents pages, space should separate and bind.
Avoid wide chasms the eye cannot cross and rows of dot leaders.

**Now.** Keep the page number close to its entry: a short gap or a separator
(en space or bullet), not a right-aligned column across the full width.

```css
.toc li { display: flex; gap: 0.5em; }
.toc .page::before { content: "\2022"; margin-inline-end: 0.5em; }  /* note the backslash */
.toc .page { font-variant-numeric: oldstyle-nums proportional-nums; }
```

When numbers must align in a column (a price list), use
`font-variant-numeric: tabular-nums` and keep the column close to its labels.

---

## 2.2 Vertical motion

### 2.2.1 Choose a basic leading that suits the typeface, text and measure

**Principle.** Leading (baseline to baseline) is the basic vertical unit. It
depends on the face (large x-height and dark color want more), the size and the
measure (wider lines want more).

**Now.**

- Always unitless: `line-height: 1.5`. A length (`px`, `em` computed on the
  parent) is inherited as a fixed value and overlaps when a child is larger.
- Body text: roughly 1.4–1.6 on screen. Display: 1.05–1.2. Captions and small
  UI: 1.3–1.45.
- Browsers split leading equally above and below the line, unlike metal type.
  That half-leading is why headings look like they sit low in their boxes;
  `text-box` (2.2.2) removes it at the edges.
- Leading below 1 is fine for short display lines if ascenders and descenders
  do not collide. Check accented capitals (Å, Ä, Ö in Swedish and Finnish).

### 2.2.2 Add and delete vertical space in measured intervals

**Principle.** Headings, quotes, figures and notes vary the rhythm, but the
main text should return on the beat.

**Now.** Define the body line once and space everything in that unit.

- If body text is set at the root size, `rlh` (root line height) *is* the body
  line: `:root { line-height: 1.5 }` makes `1rlh` one line.
- If the prose is larger or smaller than the root (an 18px article on a 16px
  root), `rlh` is the wrong unit: it resolves against the root and every gap
  comes out short. Define the line as a custom property on the prose
  container instead. A `calc()` of `rem` values keeps it zoom-safe.

```css
.prose {
  --body-size: 1.125rem;
  --body-leading: 1.55;
  --line: calc(var(--body-size) * var(--body-leading));  /* one body line */
  font-size: var(--body-size);
  line-height: var(--body-leading);
}
/* Space with top margins only, so nothing collapses unexpectedly. */
.prose > * { margin-block: 0; }
.prose > * + * { margin-block-start: var(--line); }
.prose > h2 { font-size: 1.5rem; line-height: 1.25; margin-block-start: calc(2 * var(--line)); }
.prose > h3 { font-size: 1.25rem; line-height: 1.3; margin-block-start: calc(1.5 * var(--line)); }
.prose > :is(h2, h3) + * { margin-block-start: calc(0.5 * var(--line)); }  /* tight under headings */
.prose > h2 + h3 { margin-block-start: var(--line); }
```

- **Margin collapse trap.** Do not give headings a bottom margin while a
  sibling rule (`* + *`) gives the next block a top margin: adjacent vertical
  margins collapse to the *larger* one, so a half-line under a heading
  silently becomes a full line. Put each gap in exactly one place.
- Never write `1lh` for these gaps on the heading itself: `lh` is the
  *element's* line height, so on an h2 it measures the heading line, not the
  body line.
- Measure the result: the gap between a heading's bottom and the next
  paragraph's top (`getBoundingClientRect`) should equal the intended fraction
  of `--line`.

- **Keep headings on the beat.** If a heading's line-height is an arbitrary
  ratio (1.2 of 24px = 28.8px is fine, 1.3 of 20px = 26px is not), every block
  after it drifts off the body interval. Where the size allows, set heading
  line-height as a length tied to the body line, so a wrapping heading still
  occupies whole lines:
  ```css
  .prose > h2 { font-size: 1.5rem; line-height: var(--line); }               /* 24px on 28.8px */
  .prose > h1 { font-size: 2.25rem; line-height: calc(1.5 * var(--line)); }  /* 36px on 43.2px */
  ```
  Choose the multiple (1, 1.5 or 2 lines) that gives a heading ratio of about
  1.05–1.3. A length line-height is safe here because headings do not pass it
  to larger children. A strict baseline grid is still fragile (fallback fonts,
  images of unknown height); the aim is measured steps, not perfection.
- `text-box: trim-both cap alphabetic` trims the half-leading above the cap
  height and below the baseline, so a one-line gap between a heading and a
  paragraph looks like one line rather than one line plus two half-leadings.
  Apply it to headings, buttons and labels; leave multi-line body paragraphs
  alone. It is progressive: engines that lack it fall back to normal spacing.
- `lh` (the element's own line height) is useful for spacing inside a
  component: `padding-block: 0.5lh`.
- Images and embeds: size them in the interval where practical
  (`block-size: calc(10 * var(--line))` with `object-fit: cover`) or accept the break for
  images of natural height.
- Set margins explicitly; browser defaults (1em on `p`, `blockquote`, lists)
  are unrelated to the leading.

---

## 2.3 Blocks and paragraphs

### 2.3.1 Set opening paragraphs flush left

An indent marks a pause after a preceding paragraph. After a heading, quote,
list or figure it is superfluous, so the first paragraph is flush (flush
*start* in logical terms). Using `p + p` for indents handles this for free.

### 2.3.2 Mark paragraphs after the first with an indent of at least one en

Choose one convention:

```css
/* Indented: continuous reading, books, long essays */
.prose p { margin-block: 0; }
.prose p + p { text-indent: 1em; }    /* 1em, or 1lh to describe a square */

/* Block paragraphs: the web default, good for skimmable docs */
.prose p + p { margin-block-start: 1rlh; }
```

Never both indent and space. Other conventions (outdents with negative
`text-indent` plus matching `padding-inline-start`; ornaments via
`p + p::before { content: "\2766\00a0"; }`; run-in paragraphs) suit special
texts only. `text-indent` is already logical: it indents from the start edge in
both directions.

### 2.3.3 Add extra lead before and after block quotations

The quote must be distinct from the text before and after it. Space it in the
interval and indent it from the start edge with logical properties:

```css
.prose blockquote {
  margin-block: 1rlh;
  margin-inline: 1.5em 0;
  padding-inline-start: 1em;
  border-inline-start: 2px solid currentColor;
}
```

If the quote is set smaller, keep the gaps around it in body-line units so
the main text returns on the beat. Use `<blockquote>` with `<cite>` or a
`<figcaption>` for the source.

### 2.3.4 Indent or center verse quotations

Verse keeps its own line breaks and spacing. Center it on its longest line,
not on each line:

```css
.verse {
  white-space: pre-line;          /* keeps line breaks, collapses indents */
  inline-size: fit-content;
  margin-inline: auto;
  text-align: start;
}
```

Use `pre-wrap` when the poem's internal indents matter, and set the text font
(`<pre>` defaults to monospace).

---

## 2.4 Hyphenation and breaks

### 2.4.1 Leave at least two characters behind and take at least three forward

```css
.prose {
  -webkit-hyphens: auto;
  hyphens: auto;
  hyphenate-limit-chars: 6 2 3;          /* word length, before, after */
  -webkit-hyphenate-limit-before: 2;
  -webkit-hyphenate-limit-after: 3;
}
```

- Hyphenation only works with a correct `lang`; without it the browser does
  nothing or uses the wrong dictionary.
- `&shy;` (U+00AD) marks a manual break point for words the dictionary misses,
  including brand names and long Finnish compounds in headings.
- Do not hyphenate headings, UI labels, links, code, URLs or names:
  `hyphens: manual` on those.
- Many designers prefer 3 before as well (`6 3 3`) for readability; 2 is
  Bringhurst's minimum.

### 2.4.3 Avoid more than three consecutive hyphenated lines

`-webkit-hyphenate-limit-lines: 3` works in Safari. Other engines have no
control yet; stricter `hyphenate-limit-chars` values and a wider measure
reduce ladders. Check long Finnish and Swedish texts at the narrowest width.

### 2.4.5 Hyphenate according to the conventions of the language

The dictionary follows `lang`. Mark every passage and quoted word in another
language (`<span lang="fi">`). English hyphenates by morphology and
pronunciation, Finnish by syllable structure, Swedish at compound boundaries
first. See `logical-and-language.md`.

### 2.4.6 Link short numerical expressions with hard spaces

Keep together `6.2&nbsp;mm`, `page&nbsp;3`, `4&nbsp;×&nbsp;4`, `24/7`, a
number and its currency (`1&nbsp;000&nbsp;€` in Finnish), `§&nbsp;2.4.6`. In
content pipelines, insert these at render time. For numbers prefer
`Intl.NumberFormat`: its currency, percent and grouping output already uses
U+00A0. Its `style: 'unit'` output does **not** (`250 GB` comes back with a
plain space), so replace that space after formatting:

```js
const fmt = new Intl.NumberFormat(lang, { style: 'unit', unit: 'gigabyte' });
const bound = fmt.format(250).replace(/ /g, ' ');
```

Verify the rendered DOM, not the template: a static `10&nbsp;GB` in the HTML
is lost if a script re-renders the cell.

Bind short qualifiers to their number as well: `up&nbsp;to&nbsp;18&nbsp;h`,
`from&nbsp;€1,200`, `jopa&nbsp;18&nbsp;h`, `alk.&nbsp;1&nbsp;200&nbsp;€`,
`ca.&nbsp;3&nbsp;kg`. A stranded "up" or "from" at a line end reads as a
fragment. In table cells, `white-space: nowrap` is a sensible extra guard.

### 2.4.8 Never begin a page with the last line of a multi-line paragraph

Screens do not paginate, so the live problem is the *runt*: a single short word
alone on a paragraph's last line.

```css
.prose p  { text-wrap: pretty; }   /* avoids runts, evens the rag */
h1, h2, h3 { text-wrap: balance; }  /* even line lengths in headings */

@media print {
  p { widows: 2; orphans: 2; }
  h2, h3 { break-after: avoid; }
  figure, table, blockquote { break-inside: avoid; }
}
```

`text-wrap: balance` has a line limit in some engines and is for short text
only. For a heading break that matters, use a `&nbsp;` between the last two
words instead of `<br>`, which breaks at other widths.

---

## 3.1 Size

### 3.1.1 Don't compose without a scale

**Principle.** Use a modest set of distinct, related sizes, either the
traditional scale (6 7 8 9 10 11 12 14 16 18 21 24 36 48 60 72) or one of your
own devising.

**Now.**

- Tokens in `rem`, with roles: `--text-s`, `--text-m`, `--title-s`... A
  reading site rarely needs more than 6–8.
- Fluid sizes: `clamp(1.5rem, 1.2rem + 1.2vi, 2.25rem)`; the `rem` term keeps
  zoom working. Fluid sizing belongs to display roles; body, small, caption
  and label sizes stay fixed `rem`, so they double exactly at 200% zoom.
- **Zoom math.** Zoom doubles `rem` but halves the CSS viewport, so the `vi`
  term does not grow: on a wide window a fluid size reaches well under 2× at
  200% zoom (a hero spanning 2× between its min and max can land near 1.3×).
  WCAG 1.4.4 asks that text *can* reach 200%; browsers zoom to 500%, which
  gives the common heuristic max ÷ min ≤ 2.5. Keep each fluid range modest
  (about 1.4× or less) and compute the ratio at 200% zoom on the *worst*
  window before shipping; for a 360–1440px ramp that is a 1440px window
  (CSS viewport 720px, 1rem = 32 device px, 1vw = 7.2 CSS px = 14.4 device px).
- **Zoom and hierarchy pull against each other.** Narrow fluid ranges help
  zoom but compress the scale at the small end: if every heading starts close
  to its neighbour at 360px, the steps collapse (22 over 20px is a 1.10 step,
  which reads as a mistake). Resolve it by keeping only the top one or two
  roles fluid (hero, h1) and setting h3 and h4 as fixed `rem` sizes a clear
  step apart (at least 1.15–1.2× at every width), or by dropping a heading
  level. Check both constraints in the same script: adjacent ratios at 360px
  and 1440px, and the 200% zoom ratio at the worst window.
- Set `font-size: 100%` (or nothing) on `:root`, never `62.5%` tricks or `px`,
  so the reader's default size is respected.
- Use `font-optical-sizing: auto` with variable fonts that have an `opsz` axis,
  so small sizes get sturdier forms and large sizes get finer ones.
- Use `font-size-adjust` (for example `font-size-adjust: ex-height 0.5`) when
  mixing families or falling back, so x-heights stay consistent.

---

## 3.2 Figures, capitals and small caps

### 3.2.1 Text figures in running text, titling figures with full caps

```css
.prose          { font-variant-numeric: oldstyle-nums proportional-nums; }
.prose h1, .caps { font-variant-numeric: lining-nums; }
table, .price, .stat, time.duration {
  font-variant-numeric: lining-nums tabular-nums;
}
```

- Text (oldstyle) figures sit with lowercase and stop numbers shouting in
  prose. Lining figures belong with capitals and in display.
- Tabular figures share one width so columns of numbers align; use them in
  tables, prices, counters and anything that updates in place.
- Many UI sans faces default to lining tabular; many text serifs default to
  oldstyle. Know the default before overriding.
- Other numeric features: `slashed-zero` for codes, `diagonal-fractions`,
  `ordinal`.

### 3.2.2 Spaced small caps for abbreviations and acronyms in text

**Principle.** In running text, acronyms in full caps are too loud; set them in
spaced small caps. Exceptions: two-letter geographic abbreviations and
acronyms of personal names (DC, JFK). Genuine small caps are drawn as such;
shrunken capitals are a parody.

```css
.prose abbr {
  font-variant-caps: all-small-caps;
  font-variant-numeric: oldstyle-nums;
  letter-spacing: 0.05em;
  font-synthesis: none;            /* no fake small caps if the font lacks them */
  text-decoration: none;
}
```

- `small-caps` changes lowercase only; `all-small-caps` changes capitals too,
  which is what acronyms need.
- With `font-synthesis: none` a font without `smcp`/`c2sc` shows normal
  letters, which is the right fallback: live without rather than fake.
- Few fonts include italic small caps; reset `font-style: normal` inside
  italic passages or accept full caps there.
- Brand or house style may prefer full caps for acronyms (often the case in
  UI). That is a legitimate choice; the rule is for reading text.

### Checking what a font contains

Hosted services can strip OpenType features from subsets. Check the files you
actually serve:

```bash
python3 -c "
import sys; from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
tags = set()
for t in ('GSUB', 'GPOS'):
    if t in f: tags |= {r.FeatureTag for r in f[t].table.FeatureList.FeatureRecord}
print(sorted(tags))
print('axes:', [a.axisTag for a in f['fvar'].axes] if 'fvar' in f else 'static')
" path/to/font.woff2
```

(`pip install fonttools brotli` for WOFF2.) Look for `onum`, `lnum`, `tnum`,
`pnum`, `smcp`, `c2sc`, `liga`, `kern`, `case`, `zero`, `frac`. Visually,
true small caps match the stroke weight of the lowercase; fakes look thin.

**A tag is not coverage.** A feature can exist and still do almost nothing:
one commercial geometric sans we tested ships `case` that remaps only three
combining slash marks, so it raises no parentheses or hyphens on a caps label.
Coverage also differs between the files of one family: Source Serif 4 roman
has `smcp` and `c2sc` (about 350 glyphs each), its italic has neither, so
acronyms inside italic passages get synthesized small caps unless
`font-synthesis: none` is set. Check every file you serve and count what each
feature maps; `scripts/font-features.py` does both:

```bash
python3 scripts/font-features.py fonts/*.woff2 --check smcp=abcdefghijklmnopqrstuvwxyzäöå --check case="()[]-"
```

The core of the count, if you need it inline:

```python
g = f['GSUB'].table
for rec in g.FeatureList.FeatureRecord:
    if rec.FeatureTag in ('case', 'smcp', 'onum'):
        n = 0
        for li in rec.Feature.LookupListIndex:
            for st in g.LookupList.Lookup[li].SubTable:
                st = getattr(st, 'ExtSubTable', st)
                n += len(getattr(st, 'mapping', {}) or {})
        print(rec.FeatureTag, n, 'glyphs')
```

A missing `font-weight` descriptor on a variable font is not a bug in current
engines: it behaves as `auto` and uses the font's own `wght` range (measured
in Chromium). Declaring the range explicitly is still clearer.

---

## Beyond the site

Principles from the book that webtypography.net did not reach, paraphrased.

**Punctuation glyphs.** Use the real characters: en dash for ranges
(`1914–1918`, `pp. 12–24`) with no spaces; typographic quotes and apostrophes
(’ “ ” per language) instead of `'` and `"`; `×` for dimensions and
multiplication; `−` (U+2212) for negative numbers and minus; `…` or three
spaced periods consistently; primes (′ ″) only for feet, inches and minutes.
Where a dash is wanted as sentence punctuation, Bringhurst prefers a spaced en
dash to a closed em dash; a house style that avoids dashes entirely overrides
both.

**Case-sensitive forms.** With caps, `font-feature-settings: "case"` raises
hyphens, parentheses and brackets to cap height.

**Ligatures.** Keep common ligatures on (the default). Turn off discretionary
ligatures in text. Browsers drop optional ligatures automatically when
`letter-spacing` is non-zero.

**Last lines.** Avoid ending a paragraph on a fragment of a hyphenated word or
a word of under four letters; `text-wrap: pretty` and `hyphens` limits handle
most cases.

**Initials and drop caps.** Use `initial-letter: 3` on `::first-letter`
(Chromium and Safari) with a fallback that does nothing harmful; set the rest
of the first line in small caps if you want the classic opening.

**Underlines.** For links in text, `text-underline-offset: 0.15em`,
`text-decoration-thickness: from-font` or `0.06em`, and
`text-decoration-skip-ink: auto` so descenders are not struck through.

**Hanging punctuation.** `hanging-punctuation: first last` (Safari only) hangs
opening quotes into the margin. Elsewhere, a pull quote can hang its opening
mark with a negative `text-indent` equal to the quote's width.
