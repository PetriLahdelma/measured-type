# Auditing: report format and rule catalog

Use this file when asked to review, audit or critique typography, and whenever
`scripts/lint-css.js` or `scripts/page-audit.js` reports findings. Both scripts
emit the rule IDs below, so a finding from the tool and a finding from reading
the code look the same in the report.

## Contents

- Running the tools: what each script reads and when to use which
- Severity: HIGH, MEDIUM and LOW
- Verdict: Block, "Approve, N to fix" and Approve
- Report shape: one row per root cause, grouped by severity
- Rule catalog: every rule ID with its severity, check and source

## Running the tools

Run the tools before reading the code: they find what reading misses, and
every finding comes with a number.

- `scripts/lint-css.js src` lints source with `file:line`: CSS, SCSS and Less,
  the `<style>` blocks of `.vue`, `.svelte` and `.astro` files, and Tailwind
  classes in markup and JSX, including `cn()`, `clsx()`, Vue `:class` and
  Svelte `class:`. Only the interpolated parts of template literals are listed
  as not verified. `--diff origin/main` lints only what a branch changed;
  `--rtl` adds the right-to-left checks when an RTL edition is planned.
- `scripts/page-audit.js <url or file>` renders the page and checks reflow,
  measure, contrast, text spacing, fonts and zoom, language and punctuation
  in the text the reader gets, numbers split from their units, synthesized
  bold and italic and text that moves when the web fonts arrive, plus the
  checks of `screen-and-ui.md` and `product-ui.md`.
- **No browser installed?** `lint-css.js` and `estimate-measure.js` need only
  Node, no `npm install`. `page-audit.js --lite` (and any run where Playwright
  is missing) lints a local page and its stylesheets and lists every rendered
  check it skipped (exit 3 when it stood in for a rendered audit nobody asked
  to skip); `estimate-measure.js "Verdana" 66ch` estimates characters
  per line from a Chromium calibration. Say "estimated", put the skipped checks
  under **Not verified** and never report an estimate as a measurement.

## Severity

Severity follows from the kind of rule (see `taste.md`) and its effect on the
reader, not from how sure the reviewer feels.

| Severity | Means | Typical kinds |
|---|---|---|
| **HIGH** | A standard fails (WCAG, a CSS or HTML spec) or text becomes unreadable, clipped or lost: sideways scroll at 320 CSS px, text that cannot reach 200% zoom, contrast under 4.5:1, content clipped under the 1.4.12 spacing override | standard |
| **MEDIUM** | A measured value is out of range or a convention fails in a way the reader feels: 90 characters per line, `px` line-heights that overlap, justified text without hyphenation, a web font that silently fell back | measured, convention |
| **LOW** | Convention or house preference worth fixing when touched: physical sides in an LTR-only page, `font-feature-settings` where `font-variant-*` exists, a one-word last line in a heading | convention, preference |

A house style decides LOW findings. Never raise a preference to MEDIUM because
it is yours.

## Verdict

End every audit with one line:

- **Block (N HIGH)** when any HIGH finding remains.
- **Approve, N to fix** when no HIGH remains but N MEDIUM rows do: the page
  can ship, and the table says what is left.
- **Approve** when only LOW findings or none remain; LOW findings stay in
  the table to fix when the code is touched.

Never approve what you did not check. List every check you could not run under
**Not verified** (for example "contrast: no rendered page", "Safari: not
available").

## Report shape

Group by severity, one row per root cause, every location in the same row:

```markdown
| Severity | Rule | Location | Measured | Fix |
|---|---|---|---|---|
| HIGH | MT-ZOOM-VW | `tokens.css:14` `--h1` | `4vw` grows 1.00× at 200% zoom | `clamp(2rem, 1.75rem + 1vi, 2.75rem)` |
| MEDIUM | MT-MEASURE-LONG | `.prose p` at 1280px | 92 characters per line | `max-inline-size: 34em`, then count |

Verdict: Block (1 HIGH)
Not verified: Safari hyphenation
```

`Location` is `path:line` for source findings and a selector plus viewport for
rendered ones. `Measured` holds a number whenever one exists; that is the point
of this skill. `Fix` is CSS, not advice.

## Rule catalog

Static rules come from `scripts/lint-css.js`; rendered rules from
`scripts/page-audit.js`. Section numbers point to `rules.md`.

| Rule | Severity | Check | Source |
|---|---|---|---|
| MT-REFLOW | HIGH | Page scrolls sideways at 320 CSS px (400% zoom of 1280) or at 375px, or text runs past the inline-end edge where hidden overflow stops the scroll (text placed off-screen until focus, such as a skip link, is not counted) | WCAG 1.4.10, §2.1.2 |
| MT-ZOOM-VW | HIGH | `font-size` from `vw`/`vi` with no `rem`/`em` term, or any rendered text that reaches 2× at no zoom level checked (200% and 500% on a 1280px window) | WCAG 1.4.4, §3.1.1 |
| MT-VIEWPORT-ZOOM | HIGH | `user-scalable=no` or `maximum-scale` below 2 in the viewport meta | WCAG 1.4.4 |
| MT-ROOT-PX | MEDIUM | `font-size` in `px` on `html` or `:root`: overrides the reader's default (a percentage under 100% is LOW). A convention: zoom still works and no WCAG criterion requires the default size | §3.1.1 |
| MT-CONTRAST | HIGH | Text contrast under 4.5:1 (3:1 for 24px, or 18.66px bold), translucent grounds laid over what is beneath them; the ground is what is painted under the text at its position, a layer that is not its ancestor included, and the canvas for the page's colour scheme where nothing is | WCAG 1.4.3 |
| MT-LINK-COLOUR | HIGH | A link in running text told apart by colour alone (no visible underline, border, background, weight, style, family or raised position) and under 3:1 against the text around it; at 3:1 or more, its hover and focus cue is listed under Not verified | WCAG 1.4.1 (F73, G183) |
| MT-TEXT-SPACING | HIGH | Text the 1.4.12 spacing override pushes out of its box, measured per axis, or spilling text that meets the next block's text (an axis that scrolls loses nothing; boxes that already clip, such as screen-reader text or a closed panel, are hidden by design) | WCAG 1.4.12 |
| MT-MEASURE-LONG | MEDIUM | Reading text averages over 75 characters per full line | §2.1.2 (measured) |
| MT-LH-LENGTH | MEDIUM | `line-height` as a length on an element that has children | §2.2.1 |
| MT-LH-TIGHT | MEDIUM | Unitless `line-height` under 1.3 on body text in the source; rendered, leading under the house floor for the measured line length (1.3 up to 45 characters, 1.4 from 60, `normal` included; CJK skipped) | §2.2.1 (house band) |
| MT-JUSTIFY | MEDIUM | `text-align: justify` without `hyphens: auto`, or rendered with `hyphens: auto` but no `lang` (no dictionary, nothing hyphenates). Justified CJK is exempt | §2.1.3, §2.4.1 |
| MT-WIDTH-PX | MEDIUM | Fixed `width` in `px` on a text container | WCAG 1.4.10, §2.1.2 |
| MT-FONT-PX | MEDIUM | Body or paragraph `font-size` in `px` | §3.1.1 |
| MT-FONT-FALLBACK | MEDIUM | Rendered face is not the first family declared: the web font failed or lacks glyphs. A web font that loaded under another name, and text in another script drawn by a later family of the stack, are exempt | measured |
| MT-SIZE-FLOOR | MEDIUM | Reading text below 16px; rendered, also Latin reading text of 16px or more with an x-height under 7px (house threshold) | taste (convention) |
| MT-SMALLCAPS-SYNTH | MEDIUM | Small caps requested with synthesis allowed: fake small caps if the font lacks `smcp` | §2.1.9, §3.2.2 |
| MT-ZOOM-RANGE | LOW | Fluid range over 1.4× (MEDIUM over 2.5×, the zoom heuristic) | §3.1.1 |
| MT-ZOOM-GROWTH | LOW | Heading or reading text grows under 1.6× at 200% zoom on a 1280px window, as a body size stepped up by a media query does (house bar, not WCAG) | §3.1.1 (house) |
| MT-MEASURE-CH | LOW | Measure set in `ch` or a rule-of-thumb `em`: verify with `measure-line.js` | §2.1.2 |
| MT-MEASURE-SHORT | LOW | Reading text under 40 characters per line on a viewport 768px or wider | §2.1.2 |
| MT-FFS | LOW | `font-feature-settings` for figures or caps where `font-variant-*` exists | `css-modern.md` |
| MT-LS-PX | LOW | `letter-spacing` in `px` | §2.1.6 |
| MT-PHYSICAL | LOW | Physical sides (`margin-left`, `text-align: right`...) in text layout; HIGH with `--rtl`. `left: 50%` with `translate(-50%)` centres and is exempt | `logical-and-language.md` |
| MT-WIDOWS | LOW | `widows`/`orphans` of 1 (2 is the CSS initial value) | §2.4.8 |
| MT-FONT-DISPLAY | LOW | `@font-face` without `font-display`, or with `block` or `auto` (text hidden for up to 3 seconds); a face with only `local()` sources is exempt. Rendered: the stylesheets the page can read | `taste.md` |
| MT-HEADING-RUNT | LOW | A heading's last line is one word (ruby annotations not counted) | §2.4.8 (convention) |
| MT-SIZE-COUNT | LOW | More than 8 distinct text sizes on one page | `taste.md` (convention) |
| MT-MINUS | LOW | Hyphen-minus before a number in text (`-12%`), in the source and in the rendered text | §2.4.6 |
| MT-RANGE | LOW | Hyphen in a number range (`1990-2004`), in the source and in the rendered text | punctuation |
| MT-QUOTES | LOW | Straight quotes and apostrophes in text, in the source and in the rendered text; rendered, also a mark that does not open quotes in the text's language (`“` in Finnish, Swedish or German, `„` in English; en, fi, sv, de and fr are judged) | punctuation, `logical-and-language.md` |
| MT-PUNCT | LOW | Two hyphens for a dash, three full stops for an ellipsis, `x` between numbers for `×`, straight quotes for primes (`5'11"`), `(c)` before a year or name, `(TM)` and `(R)` after a word, a breaking space after ¶ or § before a number; a flag such as `--verbose`, a hex `0x1F` and a Swiss `1'000` are exempt | punctuation, `taste.md` |
| MT-LANG | MEDIUM | `<html>` without `lang`; a `lang` that is not a language tag (`en_US`); rendered, text mostly in another script than its `lang` declares (20 letters or more, over 60%). Languages written in two scripts are exempt; Latin text under the wrong Latin-script language is listed as not verified | `logical-and-language.md` |
| MT-NUM-BREAK | MEDIUM | A price, a number and its unit or a price and its period broken across lines at 1280, 768, 375 or 320px (`29 €`, `250 GB`, `€29 / month`) | §2.4.6, §2.1.4 |
| MT-BOLD-SYNTH | MEDIUM | Bold drawn by thickening a lighter face: a sample drawn with and without `font-synthesis-weight: none` differs in ink | §2.1.9 |
| MT-ITALIC-SYNTH | MEDIUM | Italic drawn as a slanted roman, by the same ink test with `font-synthesis-style: none` | §2.1.9 |
| MT-OPSZ-OFF | LOW | `font-optical-sizing: none` on a face with an `opsz` axis (a sample changes width between two optical sizes) | §2.1.9, `taste.md` |
| MT-FONT-SWAP | MEDIUM | With the fonts refused, the fallback sets the first screen's text over 2.5% wider or narrower, or its lines over 1px taller or shorter, and text moves over 4px at 1280 or 375px. A metric-matched fallback is not reported for a line that rewraps by chance; `font-display: optional` is exempt | `taste.md`, `fallback-metrics.py` |
| MT-HEADING-ORDER | MEDIUM | A heading as large as and as heavy as or heavier than the nearest higher-level heading before it | Saltz (`screen-and-ui.md`) |
| MT-WEIGHT-THIN | MEDIUM | Reading text under weight 400; reports the WCAG ratio and APCA Lc | Latin, Saltz (`screen-and-ui.md`) |
| MT-CODE-XHEIGHT | LOW | Inline code x-height outside 0.90 to 1.10 of the surrounding text's | Latin (`screen-and-ui.md`) |
| MT-CODE-BOX | LOW | Boxed inline code collides with itself across lines | Latin (`screen-and-ui.md`) |
| MT-KERN-OFF | LOW | Kerning switched off: `font-kerning: none` or `"kern" 0`, or a rendered sample wider than with kerning on | Latin, §2.1.8 (`screen-and-ui.md`) |
| MT-CONFUSABLE | LOW | Reading face draws I and l alike (ink overlap 0.82 or more, house threshold) | Latin (`screen-and-ui.md`) |
| MT-FAMILY-COUNT | LOW | More than three typeface families rendered, code excluded | Saltz principle 43 (`screen-and-ui.md`) |
| MT-PAIR-XHEIGHT | LOW | Heading and text faces 5 to 15% apart in x-height (house bands) | Latin (`screen-and-ui.md`) |
| MT-HEADING-SPACE | LOW | Space above a section heading (h2 to h6) less than twice the space below it | Latin (`screen-and-ui.md`) |
| MT-DARK-HAIRLINE | LOW | Light text on dark under 18px with a stroke thinner than 0.45px (house threshold) | Saltz principle 6 (`screen-and-ui.md`) |
| MT-ICON-ALIGN | LOW | An icon's centre more than 1px from the middle of its label's capitals | Latin (`screen-and-ui.md`) |
| MT-TABULAR | MEDIUM | A table number column whose 1 and 0 differ in width by more than 2% | §3.2.1 (`product-ui.md`) |
| MT-TRUNCATE | LOW | Text cut by an ellipsis, clip or line clamp with no visible way to read it (a title does not count); HIGH when the cut appears only at 200% zoom (WCAG 1.4.4) | `product-ui.md` |
| MT-NUM-ALIGN | LOW | A number column of mixed lengths not aligned at the end | convention (`product-ui.md`) |
| MT-CAPS-TRACKING | LOW | Capitals under 20px with no positive letter-spacing; `text-transform: uppercase` without `letter-spacing` in the source. Cased letters only (caseless scripts have no capitals), one typed word of five capitals or fewer is an acronym, code is exempt | §2.1.6 (`product-ui.md`) |
| MT-CAPS-TEXT | MEDIUM | Running text in capitals: more than 60 capital letters rendered, or `text-transform: uppercase` on a paragraph, list item or quotation in the source. The fix is lower case, not tracking | `taste.md` (`product-ui.md`) |
| MT-UI-SIZE | LOW | Interface text under 12px (house floor; 0.01px rounding allowed) | house (`product-ui.md`) |
| MT-BASELINE-DRIFT | MEDIUM | With `--baseline <unit>` only (a length or a custom property, checked at 1280, 768 and 375px, in `--baseline-scope` if given): a text block's first or last baseline more than 1px (`--baseline-tolerance`) off the grid, origin found from the page | §2.2.2, strict baseline grid |

Anything a check cannot compute is listed under **Not verified**, never passed
in silence: colours it cannot read, opacity that fades text and ground
together, container units and fluid sizes with units the linter cannot evaluate
(`lh`, `cap`), text in shadow roots and iframes, stylesheets behind `@import`
the page cannot read, indented Sass, interpolated parts of class expressions and
stylesheets lite mode cannot open. Disabled controls are exempt from
MT-CONTRAST (WCAG 1.4.3); contrast is also measured in the dark colour scheme.

A rule the tools do not cover (pairing, hierarchy, emphasis, rhythm) still goes
in the same table under the closest section number, with the kind stated.
