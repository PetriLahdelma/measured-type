# Typography audit: page.html (Release notes 4.2)

## Context

- **Medium:** a single web page read in a browser, phone to desktop.
- **Content:** English release notes. Roles present: display heading (h1), section headings (h2), lead paragraph, metadata line, running prose, a warning callout and a small data table.
- **Literal spans:** version numbers (4.2), a date, and quantities with units (4.8 MB, 12 seconds). These are left exactly as written. The prose has no quotes, apostrophes, dashes or ellipses that needed correcting.
- **Evidence:** I rendered the page in Chromium (Playwright) at 320, 375, 768, 1280 and 1920 px wide. I counted characters per rendered line, measured overflow and clipping, checked which font face was actually used for each role, computed contrast, and ran the WCAG 2.2 text-spacing override test. Verdana and Verdana Bold were the faces actually used (genuine bold, not synthesized). Not verified: Safari or Firefox, Windows rendering, and real fallback fonts on Linux or Android.

## Findings

```text
[MAJOR] .lead: width: 1100px; max-width: none forces the lead out of the column. It renders 110-116 characters per line and makes the whole page scroll sideways at every viewport below about 1150 px (page width 1124 px on a 320 px phone) -> remove the fixed width so the lead follows the column; 18px/1.4 (rendered: 55-65 chars per line on desktop, no page overflow at any width tested)
[MAJOR] .callout: height: 5em; overflow: hidden cuts off the warning. Rendered content is 106 px tall in a 99 px box on desktop and 194 px in 99 px at 320 px, so half the warning about older clients disappears on phones -> remove height and overflow; let the box grow with its text; zero the last paragraph's bottom margin inside the box (rendered: no clipping at any width, and none under the text-spacing test)
[MAJOR] table: white-space: nowrap on every cell makes an 890 px table that overflows the 715 px text column on desktop and widens the whole page on phones -> wrap the table in a labelled, keyboard-focusable scroll region; regroup the repeated headers as "Average size" and "Export time" over "Before / After" columns (cuts the table to 487 px); allow header text to wrap; keep each number with its unit using non-breaking spaces (markup change, see page.fixed.html)
[MAJOR] h1: font-size: 6vw ties the title to the window, not the text. It renders 19.2 px at 320 px wide (smaller than the 22 px h2 below it) and 115 px at 1920 px; it also ignores the reader's text-size setting, and the inherited 22px line height would make any wrapped line collide -> clamp(1.75rem, 1.25rem + 2.5vw, 2.75rem) with line-height 1.2 (rendered: 28 px at 320, 39 px at 768, 44 px from about 1100 px up)
[MAJOR] .meta: #8a8a8a on white is 3.45:1, below the 4.5:1 minimum for 13 px text, and 13 px Verdana is the smallest text on the page -> color #595959 (7.0:1) at 0.875rem (14 px)
[MAJOR] p: text-align: justify with no hyphenation. At phone widths lines hold only 27-38 characters, so the gaps between words stretch unevenly and visibly -> text-align: left
[MINOR] body: line-height: 22px is a fixed length, so every element inherits 22 px whatever its size (h2 ends up at 1.0, h1 below 0.3 on wide screens) -> unitless line-height: 1.45 on body; 1.2 on headings; 1.4 on the lead
[MINOR] .content: max-width: 75ch of 15 px Verdana renders 90-92 characters per line from 768 px up, at the very top of a comfortable range for a wide face -> max-width: 62ch (rendered: 73-81 characters per line)
[MINOR] body: font-size in px does not follow the reader's default text size, and the fallback is a bare sans-serif -> 0.9375rem (still 15 px by default); stack Verdana, "DejaVu Sans", Geneva, sans-serif so a missing Verdana falls back to a similarly wide face and line lengths stay close
[MINOR] table cells: quantities are left-aligned, so digits of different lengths do not line up -> right-align quantity columns and their headers; font-variant-numeric: tabular-nums lining-nums; row labels as th scope="row" at normal weight; a slightly darker rule under the header than between rows; first and last columns flush with the text edges
[MINOR] h2: 22px with 32px above and 8px below works, but the inherited fixed line height is 1.0 -> 1.375rem, margin 2.25rem above and 0.5rem below, line-height 1.2
[MINOR] short tokens: "notes 4.2" in the title and "version 4.2" in the callout can break across lines at narrow widths -> non-breaking spaces in page.fixed.html; also between "29" and "October"
[MINOR] body: no bottom padding, so the table touches the bottom of the viewport -> 48px bottom padding on .content; side padding 16 px on phones (24 px from 40em up) to give short lines a few more characters
```

**Content note, outside typography:** the lead tells readers to "read the migration section", but the page has no migration section. The callout under Storage is the closest match. Either add that section or reword the lead. I did not change the copy.

## Corrected files

- `page.fixed.css`: the corrected stylesheet.
- `page.fixed.html`: a copy of the page that links page.fixed.css. Markup changes are limited to the table (scroll-region wrapper with an accessible name and tabindex, grouped two-row header with scope attributes, row headers) and non-breaking spaces inside number and unit pairs, "notes 4.2", "version 4.2" and "29 October". All text is otherwise unchanged. page.html is untouched.

Key values in the corrected stylesheet:

| Element | Before | After |
|---|---|---|
| Body | Verdana 15px / 22px, justified | Verdana stack, 0.9375rem / 1.45, left-aligned |
| Column | 75ch (90-92 chars/line) | 62ch (73-81 chars/line rendered) |
| h1 | 6vw (19-115 px), 22px leading | clamp(1.75rem, 1.25rem + 2.5vw, 2.75rem) / 1.2 |
| h2 | 22px / 22px | 1.375rem / 1.2 |
| Lead | 1100px wide, 18px | column width, 1.125rem / 1.4 |
| Meta | #8a8a8a, 13px (3.45:1) | #595959, 0.875rem (7.0:1) |
| Callout | 5em tall, overflow hidden | grows with content, 3px left rule |
| Table | 890px, nowrap, left-aligned numbers | 487px, grouped header, right-aligned tabular figures, scroll region |

## Verification

Rendered with Chromium at 320, 375, 768, 1280 and 1920 px:

- Page horizontal overflow: original 1124-1382 px of scroll width at every width up to 1280; fixed: none at any width.
- Running prose: 73-81 characters per line from 768 px up; 33-46 at 320-375 px. The phone figure is below the usual 45-character floor. That comes from Verdana's wide letters at a 15 px size that should not shrink further; the left alignment keeps those short lines evenly spaced.
- Callout: clipped in the original at every width; never clipped in the fixed version.
- WCAG 2.2 text-spacing test (line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em): original clips the callout and overflows the page; fixed has no clipping or loss, and the table scrolls inside its own region.
- Root font size doubled to 32 px: the original body stays at 15 px; the fixed body and headings scale (body 30 px, h1 72 px).
- Remaining to verify: Safari (iOS) and Firefox, Windows ClearType rendering of Verdana, actual fallback faces on Linux and Android, and screen-reader announcement of the grouped table headers.

## Three fixes with the greatest effect

1. Remove the fixed height and hidden overflow from the callout, so the full warning shows.
2. Remove the 1100 px lead width and give the table its own scroll region with a compact grouped header, so the page no longer scrolls sideways and the lead reads at a normal line length.
3. Stop justifying, size h1 with a rem-anchored clamp and switch to unitless line height, so phone lines space evenly and the title keeps its rank at every width.
