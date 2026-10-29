# Typography audit: Release notes 4.2 (`page.html` + `page.css`)

## Method

- Static pass over `page.css` and `page.html`, then the rendered page in Chromium (Playwright) at 320, 375 and 1280 CSS px, at 200% and 500% zoom and under the WCAG 1.4.12 text-spacing override (line-height 1.5, paragraph spacing 2em, letter-spacing 0.12em, word-spacing 0.16em).
- Characters per line counted on full rendered lines (not inferred from `ch`).
- The font file that actually rendered (macOS `Verdana.ttf` and `Verdana Bold.ttf`) inspected with fontTools: static, default figures are lining and tabular, GSUB holds only `locl`, no GPOS. So there are no oldstyle figures, no small caps and no case forms to switch on.

## Biggest single problem

At 1280px the page title overprints itself. Body `line-height: 22px` is a fixed length, so the 76.8px `h1` inherits a 22px line; it wraps ("4.2" drops to a second line) and the two lines land on top of each other. At 320px the same `6vw` title shrinks to 19.2px, smaller than the 22px `h2` below it. Fixing the line-height unit and the title size restores the whole hierarchy.

## Findings (original page)

| Severity | Rule | Location | Measured | Fix |
|---|---|---|---|---|
| HIGH | Leading as a fixed length; lines overlap (Bringhurst §2.2.1) | `page.css:1` `body { line-height: 22px }` inherited by `h1` (`:3`), `h2` (`:4`), `.lead` (`:5`) | `h1` 76.8px type on a 22px line, 2 lines in a 44px box: glyphs overprint at 1280px. `h2` 22/22 = 1.0, `.lead` 18/22 = 1.22 | `body { line-height: 1.5 }` (unitless); `h1 { line-height: 1.15 }`; `h2 { line-height: var(--line) }` (24px on 20px = 1.2) |
| HIGH | Title size cannot zoom and inverts the hierarchy (WCAG 1.4.4; §3.1.1) | `page.css:3` `h1 { font-size: 6vw }` | grows 1.00× at 200% and at 500% zoom; 19.2px at 320px (smaller than the 22px `h2`), 22.5px at 375px, 76.8px at 1280px | `--text-title: clamp(2rem, 1.75rem + 1vi, 2.5rem)`: 32 to 40px, 1.72× at 200% on a 1280px window, 4× at 500% |
| HIGH | Sideways scrolling at every width (WCAG 1.4.10; §2.1.2) | `page.css:5` `.lead { width: 1100px; max-width: none }`; `page.css:10` `white-space: nowrap` on all cells (table 890px wide) | page is 1124px wide in a 320px and a 375px viewport, and 1382px wide in a 1280px window | remove the `width`; one `max-inline-size` on the container; table wrapped in a focusable scroll region (`.table-scroll { overflow-x: auto }`), header text set shorter by grouping (see table row below) |
| HIGH | Fixed-height box clips the warning (WCAG 1.4.12) | `page.css:8` `.callout { height: 5em; overflow: hidden }` | without any override: 95 of 194px of text hidden at 320px, 73 of 172px at 375px, 7px at 1280px. Under the spacing override: 23px clipped at 1280px. This is the one paragraph that tells readers what breaks | delete `height` and `overflow`; `padding-block: calc(0.5 * var(--line)); padding-inline: 1em` |
| HIGH | Secondary text below AA contrast (WCAG 1.4.3) | `page.css:6` `.meta { color: #8a8a8a }` on `#fff` | 3.45:1 at 13px (needs 4.5:1) | `--ink-muted: #595959` (7.0:1) |
| MEDIUM | Measure too long (§2.1.2, measured) | `page.css:2` `.content { max-width: 75ch }`; `.lead` escapes it | body `p` 91.2 characters per line (90 to 92); `.lead` 113 (110 to 116); `.meta` 100; callout 85. In Verdana `1ch` (the zero) is 0.636em against an average character of 0.505em, so `75ch` sets about 91 | `.content { max-inline-size: 36em }`, counted after the fix: body 67.7 (65 to 70), lead 51.8, meta 68, callout 59.3 |
| MEDIUM | Justified sans with no hyphenation (§2.1.3, §2.4.1) | `page.css:7` `p { text-align: justify }` | every paragraph justified, `hyphens: manual`; rivers on a phone line of about 36 characters | `text-align: start; hyphens: auto; hyphenate-limit-chars: 6 2 3; text-wrap: pretty` |
| MEDIUM | Sizes in `px` and below the reading floor (§3.1.1; convention) | `page.css:1` body 15px, `:5` lead 18px, `:6` meta 13px, `:4` h2 22px | five one-off sizes (13, 15, 18, 22, 76.8) that ignore the reader's default size; reading text at 15px and 13px | `rem` tokens: body and meta `1rem`, lead `clamp(1.125rem, 1.05rem + 0.4vi, 1.25rem)`, h2 `1.25rem`, h1 as above. Meta is now told apart by color and position rather than by a smaller size |
| MEDIUM | Comparison table does not align its numbers (§3.2.1; convention) | `page.css:10` `text-align: left` on all cells; `page.html:20-23` | sizes and times left-aligned, so "4.8 MB" and "220 MB" do not line up by place value; four long headers ("Average size before"...) force the table to 890px | numbers end-aligned with `font-variant-numeric: lining-nums tabular-nums` (Verdana already defaults to these; declared for fallback faces); headers grouped into "Average size" and "Export time" over "Before / After"; row headers `th scope="row"`; visible `caption` |
| LOW | One-word last line in the title (convention) | `page.html:11` `h1` at 1280px | "4.2" alone on line 2 | `Release notes&nbsp;4.2` plus `text-wrap: balance` on headings |
| LOW | Numbers and units can split (§2.4.6) | `page.html:13,16,22-23` | "4.8 MB", "12 seconds", "29 October", "version 4.2" joined by plain spaces | `&nbsp;` in each; `white-space: nowrap` kept on cells as a second guard |
| LOW | Vertical spacing unrelated to the leading (§2.2.2; convention) | `page.css:3,4,7,9` margins of 8, 16 and 32px against a 22px line; headings carry bottom margins that can collapse into the next block's | gaps do not relate to the line | one body line `--line: calc(1rem * 1.5)` (24px); top margins only; 2 lines above `h2`, half a line below. Measured after the fix: 48px above and 12px below each `h2`, at 320 and 1280px |
| LOW | Measure set in `ch` by rule of thumb (§2.1.2) | `page.css:2` | 75ch gave 91 characters | set in `em`, then counted (row above) |
| LOW | Physical sides (convention) | `page.css:2,10` `margin: 0 auto`, `padding: 0 24px`, `text-align: left` | LTR-only layout | `margin-inline`, `padding-inline`, `text-align: start`, `border-block-end`; `dir="ltr"` on `<html>` |
| LOW | Fallback face changes the measure (preference) | `page.css:1` `Verdana, sans-serif` | where Verdana is missing (most Linux and Android) a narrower generic sans sets far more than 67 characters in the same box | `Verdana, "DejaVu Sans", "Bitstream Vera Sans", Geneva, sans-serif` (close in width to Verdana) |
| LOW | No print rules (convention) | `page.css` | none | `p { widows: 3; orphans: 3 }`, `h2 { break-after: avoid }`, no breaks inside callout or table |
| LOW | Display tracking (preference) | `h1` | Verdana Bold is loosely spaced at 40px | `letter-spacing: -0.01em` on `h1` only, checked on the rendered word |

Not applicable, checked: oldstyle figures in prose and small caps for acronyms. The served Verdana has neither (no `onum`, `smcp` or `c2sc`), so none is requested; `font-synthesis-small-caps: none` guards against faked small caps if a later edit asks for them.

Verdict (original): **Block** (5 HIGH).

## What changed

`page.fixed.css` replaces `page.css`:

- A small scale with named roles in `rem`: body 16px, lead 18 to 20px, `h2` 20px bold, `h1` 32 to 40px. Only the title and the lead are fluid, each with a narrow range and a `rem` term.
- Unitless body leading 1.5; one body line (`--line`, 24px) sets every gap. Top margins only, so nothing collapses.
- Container `max-inline-size: 36em`, centered with `margin-inline: auto`; reading text ragged, hyphenated with limits, `text-wrap: pretty`.
- Callout grows with its text. Meta at AA and above.
- Table: tabular lining figures, end-aligned numbers, grouped headers with a short rule under each group, scrolls inside its own region on narrow screens while the page itself never scrolls sideways.

`page.fixed.html` was needed because some fixes live in the markup: it links `page.fixed.css`, binds numbers to units and the title's last two words with `&nbsp;`, wraps the table in `<div class="table-scroll" role="region" aria-labelledby="export-figures" tabindex="0">` so keyboard users can scroll it, adds a `caption` that names that region, groups the header cells (`scope="colgroup"`, `scope="col"`, `scope="row"`) and sets `dir="ltr"`. Text content is otherwise unchanged; the header text "Average size before" is now read as "Average size, Before" through the grouped headers.

## Verification of the fix (Chromium)

- Static pass and rendered pass on `page.fixed.html`: no findings.
- No sideways scroll at 320, 375 or 1280px; the table scrolls inside its region at 320px (525px of table in a 280px box).
- Characters per line at 1280px: body 67.7, lead 51.8, meta 68, callout 59.3.
- No clipping under the 1.4.12 spacing override.
- `h1` 40px at 1280px, 32px at 320px; grows 1.72× at 200% zoom.

Verdict (fixed): **Approve**.

Not verified: Safari and Firefox (hyphenation dictionaries differ; `text-wrap: pretty` is not in Firefox; Safari ignores `hyphenate-limit-chars`, so its limits there fall back to defaults); rendering with the DejaVu or Geneva fallbacks; Verdana on Windows; how screen readers announce the grouped table headers. The rule under each header group is drawn with a physically placed background (`right bottom`), so it would need flipping in a right-to-left edition.
