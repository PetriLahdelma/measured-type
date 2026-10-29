# Typography audit: page.html + page.css (Release notes 4.2)

Method: static read of `page.css` and `page.html`, then the page rendered in Chromium (Playwright) at 1280px, 375px and 320px, at 200% and 500% zoom, and under the WCAG 1.4.12 text-spacing override. Characters per line were counted on rendered full lines, not estimated from `ch`. The served face is the system Verdana (macOS `Verdana.ttf` / `Verdana Bold.ttf`); its tables were inspected with fontTools.

Font facts that shaped the fixes (measured):

- Verdana's default digits are already tabular lining. It has no `onum`, `tnum`, `smcp`, `c2sc` or `case` features and no GPOS kerning. So: no oldstyle figures in prose (cannot be had), no true small caps for `PDF`/`PNG` (leave them as capitals; never let the browser fake them), and `tabular-nums` on the table is a guard for fallback faces only.
- Average character width is 0.50 to 0.52em against a zero of 0.636em, so `75ch` sets far more than 75 characters.

Text kinds on the page: reading text (lead, body paragraphs, callout), display (h1, h2), interface/data (meta line, table).

## Findings (original page)

| Severity | Area | Location | Measured | Fix (in page.fixed.css / page.fixed.html) |
|---|---|---|---|---|
| HIGH | Text cannot zoom (WCAG 1.4.4) | `page.css:3` `h1 { font-size: 6vw }` | 76.8px at 1280px; grows 1.00× at 200% zoom and 1.00× at 500% | `--text-h1: clamp(2rem, 1.75rem + 1vi, 2.5rem)`: 32 to 40px, a 1.25× range, about 1.7× at 200% zoom on a 1280px window |
| HIGH | Page scrolls sideways (WCAG 1.4.10) | `page.css:5` `.lead { width: 1100px }`; `page.css:10` `white-space: nowrap` on every table cell | Page is 1382px wide in a 1280px window, 1124px wide at 375px and at 320px (400% zoom). The table alone is 890px | Fixed width removed (the lead takes the column's measure). Table wrapped in a focusable, labelled scroll region (`.table-scroll`, `overflow-x: auto`) so only the table scrolls on phones; headers may wrap. Result: page width = viewport at 1280, 375 and 320 |
| HIGH | Clipped text under user spacing (WCAG 1.4.12) | `page.css:8` `.callout { height: 5em; overflow: hidden }` | 23px of the warning text cut off under the override; it is the most important sentence on the page | No height, no overflow clipping; padding in body-line units; last child's margin removed so the box hugs its text |
| HIGH | Contrast (WCAG 1.4.3) | `page.css:6` `.meta { color: #8a8a8a }` | 3.45:1 on white, needs 4.5:1 | `--ink-muted: #595959` (7.0:1) |
| MEDIUM | Leading as a fixed length | `page.css:1` `body { line-height: 22px }` | Inherited as 22px by everything: h1 is 76.8px on 22px leading, so its two lines overprint each other (visible in the 1280px render); h2 22/22 (1.0); lead 18/22 (1.22) | Unitless `line-height: 1.6` on body (Verdana's large x-height wants open leading); h1 `1.15`; lead `1.5`; table `1.4`; h2 set to exactly one body line (25.6px) so it stays on the rhythm |
| MEDIUM | Measure too long | `page.css:2` `.content { max-width: 75ch }`; `.lead` at 1100px | Body 91 characters per line (90 to 92); callout 85; meta 100; lead 113 (110 to 116) | `.content { max-inline-size: 35em }`, counted in Chromium: body 65 per line (60 to 70), callout 56, lead 54 |
| MEDIUM | Justified without hyphenation | `page.css:7` `p { text-align: justify }` | Applies to lead, meta, body and callout; visible rivers and stretched word spaces at the old measure, and it would be far worse on a phone (about 30 characters per line) | `text-align: start` (ragged suits a sans at this measure), `text-wrap: pretty`; below 30em, `hyphens: auto` with `hyphenate-limit-chars: 6 3 3` |
| MEDIUM | Sizes in px | `page.css:1, 4, 5, 6` (15px, 22px, 18px, 13px) | Override the reader's default size setting | All sizes are `rem` tokens: meta 1rem, body 1rem, lead 1.125rem, h2 1.375rem, h1 fluid 2 to 2.5rem |
| MEDIUM | Reading text below the 16px floor | body 15px, `.meta` 13px | 15px and 13px | Body and meta at 1rem; the meta line is distinguished by colour and position, not by shrinking it |
| MEDIUM | Vertical spacing off the beat | `page.css:3, 4, 7` margins 32/8/16px against a 22px line | Gaps of 8px under h2 and 16px between paragraphs, unrelated to the line | One body line `--line = 1rem × 1.6 = 25.6px`; paragraphs `0 0 1 line`; h2 `1.5 lines` above, `0.5 line` below (rendered: 38px and 13px); h1 `1 line` above, `0.5` below; callout and table end with one line |
| MEDIUM | Data table set like text | `page.css:10` `text-align: left` on all cells; repeated headers | Figures left-aligned so magnitudes do not line up; 5 long one-line headers force an 890px table | Figure columns `text-align: end` with `font-variant-numeric: lining-nums tabular-nums`; headers grouped into "Average size" and "Export time" over "Before / After" (with `colgroup` and `scope`); row labels are `th scope="row"` at regular weight; table now 513px, inside the column |
| LOW | Number and unit can split | `page.html` table cells and "version 4.2" | `4.8 MB`, `12 seconds`, `version 4.2`, `notes 4.2`, `29 October` use plain spaces | No-break spaces in the markup (`4.8&nbsp;MB` etc.); `white-space: nowrap` on data cells as an extra guard |
| LOW | Heading runt | `h1` at 1280px | Last of 2 lines is one word ("4.2") | `text-wrap: balance` on h1/h2 and `notes&nbsp;4.2` |
| LOW | Physical sides | `page.css:2, 10` `margin: 0 auto`, `padding: 0 24px`, `text-align: left` | LTR-only properties | Logical properties throughout (`margin-inline`, `padding-inline`, `max-inline-size`, `border-block-end`, `text-align: start/end`); `dir="ltr"` on `<html>` |
| LOW | Fallback changes the measure | `page.css:1` `Verdana, sans-serif` | Where Verdana is missing (Linux, Android) the generic sans is much narrower, so a 35em column would set 75+ characters | Stack `Verdana, "DejaVu Sans", "Bitstream Vera Sans", Geneva, sans-serif` (faces of similar width) |
| LOW | Synthesis and kerning | body | No guard against browser-faked small caps | `font-synthesis-small-caps: none`, `font-kerning: normal`; iOS landscape text inflation disabled with `text-size-adjust: 100%` |

Kinds: the four HIGH rows are standards (WCAG). Measure, leading, justification and the size floor are measured or established conventions. Grouped table headers, the meta treatment, the 1.6 body leading and the fallback stack are judgment calls the team can decline.

## Result after the fix

Re-run on `page.fixed.html` + `page.fixed.css`:

- Source check: no findings.
- Rendered check (Chromium, 1280 / 375 / 320px, 200% and 500% zoom, text-spacing override): no findings. Contrast passes everywhere, nothing clips, page width equals the viewport at every size; only the table region scrolls at 320px (table 473px in a 272px column), which WCAG 1.4.10 permits for data tables.
- Measure: body 65 characters per line, callout 56, lead 54.
- Rhythm: gap above each h2 38px (1.5 lines), below 13px (0.5 line).

## Markup changes (page.fixed.html)

Needed, so a corrected copy links `page.fixed.css`; `page.html` is untouched.

1. Table wrapped in `<div class="table-scroll" role="region" aria-labelledby="exports" tabindex="0">` so it can scroll by itself and keyboard users can reach the scroll.
2. Table headers regrouped (`colgroup`, two header rows, `scope="colgroup"` / `scope="col"`, row labels as `th scope="row"`).
3. No-break spaces between numbers and units, in `version 4.2`, `notes 4.2` and `29 October`.
4. `role="note"` on the callout; `dir="ltr"` on `<html>`; `id="exports"` on the Exports heading.

Verdict: Approve (all HIGH findings fixed and re-measured; no findings remain)

Not verified: Safari and Firefox rendering and hyphenation (Chromium only); real Android/Linux rendering with DejaVu Sans as the fallback; screen-reader announcement of the grouped table headers.
