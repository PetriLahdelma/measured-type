# Dense product UI: tables, labels and status text

Bringhurst wrote about books, and most of `rules.md` is about reading text.
Dashboards, admin tools and data tables are a different kind of text (see
SKILL.md §1, "Interface and data"): short strings scanned rather than read,
numbers compared down a column and labels that name things. The reading rules
on measure, paragraphs and hyphenation mostly do not apply; these do.
`scripts/page-audit.js` runs the checks named below.

Each rule carries its kind (`taste.md`): **standard** (WCAG or a spec),
**measured** (a number the tools take from the page), **convention** or
**preference**. Thresholds no source gives are house heuristics and say so.

## Tables

**Number columns use tabular lining figures** (Bringhurst §3.2.1; measured).
Proportional figures give each digit its own width, so 1 111 and 80 008 do
not line up and a counter jitters as it changes. Set
`font-variant-numeric: lining-nums tabular-nums` on number columns, prices,
timers and anything that updates in place. Some faces have no `tnum` at all
(Georgia, DM Sans, Rubik and Merriweather in the calibration); for those the
CSS does nothing and the column needs another face. Check: `MT-TABULAR` draws
`1` and `0` in the cell's own font and flags a difference over 2%; it draws
single glyphs, because Arial and Helvetica kern the pair `11` and would
otherwise look proportional.

**Numbers align at the end** (convention). Place values line up only when
the numbers share their last digit: `text-align: end` on the cells and on
their header. Give every value in a column the same number of decimals, put
the unit in the header (`Size (MB)`) instead of in every cell and format with
`Intl.NumberFormat(locale)`, which also gives a real minus sign. Check:
`MT-NUM-ALIGN` flags a start-aligned number column whose values differ in
length.

**Cells are interface text, not reading text** (convention). Leading of 1.2
to 1.4 suits one-line cells; spacing comes from the spacing scale, not from
the body line. A cell that holds sentences (a description column) still wants
a measure: cap it near 40 to 60 characters and let it wrap.

**Wide tables scroll inside their own box** (WCAG 1.4.10; standard). A table
may need two dimensions; the page may not. Wrap it in
`overflow-x: auto` with a visible scrollbar and a label, so the page reflows
at 320 CSS px (`MT-REFLOW` reports the table when it does not).

## Labels

**Track capitals** (Bringhurst §2.1.6; convention). Uppercase labels, eyebrows
and table headers need 5 to 10% of their size in tracking
(`letter-spacing: 0.06em`); capitals set tight read as a block. Sentence case
is often easier to scan and needs no tracking (preference). Check:
`MT-CAPS-TRACKING`, rendered for capitals under 20px, and in the linter for
`text-transform: uppercase` with no `letter-spacing` in the same rule.

**A floor for interface text** (house heuristic). WCAG sets no minimum size,
but text under 12px at the default zoom is hard for many readers and fails
first when the reader's own settings shrink it. Check: `MT-UI-SIZE` flags
visible interface text under 12px.

## Status text and badges

**Colour is never the only signal** (WCAG 1.4.1; standard). "Failed" in red
and "Passed" in green must also differ in word, icon or shape, because about
one in twelve men cannot tell those reds and greens apart. Badges keep their
word.

**Small status text still needs 4.5:1** (WCAG 1.4.3; standard). Tinted text on
a tinted badge is where contrast fails most in product UI: check the text
against the badge, not against the page. A badge that carries meaning by its
fill alone needs 3:1 against its surroundings (1.4.11). `MT-CONTRAST` measures
every text element, badges included.

## Truncation

**Cut text must be recoverable** (WCAG 1.4.4 at zoom; convention at 100%). An
ellipsis hides content. At the default size that is a design choice when the
full text is one step away (a `title`, a tooltip keyboard users can reach, a
detail view). When text fits at 100% and is cut only at 200% zoom, content is
lost to zoom, which 1.4.4 does not allow. Prefer wrapping; use
`-webkit-line-clamp` with a way to expand when space is truly fixed. Check:
`MT-TRUNCATE`, LOW at 1280px, MEDIUM when the cut appears only at 200% zoom.
