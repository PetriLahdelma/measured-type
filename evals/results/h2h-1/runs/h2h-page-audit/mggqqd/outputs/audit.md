# Typography audit: Release notes 4.2

Files audited: `page.html` + `page.css`.
Deliverables: `page.fixed.css` (corrected stylesheet) and `page.fixed.html` (corrected markup, links `page.fixed.css`). `page.html` and `page.css` are untouched.

## Context and method

This is a reading surface: a changelog whose reader needs to learn what changed and, above all, not miss the compatibility warning. Stability, measure and scanability come first; the display type has no persuasive job.

The incumbent identity (Verdana, near-black on white, grey note panel, ruled table) is treated as authoritative and kept. The fix changes how it is used, not what it is.

Evidence comes from rendering both versions in headless Chromium at 320, 375, 768, 1280 and 1920 px and reading computed styles and per-line character counts with a script (`_scratch/measure.js`, screenshots in `_scratch/`). A mechanical lint for type issues was run before and after.

## Findings

Severity: **P0** content lost or unreadable, **P1** WCAG AA failure or major reading problem, **P2** clear quality problem, **P3** polish.

### P0. The compatibility warning is clipped

`.callout { height: 5em; overflow: hidden; }`

The callout holds the most important sentence on the page, and a fixed height cuts it off. Measured content height vs box height: 172 px vs 99 px at 375 px (the text stops mid-sentence at "or keep"), 106 px vs 99 px at 768 to 1920 px (the last line is half hidden). Any font fallback, zoom or translation makes it worse. There is no scroll affordance, so the loss is silent.

Fix: remove the height and overflow; the panel grows with its text. The paragraph's bottom margin inside the panel is zeroed so padding is even on all sides.

### P0. Title lines collide

`h1 { font-size: 6vw }` inherits `line-height: 22px` from `body`.

At 1280 px the title is 76.8 px on a 22 px line (ratio 0.29) and wraps to two lines, so "4.2" is drawn on top of "Release". At 1920 px it is 115 px (ratio 0.19). Any wrap overlaps.

Fix: unitless line heights for every role (title 1.15) so leading follows the size.

### P1. Title size tracks the viewport, not the reader

`6vw` gives 22.5 px at 375 px, smaller than or equal to the 22 px section heading, so the hierarchy collapses on phones. On a wide monitor it reaches 115 px, poster scale for a document title. Because it is pure `vw`, increasing the browser's text size does nothing to it (WCAG 1.4.4 Resize Text).

Fix: `clamp(1.875rem, 1.45rem + 1.6vw, 2.5rem)`: 30 px on phones, 40 px max on desktop, always clearly above the 22 px section heading. The `rem` terms make it follow the reader's text size setting.

### P1. Lead paragraph breaks out of the column

`.lead { width: 1100px; max-width: none; }`

The lead is 1100 px wide regardless of viewport: ~113 characters per line, horizontal page scroll at every width up to 1382 px (document 1124 px wide on a 375 px phone). It is also the paragraph most people read in full.

Fix: drop the width; the lead sits in the reading column at 18 px and measures about 56 characters per line.

### P1. Metadata line fails contrast and is undersized

`.meta { color: #8a8a8a; font-size: 13px; }` on white: 3.45:1, below the 4.5:1 required for text this size (WCAG 1.4.3).

Fix: `#595959` (7.0:1) at 14 px (`0.875rem`) with 1.5 leading. It still reads as secondary through size and tone, without being faint.

### P1. Fixed pixel sizes and pixel leading ignore the reader's settings

Every size is in `px` and the body sets `line-height: 22px`, which is inherited unchanged by the 18 px lead (ratio 1.22) and the 22 px heading (ratio 1.0). A reader who raises the browser's default font size gets no change at all. Measured by doubling the root size: original sizes stay at 76.8 / 22 / 18 / 15 / 13 px; the fixed sheet scales to 67 / 44 / 36 / 32 / 28 px with no clipping and no page scroll.

Fix: all sizes in `rem`, all line heights unitless, defined once as role tokens.

### P1. Justified text without hyphenation

`p { text-align: justify; }`

On narrow screens this opens wide rivers ("their    history.    Existing    projects    are" at 375 px), and it is applied to the small metadata line too. Justification without hyphenation is not workable at these measures.

Fix: `text-align: start` with `text-wrap: pretty`, which also pulls "this" down beside the lone last word "version." in the lead.

### P1. Body measure too long

`.content { max-width: 75ch; }` sounds right, but `ch` is the width of a zero, and Verdana is wide with narrow lowercase relative to its digits: the measured result was ~91 characters per line of real prose.

Fix: `max-width: 58ch`, measured at 72 characters average, 74 maximum per body line at desktop widths. The rem-based side padding is unchanged.

### P1. Table forces page-wide horizontal scroll on phones

`th, td { white-space: nowrap; }` on a five-column table makes it 890 px wide, so on a phone the whole page scrolls sideways, taking the text column with it.

Fix (markup + CSS): the table sits in a scroll container (`.table-scroll`) so only the table scrolls on narrow screens, and the page does not. The container is focusable, labelled by the "Exports" heading and has a visible focus outline so keyboard users can scroll it. Header cells may wrap; data cells stay on one line. At 768 px and above the table fits the column with no scrolling.

### P2. Table figures are hard to compare

All cells are left-aligned, so "4.8 MB" and "220 MB" do not line up, and the header row carries the same hairline as the body rows.

Fix: numeric columns right-aligned (header and data) with `tabular-nums lining-nums`, so magnitudes and units stack; header cells bottom-aligned with a darker rule under them; outer cell padding removed so the table edges line up with the text column. Size 15 px with 1.4 leading, one step below body as a data role.

### P2. Body size below the reading floor

15 px body with 22 px leading. Verdana's large x-height helps, but 16 px is the ordinary web floor and the long measure needed more leading anyway.

Fix: `1rem` (16 px) with 1.6 leading, tuned for Verdana's width and a ~70 character line.

### P2. Callout has no typographic entry point or semantics

The warning differs from body text only by a grey ground. Nothing tells a scanning reader, or a screen reader, that it is a warning.

Fix (markup): `role="note"` on the panel, and its first sentence (existing copy, unchanged) set in `<strong>` as a run-in lead. No words were added.

### P2. Headings: tight leading and unbalanced breaks

`h2` sits on a 22 px line at 22 px. Neither heading balances its lines.

Fix: section heading 1.3 leading, `text-wrap: balance` on both headings. Title tracking tightened slightly (-0.015em) because bold Verdana sets loose at display sizes.

### P3. Fallback and page end

The stack was `Verdana, sans-serif`. Where Verdana is missing (most Linux and Android), the generic sans is much narrower and the measure shifts. Fix: `Verdana, "DejaVu Sans", "Bitstream Vera Sans", Geneva, sans-serif`; DejaVu Sans descends from Bitstream Vera and keeps Verdana-like proportions. The page also ended flush against the table; it now has 4rem of bottom padding. Selection colour is set from the page's own ink and ground.

## Role system in `page.fixed.css`

| Role | Size | Leading | Notes |
|---|---|---|---|
| Title | clamp 1.875rem to 2.5rem (30 to 40 px) | 1.15 | bold, -0.015em, balanced |
| Section | 1.375rem (22 px) | 1.3 | bold, balanced, 2.5rem above / 0.5rem below |
| Lead | 1.125rem (18 px) | 1.55 | |
| Body | 1rem (16 px) | 1.6 | left aligned, pretty wrap, ~70 ch |
| Meta | 0.875rem (14 px) | 1.5 | `#595959`, 7.0:1 |
| Data | 0.9375rem (15 px) | 1.4 | tabular lining figures, numbers right aligned |

One family, two weights (regular and bold, both native to Verdana). Size, weight, tone and space carry the hierarchy together. Values are custom properties named by role.

## Markup changes (`page.fixed.html`)

Copy is unchanged. Only these edits:

1. Stylesheet link points to `page.fixed.css`.
2. Callout: `role="note"`; first sentence wrapped in `<strong>`.
3. `id="exports"` on the Exports heading.
4. Table wrapped in `<div class="table-scroll" role="region" aria-labelledby="exports" tabindex="0">`.
5. `scope="col"` on the header cells.

## Verification (rendered, Chromium)

| Check | Before | After |
|---|---|---|
| Horizontal page scroll at 375 / 768 / 1280 px | 1124 / 1126 / 1382 px wide | none at 320 to 1920 px |
| Callout clipped | yes at every width | no |
| Title size at 375 / 1280 / 1920 px | 22.5 / 76.8 / 115 px | 30 / 40 / 40 px |
| Title leading ratio | 0.98 to 0.19, lines overlap | 1.15 |
| Body characters per line (desktop) | ~91 | 72 avg, 74 max |
| Lead characters per line (desktop) | ~113 | ~56 |
| Meta contrast | 3.45:1 | 7.0:1 |
| Root text size doubled | nothing scales | every role scales, no clipping |
| Table at 375 px | page scrolls | table scrolls inside its region |
| Mechanical type lint | 1 finding (tight leading) | 0 findings |

## Left for a later pass

- The table's before/after pairs could be grouped under two-level headers (Size: before, after; Export time: before, after) to shorten the header text. That restructures the data, so it was not done here.
- A `<caption>` would describe the table for assistive tech beyond the region label; it needs new copy from the authors.
- At 320 px the title balances to "Release / notes 4.2", which is acceptable; no forced break was added.

Two-line summary:
Typography audit found a clipped warning callout, overlapping title lines, a 1100 px lead, 3.45:1 metadata, justified rivers, a ~91-character measure and a table that scrolled the whole page.
Fixed in page.fixed.css with a rem role scale on Verdana (16/1.6 body at ~72 ch) plus small markup changes in page.fixed.html; verified at 320 to 1920 px with zero lint findings.
