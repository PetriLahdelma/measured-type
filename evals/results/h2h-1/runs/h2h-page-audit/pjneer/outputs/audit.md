# Typography audit: Release notes 4.2 (`page.html` + `page.css`)

Deliverables:

- `page.fixed.css`: corrected stylesheet.
- `page.fixed.html`: corrected markup (links `page.fixed.css`). The markup had to change for two reasons: the table needs its own scroll container, and units and dates need non-breaking spaces.
- `measure.js`: Playwright script that prints computed size, line-height, tracking, alignment, characters per line, clipping and horizontal overflow per element. Run it as `node measure.js page.html` or `node measure.js page.fixed.html`.
- `shot-*.png`: full-page screenshots of the original at 1440px and the fix at 1440px and 320px.

## How this was checked

The page was rendered in Chromium with Verdana installed at 320, 768, 1440 and 2560px wide, at 1280px with 200% browser zoom, and at 1280px with the root font size raised to 32px to simulate a reader's larger default text. The Before column quotes the source. Measured numbers come from `measure.js`.

| Measurement (original) | 320px | 1440px | Root font 32px |
| --- | --- | --- | --- |
| Horizontal page scroll | 804px | 22px | 102px |
| `h1` size / line-height | 19.2px / 22px | 86.4px / 22px, 2 lines overlapping | 76.8px / 22px |
| Body text size | 15px | 15px | 15px (ignores reader setting) |
| Body characters per line | 37 | 93 | 93 |
| Lead width / characters per line | 1100px / 117 | 1100px / 117 | 1100px / 117 |
| Callout | 7 lines in a 75px box, text cut off | fits | fits |
| Table width | 890px in a 272px column | 890px in a 715px column | 890px |

## Findings

### Text is cut off or pushed off screen

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `page.css:8` (`.callout`), `page.html:16` | `height: 5em; overflow: hidden;` | No fixed height and no overflow clipping; `.callout > :last-child { margin-bottom: 0 }` so padding stays even | At 320px the warning wraps to 7 lines inside a 75px box and the end of the sentence disappears, with no way to reveal it. This is the migration warning readers most need. |
| HIGH | `page.css:5` (`.lead`) | `width: 1100px; max-width: none;` | Width removed so the lead follows the content column | The lead is 1100px wide at every viewport. It causes 804px of horizontal scrolling at 320px, still overflows at 1440px, and runs 117 characters per line. |
| HIGH | `page.css:10` (`th, td`), `page.html:19-25` | `white-space: nowrap` on every cell, table placed directly in the column | Table wrapped in `<div class="table-scroll" role="region" aria-label="…" tabindex="0">` with `overflow-x: auto`; headers may wrap (`text-wrap: balance`), values stay on one line | Five unbreakable headers made the table 890px wide, which pushed the whole page sideways at 320px and at 200% zoom. Now the table fits at 768px and up; below that it scrolls inside its own box and the page does not scroll. The region is focusable so keyboard users can scroll it. |

### Line-height

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `page.css:1` (inherited by `h1`, `h2`, `.lead`, `.meta`, all `p`) | `line-height: 22px` | Unitless per role: body `1.55`, lead `1.5`, caption `1.4`, `h2` `1.25`, `h1` `1.1`, table headers `1.3` | A pixel line-height is inherited as a fixed value, so it does not scale with the text. At 1440px the 86px `h1` wraps to two lines spaced 22px apart, and the lines print on top of each other and over the lead (see `shot-page-1440.png`). The 18px lead, which runs to 3+ lines, gets an effective 1.22. |

### Sizes, scale and heading hierarchy

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `page.css:3` (`h1`) | `font-size: 6vw` | `clamp(2rem, 1.5rem + 1.5vw, 2.5rem)` (32px to 40px) | A size set only in viewport units ignores browser zoom and the reader's font-size setting. It also swings from 19.2px at 320px, smaller than the 22px `h2` and barely above the 18px lead, so the page title ranks below its own section headings, up to 154px at 2560px. The `rem` floor and cap keep `h1` above `h2` at every width and let it grow with the reader's settings. |
| MEDIUM | `page.css:1-6` (`body`, `h2`, `.lead`, `.meta`) | `15px`, `22px`, `18px`, `13px` | A role-named scale in `rem`: caption `0.8125rem`, body `1rem`, lead `1.125rem`, title (`h2`) `1.5rem`, display (`h1`) clamped | Pixel sizes ignore the reader's default font size: with the root at 32px, body text stayed at 15px. Body text also sat below the 16px long-form default without a reason. Verdana already runs large, which argues for staying at 16px rather than going under it. Naming the steps makes each role one decision: size, line-height and tracking together. |

### Measure (line length)

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `page.css:2` (`.content`) | `max-width: 75ch` | `max-width: 56ch` | `ch` is the width of a zero, and Verdana's zero is wide compared with its average prose character, so 75ch produced 93 characters per line. 56ch measures 71 characters for body text, 62 for the lead and 62 in the callout, inside the 60 to 75 range. A fallback face recomputes `ch` for itself, so the cap adapts. The 13px meta line runs 80 characters over two lines; this is accepted because the text is only two lines of metadata. |

### Alignment and wrapping

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `page.css:7` (`p`, which includes `.lead`, `.meta` and the callout) | `text-align: justify` | `text-align: start; text-wrap: pretty` | Justified text without hyphenation stretches word gaps into rivers, worst in narrow columns (37 characters per line at 320px) and in the wide lead (see the gapped lines in `shot-page-1440.png`). Start alignment keeps word spacing even. `pretty` keeps a lone word off the last line. |
| LOW | `page.css:3-4` (`h1`, `h2`), `th` | Default wrapping | `text-wrap: balance` | Evens out a wrapped title ("Release / notes 4.2" at 320px) and multi-line table headers. |
| LOW | `page.css:1` (`body`) | None | `overflow-wrap: break-word` | Guards against a long word, file name or URL in future release notes escaping the column at 320px. |

### Letter-spacing

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `page.css:3-4` | No tracking on headings 24px and up | `h1` `-0.02em`, `h2` `-0.01em` | Large bold Verdana sets loose. Slight negative tracking in `em` tightens it in proportion to the size. Body text stays at `0`. |

### Numbers in the table

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `page.css:9-10`, `page.html:20-23` | Every column left-aligned; no numeric variant | `font-variant-numeric: tabular-nums` on the table; every column except the first aligns to `end`, header included | Before and after values are compared down each column. End alignment with equal-width digits lines up "4.8 MB" with "220 MB" and "7 seconds" with "61 seconds". Verdana's default figures are already equal width, but a fallback face may not be. |

### Contrast of secondary text

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `page.css:6` (`.meta`) | `color: #8a8a8a` on `#fff` at 13px (measured 3.4:1) | `#595959` (7.0:1), via `--color-text-muted` | At caption size a light gray is hard to read. The measured 3.4:1 is below the 4.5:1 that small text needs. |

### Punctuation and spacing in the copy

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `page.html:13`, `16`, `22-23` | Normal spaces in "29 October 2026", "version 4.2", "4.8 MB", "12 seconds" | `&nbsp;` between the number and its unit or label | Keeps a value and its unit on one line. The `nowrap` on table cells did this for the table only; the non-breaking spaces also cover the prose and let the headers wrap. |

### Rendering details

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `page.css:1` | `font-family: Verdana, sans-serif` | `Verdana, "DejaVu Sans", "Bitstream Vera Sans", Geneva, sans-serif` | Not a type change. On systems without Verdana (most Linux and Android), the generic `sans-serif` is usually much narrower with a smaller x-height. The added local faces share Verdana's proportions, so the measure and the visual size hold. |
| LOW | `page.css` (root) | No smoothing setting | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` on `html` | Set once on the root for consistent macOS rendering, never per component. |

## Checked and fine

- `lang="en"` is set on `<html>`. The page is single-direction and has no mixed-direction values.
- No `font-variation-settings`, `font-feature-settings`, `font-synthesis`, light weights, `px` letter-spacing, `user-select: none`, truncation, line clamps or underline overrides.
- The copy has no keyboard stand-ins: no straight quotes, `...` or `--`.
- Headings are `h1` then `h2` and now descend in size at every width (40/24px at desktop, 32/24px at 320px).
- There are no inputs, so the 16px iOS input rule does not apply.

## After the fix (measured)

| Measurement | 320px | 768px | 1440px | 200% zoom | Root font 32px |
| --- | --- | --- | --- | --- | --- |
| Horizontal page scroll | 0 | 0 | 0 | 0 | 0 |
| `h1` / `h2` size | 32 / 24px | 35.5 / 24px | 40 / 24px | 33.6 / 24px | 67.2 / 48px |
| Body characters per line | 34 | 71 | 71 | 71 | 71 |
| Lead characters per line | 29 | 62 | 62 | 62 | 62 |
| Callout clipped | no | no | no | no | no |
| Table | scrolls inside its region (280px of overflow) | fits | fits | fits | fits |

## Not verified

- Rendering in Safari and Firefox, including iOS Safari on a device. Only Chromium was run. `text-wrap: balance`/`pretty` are progressive enhancements, and browsers without them wrap normally.
- Rendering with the fallback faces (DejaVu Sans, a generic sans-serif) on a machine without Verdana, and the resulting characters per line.
- How a screen reader announces the scrollable table region.
- Forced-colors / high-contrast mode appearance of the callout background and table rules.

## Verdict

Original page: **Block**. Three HIGH issues: the callout clips its warning, the lead and the table force horizontal scrolling at 320px and 200% zoom, and the pixel line-height makes the heading overlap itself.

With `page.fixed.html` and `page.fixed.css`: **Approve**. No HIGH issues remain at any tested width or zoom level. The items under Not verified are still open.
