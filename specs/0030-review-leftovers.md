# Spec 0030: what the 5 November code review left open

Status: accepted 8 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/leftovers.test.js`).

## Why

The code review of 5 November reported 38 faults. Specs 0025 and 0029 fixed the
ones that blocked a correct page, approved a broken one or crashed. These are
the remaining faults where a tool reads a file wrongly or says nothing about
what it skipped, which the skill's promise ("never approve what was not
computed") forbids just as much. Each is reproduced by a test before its fix.

## Requirements

- **X1** `lint-css.js` strips comments from plain CSS with the same
  string-aware reader it uses for Sass and Less (without Sass's `//` comments),
  so `content: "/*"` in a string no longer swallows every rule up to the next
  `*/`.
- **X2** A fluid size the linter cannot evaluate, such as one with `lh`, `cap`
  or `ch` beside a viewport unit, is listed under Not verified with its file,
  line and declaration. Before, it was skipped in silence.
- **X3** `vmin` and `vmax` are evaluated as the smaller and larger viewport side
  of the 1280 by 900 model, not both as `vw`; `1rem + 2vmin` was 42% too large.
- **X4** The HTML text pass decodes character references (`&quot;`, `&#39;`,
  `&apos;`, `&#x27;`, `&#34;`) before the punctuation checks, so straight quotes
  written as references are found.
- **X5** Tailwind variants are split only on colons outside square brackets, so
  `text-[length:5vw]` is read as a size and reported.
- **X6** A symbolic link that loops back into a folder already walked is skipped
  and listed under Not verified, instead of ending the run with `ELOOP`.
- **X7** Report cells collapse whitespace, so a declaration written over several
  lines stays in one table row, and a location outside the working directory is
  printed as its absolute path instead of a chain of `../`.
- **X8** The rendered MT-FONT-DISPLAY check reads `@font-face` rules in
  stylesheets brought in by `@import`; an imported sheet the page cannot read is
  listed under Not verified like a linked one.
- **X9** Text inside open shadow roots and iframes is not audited; the rendered
  audit now says so under Not verified, with the count, instead of approving the
  page as if it had none.
- **X10** `type-scale.js` refuses a ratio at or below 1, a base at or below 0 and
  a step count that is not a whole number from 1 to 12, with exit 2 and the
  value named. Before, `--ratio 0:0` printed a table of `NaN` with an `ok` row.

Not in this spec, still open from the review: MT-NUM-BREAK across text nodes
(`<span>99</span> €`), page text quoted in reports without normalisation, the
WCAG 2.0 luminance threshold in two helpers of `page-audit.js` (a difference
under 0.01 in any ratio), and the structural refactors.
