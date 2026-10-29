# Before and after: one article, set twice

`before.html` with `before.css` is a typical starting point: template habits
that nobody chose for this text. `after.html` with `after.css` is the same
article set with Measured Type. Each rule in `after.css` names the section it
follows. Open both files in a browser; `after.css` loads Source Serif 4 from
`evals/ofl-feature-check/files/fonts/`.

![The same article before and after: 160 against 65 characters per line, heading growth at 200% zoom 1.00× against 2.00×, justified against ragged text, hyphen-minus against true minus, table figures left to the font against declared tabular lining figures.](before-after.png)

## What changed and why

Every number below was measured in Chromium at a 1280px window, with
`scripts/measure-line.js` and computed styles.

| | Before | After | Why |
|---|--:|--:|---|
| Characters per full line | 160 | 65 | `width: 100%` follows the window; `max-inline-size: 31em` was counted to about 66 characters in this face (2.1.2) |
| Heading growth at 200% zoom | 1.00× | 2.00× | `4.4vw` ignores zoom entirely; a fixed `rem` size doubles (3.1.1) |
| Body text | justified | ragged, hyphenated | justification without hyphenation opens rivers on a wide measure (2.1.3, 2.4.1) |
| Leading | 1.2 | 1.55 | 1.2 is a display value; body text at this measure wants more (2.2.1) |
| Vertical spacing | 10, 20, 30, 40px | whole body lines | every block lands on the 27.9px interval; the h2 takes exactly four lines (2.2.2) |
| Paragraphs | spaced | first flush, then indented | one convention, not both (2.3.1, 2.3.2) |
| Negative numbers | U+002D hyphen-minus | U+2212 minus | a hyphen is too short and too high for a sign |
| Table figures | left to the font | tabular lining, declared | columns align only with equal-width figures; Helvetica happens to default to them, many text faces do not (3.2.1) |
| Prose figures | lining | oldstyle | text figures sit with the lowercase (3.2.1) |
| Acronyms | full caps | spaced small caps | real `smcp` glyphs, with synthesis switched off (3.2.2, 2.1.9) |
| Punctuation | straight quotes, hyphen in (1990-2004) | curly quotes, en dash in (1990–2004) | typesetting, not typewriting |
| Number and unit | breakable space | no-break space | "10 km" never splits across lines (2.4.6) |
| Root size | `62.5%` | untouched | the 10px trick forces every size to be restated (3.1.1) |
| Sides | physical | logical | the RTL edition becomes a content change (see `logical-and-language.md`) |

## What did not change

The words, the order and the markup structure are the same; the only content
edits are the ones a typesetter makes: quotes, dashes, the minus sign, hard
spaces, `abbr` and the table's `scope` attributes.

The reasoning follows Robert Bringhurst's *The Elements of Typographic Style*
and the rule order of Richard Rutter's webtypography.net. Measured Type is not
affiliated with or endorsed by either.
