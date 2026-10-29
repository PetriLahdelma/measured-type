# Typography audit: Release notes 4.2 (page.html + page.css)

## Context

- **Medium:** a web page, read on screen at phone, tablet and desktop widths.
- **Audience and intent:** users and admins of a product. They want to find out what changed and whether they have to act before updating. The callout is the most important sentence on the page.
- **Language and script:** English, Latin script.
- **Roles present:** display title (h1), lead paragraph, metadata line, section headings (h2), running prose, a warning callout, and a small table of numbers comparing values before and after the release.
- **Literal text:** "4.2" (version), "29 October 2026" (date) and the table values with units ("4.8 MB", "12 seconds") are data. I did not change their characters. The prose has no straight quotes, dashes, ellipses or symbols that need changing.

## Evidence

I rendered both versions in headless Chromium (Playwright) at 320, 768, 1280 and 1920 px wide. For each one I recorded computed styles, the font the browser actually used (through the DevTools protocol), the number of characters on each rendered line (split per line using glyph rectangles), callout and table overflow, and page scroll width. I ran the same measurements again with the WCAG 2.2 text-spacing overrides applied (line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em). I also took full-page screenshots. The scripts and screenshots are in `scratch/`.

- Font in use: the system **Verdana** (regular and real Bold, no synthesized styles) for every role. It is not a webfont. Verdana's x-height is 0.545 em and its ten digits all share one advance width (1302/2048), so the figures are already tabular. The font has no U+2007 figure space or U+2008 punctuation space.
- Not verified: Safari, Firefox, Windows ClearType rendering, real-device zoom, and the fallback state on machines without Verdana (most Android and many Linux systems).

## Findings (original page)

```text
[MAJOR] h1: font-size 6vw gives 19.2px at 320px (smaller than h2 at 22px and barely above the 18px lead) and 115px at 1920px; vw-only sizing also does not grow with browser zoom -> font-size: clamp(1.75rem, 1.3rem + 2vw, 2.25rem), giving 28px on phones and 36px on desktop (rendered)
[MAJOR] h1 and all headings: body line-height is a fixed 22px, which every element inherits. At 1280px the 76.8px h1 has 22px leading, so "4.2" wraps onto the line below and overlaps the lead paragraph (screenshot) -> unitless line-height on body (1.45) and set display leading per role: h1 1.15, h2 1.25 (rendered)
[MAJOR] .lead: width: 1100px; max-width: none pushes the lead out of the text column. It produces 110-116 characters per line and horizontal page scrolling at every width below 1124px (scrollWidth 1124 at a 320px viewport) -> remove width and max-width so the lead follows the column. Now 52-59 characters per line at 18px (rendered)
[MAJOR] .callout: height: 5em plus overflow: hidden clips the compatibility warning at every viewport (content 106px in a 99px box on desktop, 194px in 99px at 320px), so the last line of the most important instruction is hidden. With text-spacing overrides it loses even more (257px of content) -> remove height and overflow and let the box grow; clear the bottom margin on the last paragraph inside it; add a 3px #767676 left rule so the callout still stands out where the pale tint is lost (high-contrast modes, poor screens) (rendered, also under text-spacing overrides)
[MAJOR] table: white-space: nowrap on every cell plus long repeated headers make the table 890px wide. It spills past the 715px text column even on desktop and forces the whole page to scroll sideways on phones -> group the headers ("Size (MB)" and "Time (s)" over "Before / After"), move units out of the cells, allow wrapping in row labels, wrap the table in a keyboard-focusable scroll region as a fallback, and on screens 30em or narrower use tighter cells at 13px. The table is now 379px on desktop and fits a 320px screen exactly (288/288px) (rendered; markup change)
[MAJOR] .meta: #8a8a8a on white is 3.45:1, below the 4.5:1 minimum for 13px text -> color #595959 (7.0:1) and font-size 0.875rem (14px) (computed)
[MAJOR] p: text-align: justify with no hyphenation. The desktop screenshot already shows stretched word gaps (the first callout line, the lead and the meta line), and at 320px, where lines hold only 27-36 characters, the gaps get much worse -> text-align: start (flush left, ragged right) (rendered)
[MINOR] body text measure: max-width: 75ch at 15px Verdana renders 90-92 characters per line, at the top of the comfortable range for a wide sans -> max-width: 37em, which renders 70-74 characters per body line at 768px and wider (rendered)
[MINOR] body text size units: every size is in px, so the reader's default font-size setting is ignored -> rem units. Body stays at the original 15px equivalent (0.9375rem). That size is fine for Verdana, whose large x-height makes it look as big as 17-18px in most text faces (computed)
[MINOR] body line spacing: 22px on 15px is 147%, slightly loose, and it does not scale with size changes -> line-height: 1.45 (21.75px) (computed)
[MINOR] font stack: "Verdana, sans-serif" falls back to a much narrower generic sans where Verdana is missing, which lengthens lines -> Verdana, "DejaVu Sans", sans-serif (DejaVu Sans is a Linux face with similarly wide proportions). The Android fallback is still unverified (source only)
[MINOR] table numbers: quantities were left-aligned with units repeated in every cell, so the digits did not line up -> right-align the numeric columns and their headers, set font-variant-numeric: lining-nums tabular-nums (Verdana's digits are already equal width; the declaration protects fallback fonts), and put units in the group headers. The PDF and PNG rows use different precision (4.8 vs 220), so they do not line up on a decimal point. I left the values as written: the font has no figure or punctuation space to pad with, and the useful comparison is before vs after within each row (rendered)
[MINOR] table semantics: no caption, no row headers, no header scopes -> add <caption>, scope="col"/"colgroup" with <colgroup>, and make the format names row headers <th scope="row"> at normal weight (source)
[MINOR] table edges: the first column was indented 16px from the text edge -> padding-left: 0 on the first column and padding-right: 0 on the last, so the table lines up with the prose column (rendered)
[MINOR] h2 spacing: 32px above and 8px below already keeps each heading with its text. I kept the ratio and moved it to rem (2.25rem / 0.5rem). text-wrap: balance added for headings (rendered)
[MINOR] callout semantics: a plain <div> gives assistive technology no hint that this is a side note -> role="note" (source)
[MINOR] composition: "29 October" and "version 4.2" can break between number and word -> non-breaking spaces in the markup (29&nbsp;October, version&nbsp;4.2) (source)
```

### Content note, outside typography

The lead says "Read the migration section", but the page has no migration section. The callout under Storage carries the migration instruction. Either add a "Migration" section or change the lead to point at the warning under Storage. I did not change the copy.

## Corrected files

- `page.fixed.css`: the full corrected stylesheet.
- `page.fixed.html`: a copy of page.html linking page.fixed.css. Markup changes:
  1. the table is regrouped (two-row header with "Size (MB)" and "Time (s)" over Before/After, units out of the cells, `<caption>`, `<colgroup>`, `scope` attributes, row headers), wrapped in `<div class="table-scroll" role="region" aria-labelledby="export-caption" tabindex="0">`;
  2. `role="note"` on the callout;
  3. non-breaking spaces in "29 October" and "version 4.2".
  The prose copy is unchanged. `page.html` is untouched.

Key values in page.fixed.css:

| Role | Before | After |
|---|---|---|
| Body | 15px / 22px, justified, 75ch (90-92 chars) | 0.9375rem / 1.45, flush left, max-width 37em (70-74 chars) |
| h1 | 6vw (19-115px) / 22px | clamp(1.75rem, 1.3rem + 2vw, 2.25rem) / 1.15 |
| h2 | 22px / 22px, 32px above / 8px below | 1.375rem / 1.25, 2.25rem above / 0.5rem below |
| Lead | 18px / 22px, 1100px wide | 1.125rem / 1.45, column width (52-59 chars) |
| Meta | 13px, #8a8a8a (3.45:1) | 0.875rem, #595959 (7.0:1) |
| Callout | height 5em, overflow hidden | grows with its content, 3px left rule |
| Table | 890px, nowrap, left-aligned values | 379px, right-aligned tabular figures, scroll region fallback, 13px below 30em |

## Verification after the fix

- No horizontal page scroll at 320, 768, 1280 or 1920 px (scrollWidth equals the viewport width).
- Body lines: 70-74 characters at 768px and wider. At 320px they fall to 33-38, below the comfortable range, which a phone column cannot avoid at a readable size.
- Callout: no clipping at any width, including under the WCAG text-spacing overrides (257/257px at 320px).
- Table: fits its region at every width with normal spacing. Under the text-spacing overrides at 320px it scrolls inside its own focusable region (363px in 288px) and the page does not scroll.
- Heading order is correct at every width (h1 28-36px > h2 22px > lead 18px), and nothing overlaps.

Still to verify: Safari and Firefox, Windows text rendering, 200% and 400% zoom on real devices, and the fallback-font state where Verdana is absent.

## The three fixes that help most

1. **Unclip the callout** (remove `height: 5em; overflow: hidden`). The compatibility warning is the page's most important instruction, and it was cut off at every width.
2. **Put every text block back in one column with proportional leading.** Remove the 1100px lead width, replace the fixed 22px line-height with unitless values, and replace the 6vw h1 with a clamped rem size. Together these remove the horizontal scroll, the overlapping title and the inverted heading order.
3. **Flush-left body text at a 37em measure**, plus the regrouped, right-aligned, scroll-safe table. Word spacing becomes even, lines drop to about 70 characters, and the numbers can be compared at a glance.
