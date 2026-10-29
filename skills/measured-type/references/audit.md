# Auditing: report format and rule catalog

Use this file when asked to review, audit or critique typography, and whenever
`scripts/lint-css.js` or `scripts/page-audit.js` reports findings. Both scripts
emit the rule IDs below, so a finding from the tool and a finding from reading
the code look the same in the report.

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

- **Block** when any HIGH finding remains.
- **Approve** otherwise; MEDIUM and LOW findings stay in the table as work to do.

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
| MT-REFLOW | HIGH | Page scrolls sideways at 320 CSS px (400% zoom of 1280) or at 375px, or text runs past the edge where hidden overflow stops the scroll | WCAG 1.4.10, §2.1.2 |
| MT-ZOOM-VW | HIGH | `font-size` from `vw`/`vi` with no `rem`/`em` term, or any rendered text that does not reach 2× by 500% zoom | WCAG 1.4.4, §3.1.1 |
| MT-VIEWPORT-ZOOM | HIGH | `user-scalable=no` or `maximum-scale` below 2 in the viewport meta | WCAG 1.4.4 |
| MT-ROOT-PX | HIGH | `font-size` in `px` on `html` or `:root`: overrides the reader's default (a percentage under 100% is LOW) | §3.1.1 |
| MT-CONTRAST | HIGH | Text contrast under 4.5:1 (3:1 for 24px, or 18.66px bold), translucent grounds laid over what is beneath them | WCAG 1.4.3 |
| MT-TEXT-SPACING | HIGH | Text the 1.4.12 spacing override pushes out of its box (boxes that already clip, such as screen-reader text or a closed panel, are hidden by design) | WCAG 1.4.12 |
| MT-MEASURE-LONG | MEDIUM | Reading text averages over 75 characters per full line | §2.1.2 (measured) |
| MT-LH-LENGTH | MEDIUM | `line-height` as a length on an element that has children | §2.2.1 |
| MT-LH-TIGHT | MEDIUM | Unitless `line-height` under 1.3 on body text | §2.2.1 |
| MT-JUSTIFY | MEDIUM | `text-align: justify` without `hyphens: auto` | §2.1.3, §2.4.1 |
| MT-WIDTH-PX | MEDIUM | Fixed `width` in `px` on a text container | WCAG 1.4.10, §2.1.2 |
| MT-FONT-PX | MEDIUM | Body or paragraph `font-size` in `px` | §3.1.1 |
| MT-FONT-FALLBACK | MEDIUM | Rendered face is not the first family declared: the web font failed or lacks glyphs | measured |
| MT-SIZE-FLOOR | MEDIUM | Reading text below 16px | taste (convention) |
| MT-SMALLCAPS-SYNTH | MEDIUM | Small caps requested with synthesis allowed: fake small caps if the font lacks `smcp` | §2.1.9, §3.2.2 |
| MT-ZOOM-RANGE | LOW | Fluid range over 1.4× (MEDIUM over 2.5×, the zoom heuristic) | §3.1.1 |
| MT-ZOOM-GROWTH | LOW | Heading grows under 1.6× at 200% zoom on a 1280px window (house bar, not WCAG) | §3.1.1 (house) |
| MT-MEASURE-CH | LOW | Measure set in `ch` or a rule-of-thumb `em`: verify with `measure-line.js` | §2.1.2 |
| MT-MEASURE-SHORT | LOW | Reading text under 40 characters per line on a viewport 768px or wider | §2.1.2 |
| MT-FFS | LOW | `font-feature-settings` for figures or caps where `font-variant-*` exists | `css-modern.md` |
| MT-LS-PX | LOW | `letter-spacing` in `px` | §2.1.6 |
| MT-PHYSICAL | LOW | Physical sides (`margin-left`, `text-align: right`...) in text layout; HIGH with `--rtl`. `left: 50%` with `translate(-50%)` centres and is exempt | `logical-and-language.md` |
| MT-WIDOWS | LOW | `widows`/`orphans` of 1 (2 is the CSS initial value) | §2.4.8 |
| MT-FONT-DISPLAY | LOW | `@font-face` without `font-display` | `taste.md` |
| MT-HEADING-RUNT | LOW | A heading's last line is one word | §2.4.8 (convention) |
| MT-SIZE-COUNT | LOW | More than 8 distinct text sizes on one page | `taste.md` (convention) |
| MT-MINUS | LOW | Hyphen-minus before a number in text (`-12%`) | §2.4.6 |
| MT-RANGE | LOW | Hyphen in a number range (`1990-2004`) | punctuation |
| MT-QUOTES | LOW | Straight quotes in text | punctuation |
| MT-HEADING-ORDER | MEDIUM | A heading level as large as and as heavy as or heavier than the level above it | Saltz (`screen-and-ui.md`) |
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
| MT-TRUNCATE | LOW | Text cut by an ellipsis or line clamp with no title or accessible name; MEDIUM when the cut appears only at 200% zoom (WCAG 1.4.4) | `product-ui.md` |
| MT-NUM-ALIGN | LOW | A number column of mixed lengths not aligned at the end | convention (`product-ui.md`) |
| MT-CAPS-TRACKING | LOW | Capitals under 20px with no positive letter-spacing; `text-transform: uppercase` without `letter-spacing` in the source | §2.1.6 (`product-ui.md`) |
| MT-UI-SIZE | LOW | Interface text under 12px (house floor) | house (`product-ui.md`) |

Anything a check cannot compute is listed under **Not verified**, never passed
in silence: colours it cannot read, opacity that fades text and ground
together, container units, indented Sass, class lists built by expressions and
stylesheets lite mode cannot open. Disabled controls are exempt from
MT-CONTRAST (WCAG 1.4.3); contrast is also measured in the dark colour scheme.

A rule the tools do not cover (pairing, hierarchy, emphasis, rhythm) still goes
in the same table under the closest section number, with the kind stated.
