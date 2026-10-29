---
name: measured-type
description: >-
  Web typesetting specialist. Use it whenever a request touches how words and
  numbers sit on a web page, even when "typography" is never said. It works
  alongside general frontend, UI-review and design-system skills and handles
  the type decisions inside their work. Typical asks: review or critique a stylesheet's type;
  make an article, blog, docs or landing page read better (headings, paragraph
  spacing, quotes, captions); text that feels cramped, too wide or too small;
  type scales or font-size tokens that hold up under zoom and accessibility
  rules; dense product UI such as data tables, labels, badges and status text;
  prices, units and dates kept together and aligned; long words overflowing on
  phones; other languages and scripts (Finnish, Swedish, RTL). Gives
  Bringhurst-grounded CSS fixes and measures line length, zoom and font
  features in a real browser, or lints the source when none is available.
  Skip it for logos, drawing icons or fonts, build setup and non-visual number
  parsing.
license: Text CC BY-NC 4.0 (adapts webtypography.net by Richard Rutter); scripts MIT. See LICENSE.
---

# Measured type

Bringhurst's working principles, translated into CSS that ships in 2026, with
the judgment calls that separate considered typesetting from defaults.

Claude already knows CSS syntax. What goes wrong is typographic judgment: text
set without a measure, small caps faked by the browser, lining figures in
running prose, lowercase letterspaced, justification without hyphenation,
margins that ignore the leading, physical `left`/`right` everywhere. This skill
exists to close those gaps. Each rule has a number from Bringhurst (cite it as
`§2.1.2` in reviews) so the reasoning is traceable.

## 1. Classify the text before styling it

Bringhurst wrote for continuous reading. Applying book rules to interface text
is its own mistake, so decide which kind of text you are setting:

| Kind | Examples | What changes |
|---|---|---|
| **Reading text** | articles, docs, case studies, legal copy | every rule applies: measure, rhythm, paragraph marking, text figures, hyphenation |
| **Display text** | heroes, page titles, section heads | size from the scale, tighter leading, tracking tuned to size, `text-wrap: balance` |
| **Interface and data** | buttons, labels, nav, tables, prices, forms, dashboards | no paragraph indents; lining **tabular** figures; uppercase labels get positive tracking; rhythm comes from the spacing scale |

A single page usually mixes all three. Scope reading-text rules to a prose
container (`.prose`, `article`) instead of global element selectors, so they do
not leak into cards and controls.

## 2. The core rules

| § | Rule | Numbers | Current CSS |
|---|---|---|---|
| 2.1.2 | Comfortable measure | 45–75 characters, 66 ideal; 40–50 per column in multi-column | `max-inline-size: 34em` or about `60ch`, then count (see §5) |
| 2.2.1 | Leading suits face, size and measure | body ~1.4–1.6; display ~1.05–1.2; wider measure, more lead | unitless `line-height` for body text; headings may use a whole number of body lines (`line-height: var(--line)`) |
| 2.2.2 | Vertical space in measured intervals | every gap a multiple (or half) of the body line | `--line: calc(size * leading)` (or `1rlh` only if body = root size), `text-box: trim-both cap alphabetic` |
| 2.3.1–2 | Mark paragraphs one way | first paragraph flush; later ones indent at least 1 en, typically 1em; or space them, never both | `p + p { text-indent: 1em; margin-block-start: 0 }` |
| 2.1.3 | Ragged unless justification is earned | justify only with working hyphenation and a wide measure; ragged usually suits sans and mono | `text-align: start` |
| 2.4.1 | Hyphenation minimums | 2 letters before the break, 3 after; only words of 6+ letters (a software convention, not Bringhurst's) | `hyphens: auto; hyphenate-limit-chars: 6 2 3` + correct `lang` |
| 2.4.3 | No hyphen ladders | max 3 consecutive hyphenated lines | `-webkit-hyphenate-limit-lines: 3` (Safari only) |
| 2.4.5 | Hyphenate by the language's rules | dictionary follows `lang` | `lang` on `<html>` and on every foreign passage |
| 2.1.6 | Letterspace caps, small caps, long digit strings | +5% to +10% of size | `letter-spacing: 0.05em`–`0.1em` |
| 2.1.7 | Don't letterspace lowercase without reason | 0 for text; slight negative only at display sizes, tested per face | leave `letter-spacing: normal` |
| 2.1.8 | Kern consistently or not at all | trust the font's kerning | `font-kerning: normal`; no per-letter spans in prose |
| 2.1.9 | Don't distort letters | no fake bold, italic, small caps or squeezed widths | `font-synthesis: none`, load real faces |
| 3.1.1 | Compose with a scale | a modest set of related sizes, in `rem` | tokens; fluid `clamp()` keeps a `rem` term |
| 3.2.1 | Text figures in prose, lining with caps | tabular lining in tables | `font-variant-numeric: oldstyle-nums` / `lining-nums tabular-nums` |
| 3.2.2 | Acronyms in spaced small caps | true `smcp`/`c2sc` only; not for 2-letter places or personal initials | `font-variant-caps: all-small-caps; letter-spacing: 0.05em` |
| 2.4.6 | Hard spaces in short expressions | `6.2 mm`, `page 3`, `4 × 4`, `1 000 €` | `&nbsp;` / U+202F; `Intl` currency and percent include them, `style: 'unit'` does not |
| 2.1.5 | Little or no space inside initials | `W.B. Yeats` or hair spaces | U+200A |
| 2.4.8 | No stranded lines at page breaks | print: never a paragraph's last line at the top of a page; screen: avoid one-word last lines (a web convention) | `text-wrap: pretty`; print `widows: 3; orphans: 3` |

Full reasoning, variants and pitfalls for each rule: `references/rules.md`.

## 3. Direction and language come first

Write every new rule with **logical properties** and treat `lang` and `dir` as
typographic inputs, because hyphenation, quotes, figures and line breaking all
key off them. LTR is the default, and it should never be the reason an RTL or
vertical edition breaks.

- `<html lang="en" dir="ltr">`; `lang` on every passage in another language;
  `dir="auto"` or `<bdi>` around user-generated or mixed-direction strings.
- `margin-inline`, `padding-block`, `inset-inline-start`, `border-inline-start`,
  `inline-size`, `max-inline-size`, `text-align: start`, `float: inline-start`.
  Physical properties only for things that are physical (a shadow offset, a
  rotated graphic).
- Never letterspace or hyphenate-by-assumption in scripts that join (Arabic) or
  lack hyphenation conventions; mirror only directional icons via `:dir(rtl)`.
- Quotes, number grouping, decimal marks and unit spacing differ per locale
  (English, Finnish and Swedish are worked through as the pattern). Format
  numbers with `Intl.NumberFormat(locale)` instead of hand-written strings.

Details, language tables and code: `references/logical-and-language.md`.

## 4. Workflows

Match the work to the question. A single fact (does this font have true small
caps, which rule covers line length, what does `66ch` set in this face) gets
the one check that answers it and a short reply with the number, not a full
audit. Run a workflow below only when the task is to set, scale or review
text.

### Setting reading text

1. Confirm the font files: which weights, italics and OpenType features
   (`onum`, `smcp`, `c2sc`, `tnum`, `liga`, `kern`) they actually contain.
   Hosted subsets often strip features, and a feature the font lacks cannot be
   switched on; run `scripts/font-features.py` on every file you serve (roman
   and italic can differ).
2. Scope a prose container. Set `max-inline-size` for the measure and
   `margin-inline: auto` if centered.
3. Unitless body `line-height`. Define one body line as
   `--line: calc(body-size * leading)` on the prose container; `rlh` equals it
   only when the prose is set at the root font size.
4. Space headings, quotes, lists and figures in whole or half `--line` steps.
5. Choose one paragraph convention (indent or space).
6. Turn on figures and small caps the font really has. Always set
   `font-synthesis-small-caps: none`; set `font-synthesis: none` for weight
   and style too only where every weight and italic you use is loaded,
   fallbacks included (`rules.md` §2.1.9).
7. Match the fallback so the web font arrives without reflow:
   `python3 scripts/fallback-metrics.py font.woff2 --fallback Georgia.ttf --name Georgia`
   prints the `@font-face` overrides; list that family right after the web
   font.
8. `hyphens: auto` with limits when the measure is narrow or the language has
   long compounds (Finnish and Swedish do); keep `text-align: start`.
9. `text-wrap: pretty` on paragraphs, `text-wrap: balance` on headings.
10. Check punctuation glyphs in the content: en dash ranges, real quotes and
   apostrophes, `×` and `−`, ellipsis.
11. Check WCAG 1.4.12: the layout must survive user overrides of line-height
    1.5, paragraph spacing 2em, letter-spacing 0.12em and word-spacing 0.16em,
    so avoid fixed heights on text boxes.
12. Check WCAG 1.4.10: at 320 CSS px (a 1280px window at 400% zoom) text
    reflows into one column without sideways scrolling. Page zoom scales `px`
    too, so a fixed `width: 960px` keeps its character count but no longer
    fits; `max-inline-size` lets the box shrink.

### Building or reviewing a type scale

Generate and check it rather than hand-tuning `clamp()`:
`node scripts/type-scale.js --base 1rem:1.125rem --ratio 1.2:1.25 --steps 5 --fluid-from 4`
prints the tokens and a table of range, zoom growth and step ratios, and
exits 1 naming any step that fails. The rules it applies:

- 5 to 8 sizes for a site, each with a named role. Use either the traditional
  scale (12 14 16 18 21 24 36 48 60 72) or a stated ratio, not a pile of
  one-off values.
- Sizes in `rem` so the reader's default size and zoom scale them (WCAG
  1.4.4). Body, small, caption and label stay fixed `rem` (exactly 2× at 200%
  zoom). Fluid display sizes as `clamp(min-rem, rem + vi, max-rem)`; the `vi`
  part does not grow with zoom, so keep each range modest and compute the
  ratio at 200% zoom (see `rules.md` §3.1.1). A pure `vw` value fails zoom.
  Narrow ranges compress the steps on phones: keep only hero and h1 fluid and
  give h3/h4 fixed sizes a clear step apart (aim for 1.2–1.25×, never below
  about 1.15× even on phones).
- Pair each size with its own line-height (unitless, or for headings a whole
  number of body lines so wrapped headings stay on the beat) and, for caps or
  display roles, its tracking. Leading tightens and tracking moves slightly negative as
  size grows; caps and small labels get positive tracking.
- Express spacing tokens as multiples of the base line so headings and body
  share one rhythm.

### Auditing existing CSS or a page

1. Run the tools first, then read: they find what reading misses and every
   finding comes with a number.
   ```bash
   node scripts/lint-css.js src/styles page.html          # source, with file:line
   node scripts/lint-css.js src --diff origin/main         # only what a PR changed
   node scripts/page-audit.js http://localhost:3000/post   # rendered: reflow, measure,
                                                           # contrast, text spacing, zoom
   ```
   Add `--rtl` to the lint when a right-to-left edition is planned.

   **No browser installed?** `lint-css.js` and `estimate-measure.js` need only
   Node, no `npm install`. `page-audit.js --lite` (and any run where
   Playwright is missing) lints a local page and its stylesheets and lists
   every rendered check it skipped; `estimate-measure.js "Verdana" 66ch`
   estimates characters per line from a Chromium calibration. Say "estimated"
   and put the skipped checks under **Not verified**; never report an
   estimate as a measurement.
2. Read `references/css-modern.md` for renamed, dead or mistyped properties
   the tools do not know. Judge hierarchy, rhythm, pairing and emphasis
   yourself.
3. Report in the format of `references/audit.md`: one table ordered by
   severity (HIGH, MEDIUM, LOW), rule ID, location, the measured value and the
   CSS fix, then **Block** or **Approve** and what you could not verify. Label
   taste findings with their kind so the team knows which ones it can
   decline.

## 5. Verify, don't assume

- **Measure**: count characters per line in the rendered page instead of
  trusting `ch`. `1ch` is the width of the zero, usually wider than the average
  letter, so `66ch` often fits 75+ characters (97 in a wide geometric sans).
  The script counts full lines in Chromium (graphemes, so accents count once;
  columns and vertical text on their own axis), reports the content box in px,
  `ch` and `em` and names the face that actually rendered, so you can correct
  the value in one step:
  ```bash
  node scripts/measure-line.js --css prose.css          # built-in sample prose
  node scripts/measure-line.js page.html ".prose > p"    # an existing page
  ```
  Without Node, paste its `measureLines` function into a browser console.
- **Features**: confirm the font has them before enabling, check that a
  feature actually covers the glyphs you need (a tag can map almost nothing)
  and look at the rendered glyphs (true small caps have heavier strokes than
  shrunk capitals). `--check` takes any GSUB or GPOS tag and, for figure
  features, says first whether the default digits already have that form:
  ```bash
  python3 scripts/font-features.py fonts/*.woff2 --check smcp=abcdefghijklmnopqrstuvwxyz
  ```
- **Spacing**: measure the rendered gap under each heading; collapsing margins
  can silently turn a half-line into a full line.
- **Hyphenation**: test each language in Chromium, Safari and Firefox;
  dictionary coverage differs per engine.
- **Rhythm**: overlay a repeating gradient of one body line while developing; drift
  below a heading means its line-height or margins break the interval.

## 6. Taste: what reads as considered in 2026

Opinions that go beyond Bringhurst. Read `references/taste.md` before making
aesthetic choices or when asked for a typographic review with a point of view.
It marks each rule as standard, measured, convention or preference; report
findings with that label; a house style overrides the last two.
In short: few sizes used with conviction, one or two families with a clear job
each, generous but disciplined space, real glyphs instead of synthesized ones,
and no decorative effects standing in for hierarchy.

## References

| File | Read when |
|---|---|
| `references/rules.md` | applying or citing a specific rule; need variants (indent styles, heading math, small caps exceptions, verse, contents lists) |
| `references/css-modern.md` | auditing older CSS; unsure whether a property exists, its current name or browser support |
| `references/logical-and-language.md` | anything multilingual, RTL, mixed-direction, or locale quotes, numbers, units and hyphenation (EN, FI, SV worked examples) |
| `scripts/measure-line.js` | before stating or shipping a measure; after changing font, size or `max-inline-size` |
| `scripts/font-features.py` | before enabling `onum`, `smcp`, `c2sc`, `case`, `tnum` or any `font-feature-settings` |
| `references/taste.md` | choosing faces, pairing, display treatment, dark mode text or reviewing for quality rather than correctness |
| `references/audit.md` | any review or audit: severities, verdict, report table and the rule catalog |
| `references/screen-and-ui.md` | inline code, icons beside labels, heading hierarchy and spacing, choosing or combining faces, kerning, thin weights or light text on dark |
| `scripts/lint-css.js` | auditing CSS or HTML source, or a pull request (`--diff`) |
| `scripts/page-audit.js` | auditing a rendered page: reflow, measure, contrast, text spacing, fonts, zoom, plus the `screen-and-ui.md` checks; `--lite` without a browser |
| `scripts/estimate-measure.js` | no browser available: characters per line estimated for a face and width |
| `scripts/apca.js` | a contrast question where weight matters: APCA Lc next to the WCAG ratio |
| `scripts/fallback-metrics.py` | loading web fonts: a metric-matched fallback so the swap does not reflow |
| `scripts/type-scale.js` | building fluid type tokens that pass the zoom and step checks |

Sources: Robert Bringhurst, *The Elements of Typographic Style*; Richard
Rutter, *The Elements of Typographic Style Applied to the Web*
(webtypography.net, CC BY-NC 4.0), whose rule order this skill follows.
`references/screen-and-ui.md` adds checks from Matej Latin's *Better Web
Typography for a Better Web* and Ina Saltz's *Typography Essentials*. Rules
are paraphrased and the CSS is rewritten for current browsers. This is an
independent project, not affiliated with or endorsed by any of these authors.
