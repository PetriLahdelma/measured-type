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

Bringhurst's working principles in CSS for 2026, with tools that measure what
can be measured. Each rule carries its Bringhurst number (cite it as `§2.1.2`)
so the reasoning is traceable. What goes wrong is judgment, not syntax: text
without a measure, faked small caps, lining figures in prose, letterspaced
lowercase, justification without hyphenation, margins that ignore the leading
and physical `left`/`right` everywhere.

## 1. Classify the text before styling it

Bringhurst wrote for continuous reading, and book rules applied to interface
text are their own mistake. Decide which kind of text you are setting:

| Kind | Examples | What changes |
|---|---|---|
| **Reading text** | articles, docs, case studies, legal copy | every rule applies: measure, rhythm, paragraph marking, text figures, hyphenation |
| **Display text** | heroes, page titles, section heads | size from the scale, tighter leading, tracking tuned to size, `text-wrap: balance` |
| **Interface and data** | buttons, labels, nav, tables, prices, forms, dashboards, status badges | no paragraph indents; lining **tabular** figures, numbers aligned at the end; uppercase labels get positive tracking; truncated text stays recoverable; rhythm comes from the spacing scale. Details: `references/product-ui.md` |

A page usually mixes all three: scope reading-text rules to a prose container
(`.prose`, `article`), not global selectors, so they stay out of controls.

## 2. The core rules

| § | Rule | Numbers | Current CSS |
|---|---|---|---|
| 2.1.2 | Comfortable measure | 45–75 characters, 66 ideal; 40–50 per column in multi-column | `max-inline-size: 34em` or about `60ch`, then count (see §5) |
| 2.2.1 | Leading suits face, size and measure | body ~1.4–1.6; display ~1.05–1.2; wider measure, more lead | unitless `line-height` for body text; headings may use a whole number of body lines (`line-height: var(--line)`) |
| 2.2.2 | Vertical space in measured intervals | every gap a multiple (or half) of the body line | `--line: calc(size * leading)` (or `1rlh` only if body = root size) |
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
| 2.4.8 | No stranded lines at page breaks | print: never a paragraph's last line at the top of a page; screen: avoid one-word last lines (a web convention) | `text-wrap: pretty`; print `widows: 3; orphans: 3` (a house preference; 2 is the CSS default) |

Full reasoning, variants and pitfalls for each rule: `references/rules.md`.

## 3. Direction and language come first

Write every rule with **logical properties** and treat `lang` and `dir` as
typographic inputs: hyphenation, quotes, figures and line breaking key off
them, and LTR should never be why an RTL or vertical edition breaks.

- `<html lang="en" dir="ltr">`; `lang` on every passage in another language;
  `dir="auto"` or `<bdi>` around user-generated or mixed-direction strings.
- `margin-inline`, `padding-block`, `inset-inline-start`, `border-inline-start`,
  `inline-size`, `max-inline-size`, `text-align: start`, `float: inline-start`.
  Physical properties only for things that are physical (a shadow offset, a
  rotated graphic).
- Never letterspace or hyphenate-by-assumption in scripts that join (Arabic) or
  lack hyphenation conventions; mirror only directional icons via `:dir(rtl)`.
- Quotes, number grouping, decimal marks and unit spacing differ per locale
  (English, Finnish and Swedish are worked through); format numbers with
  `Intl.NumberFormat(locale)`, not hand-written strings.

Details, language tables and code: `references/logical-and-language.md`.

## 4. Workflows

Match the work to the question. A single fact (does this font have true small
caps, what does `66ch` set in this face) gets the one check that answers it
and a short reply with the number. Run a workflow only when the task is to
set, scale or review text. Where a tool computes the answer, use it instead of
working it out by hand.

### Setting reading text

1. Check every font file you serve with `scripts/font-features.py` (roman and
   italic differ): a feature the font lacks cannot be switched on.
2. Scope a prose container with `max-inline-size` (and `margin-inline: auto`
   if centred), and solve for the width instead of guessing it:
   `node scripts/measure-line.js --css prose.css --solve 66` finds the `em`
   value whose rendered lines average 66 characters;
   `estimate-measure.js "Verdana" --target 66 --size 17` estimates it without a
   browser.
3. Unitless body `line-height`; one body line as
   `--line: calc(body-size * leading)` on the prose container; headings,
   quotes, lists and figures in whole or half `--line` steps.
4. One paragraph convention: indent or space.
5. Real figures and small caps only. Always `font-synthesis-small-caps: none`;
   `font-synthesis: none` too where every weight and italic is loaded,
   fallbacks included (`rules.md` §2.1.9).
6. A metric-matched fallback, so the web font arrives without reflow:
   `python3 scripts/fallback-metrics.py font.woff2 --fallback Georgia.ttf --name Georgia`.
7. `hyphens: auto` with limits where the measure is narrow or the language
   compounds (Finnish, Swedish); `text-align: start`; `text-wrap: pretty` on
   paragraphs and `balance` on headings.
8. Real punctuation in the content: en dash ranges, quotes and apostrophes,
   `×` and `−`, ellipsis.
9. WCAG 1.4.12: text survives the spacing overrides (line-height 1.5,
   paragraph spacing 2em, letter-spacing 0.12em, word-spacing 0.16em), so no
   fixed heights on text boxes. WCAG 1.4.10: one column at 320 CSS px;
   `max-inline-size` lets a box shrink where `width` does not.

### Building or reviewing a type scale

Generate and check it rather than hand-tuning `clamp()`:
`node scripts/type-scale.js --base 1rem:1.125rem --ratio 1.2:1.25 --steps 5 --fluid-from 4`
prints the tokens and a table of range, zoom growth and step ratios and exits
1 naming any step that fails. Sizes are `rem`; body, small, caption and label
stay fixed (exactly 2× at 200% zoom); fluid display sizes are
`clamp(min-rem, rem + vi, max-rem)`, because a pure `vw` size fails zoom. Keep
only hero and h1 fluid, and h3 and h4 fixed a clear step apart (1.2–1.25×,
never under about 1.15×). How many sizes, the line-height and tracking of each
and the spacing tokens are in `rules.md` §3.1.1.

When the request fixes both ends (say 32px on a phone and 60px on a desktop),
keep the requested sizes: do not quietly shrink the desktop size to pass zoom,
and do not ship a ramp that fails it. `node scripts/type-scale.js --fit 2rem:3.75rem`
prints the plain ramp and two forms that keep both sizes and pass the 1.6×
bar: an early max (the ramp ends sooner, so every screen from about 840px gets
the full size) and two slopes (`clamp(min, min(steep, gentle), max)`, steep up
to 640px and gentle after it). Pick one, say which and why, and give the
growth at 200% on narrower windows from its table.

### Auditing existing CSS or a page

1. Run the tools first; "Running the tools" in `references/audit.md` lists
   what each one reads.
   ```bash
   node scripts/lint-css.js src page.html                 # source with file:line; --diff origin/main for a PR
   node scripts/page-audit.js http://localhost:3000/post  # rendered: reflow, measure, contrast, spacing, zoom
   ```
   Without a browser, `page-audit.js --lite` and `estimate-measure.js` need
   only Node: say "estimated" and list the skipped checks under
   **Not verified**.
2. For a contrast failure, `scripts/contrast-fix.js "#999" "#fff"` gives the
   nearest colour of the same hue that passes; MT-CONTRAST findings already
   name it.
3. Read `references/css-modern.md` for properties the tools do not know, and
   judge hierarchy, rhythm, pairing and emphasis yourself.
4. Report as `references/audit.md` shows: one table by severity (HIGH, MEDIUM,
   LOW) with rule ID, location, measured value and CSS fix, then **Block** or
   **Approve** and what you could not verify. Label taste findings with their
   kind.

## 5. Verify, don't assume

- **Measure**: count characters per line in the rendered page instead of
  trusting `ch`. `1ch` is the width of the zero, so `66ch` often sets 75+
  characters (97 in a wide geometric sans). `measure-line.js` counts full
  lines in Chromium and names the face that rendered:
  ```bash
  node scripts/measure-line.js --css prose.css             # built-in sample prose
  node scripts/measure-line.js page.html ".prose > p"      # an existing page
  node scripts/measure-line.js --css prose.css --solve 66  # the width for 66
  ```
  `--solve` also says when the container is too narrow for the width to take
  effect. Without Node, paste its `measureLines` function into a console.
- **Features**: check the glyphs, not just the tag:
  `python3 scripts/font-features.py fonts/*.woff2 --check smcp=abcdefghijklmnopqrstuvwxyz`.
- **Spacing and rhythm**: measure the rendered gap under each heading
  (collapsing margins can turn half a line into a whole one) and overlay a
  one-line gradient to see drift.
- **Hyphenation**: test each language in Chromium, Safari and Firefox;
  their dictionaries differ.

## 6. Taste

Opinions beyond Bringhurst are in `references/taste.md`, each labelled
standard, measured, convention or preference; a house style overrides the
last two. Read it before aesthetic choices or a review with a point of view.
In short: few sizes used with conviction, one or two families with a clear job
each, generous but disciplined space, real glyphs and no decorative effects
standing in for hierarchy.

## References

| File | Read when |
|---|---|
| `references/rules.md` | citing a rule or needing its variants (indents, heading math, small caps exceptions, verse) |
| `references/css-modern.md` | older CSS: whether a property exists, its current name, browser support |
| `references/logical-and-language.md` | anything multilingual, right-to-left or mixed-direction; locale quotes, numbers, units and hyphenation (EN, FI, SV worked examples) |
| `scripts/measure-line.js` | stating, shipping or solving a measure (`--solve`) |
| `scripts/font-features.py` | before enabling `onum`, `smcp`, `c2sc`, `case`, `tnum` or any `font-feature-settings` |
| `references/taste.md` | choosing or pairing faces, display and dark-mode text, a review for quality |
| `references/audit.md` | any review: running the tools, severities, verdict, report and the rule catalogue |
| `references/screen-and-ui.md` | inline code, icons beside labels, heading hierarchy and spacing, kerning, thin weights, light text on dark |
| `references/product-ui.md` | dashboards, admin tools and data tables: number columns, labels, badges and status text, truncation |
| `scripts/lint-css.js` | linting source of any kind (`audit.md` lists the formats) or a pull request (`--diff`) |
| `scripts/page-audit.js` | a rendered page: reflow, measure, contrast, spacing, fonts, zoom; `--lite` without a browser |
| `scripts/contrast-fix.js` | a contrast failure: the nearest passing colour of the same hue |
| `scripts/estimate-measure.js` | no browser: characters per line for a face and width, or the width for `--target` |
| `scripts/apca.js` | weight-sensitive contrast: APCA Lc beside the WCAG ratio (advisory) |
| `scripts/fallback-metrics.py` | loading web fonts: a metric-matched fallback so the swap does not reflow |
| `scripts/type-scale.js` | building fluid type tokens that pass the zoom and step checks; `--fit MIN:MAX` when the request fixes a wide range |

Sources: Robert Bringhurst, *The Elements of Typographic Style*; Richard
Rutter, *The Elements of Typographic Style Applied to the Web*
(webtypography.net, CC BY-NC 4.0), whose rule order this skill follows; Matej
Latin's *Better Web Typography for a Better Web* and Ina Saltz's *Typography
Essentials* (in `references/screen-and-ui.md`). Rules are paraphrased and the
CSS is rewritten for current browsers. Not affiliated with or endorsed by any
of these authors.
