# Spec 0006: the remaining tool gaps from council review 2

Status: accepted and implemented, 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`scripts/test/gaps.test.js`).

- **G1 Text spacing (WCAG 1.4.12).** The override is applied inline with
  `!important` on every element, so an author `!important` rule cannot keep its
  tighter spacing. A box whose text spills out of a fixed height with visible
  overflow and runs into the next block is MT-TEXT-SPACING HIGH. A box that
  clipped a little before the override and clips more after it is reported
  too, unless it is a 1px or collapsed box (screen-reader text, a closed panel,
  a spam trap), which stay exempt. Text already cut on purpose by an ellipsis
  or a line clamp is exempt too: that is MT-TRUNCATE's finding.
- **G2 Class expressions.** The linter reads the string literals inside
  `className={...}`, `cn()`, `clsx()`, `classnames()`, `cva()`, `twMerge()`,
  `twJoin()`, Vue `:class` and `v-bind:class`, Astro `class:list` and Svelte
  `class:name` directives, and applies the Tailwind rules to them. Only the
  interpolated parts of template literals are listed as not verified.
- **G3 Large files.** A 2 MB HTML file with tens of thousands of findings is
  linted without a stack overflow and in seconds: line numbers come from a
  precomputed index and findings are collected without spreading.
- **G4 Estimate fallback.** When the first family of a stack is not in the
  calibration table, the estimate gives the range and names the later family
  it would fall back to, instead of reporting that family as if it rendered.
- **G5 One report shape.** Lite and rendered reports both carry `mode`
  (`lite` or `rendered`), and every finding has a `location` string.
- **G6 MT-MINUS** reports the line the minus sign is on, also when it starts a
  line.
- **G7 MT-RANGE** leaves alone digit groups with a leading zero (`040-123`,
  phone numbers) and numbered standards (`ISO 8601-1`, `EN 301-549`).
- **G8 Header alignment.** A number column whose cells are aligned at the end
  but whose header is not is MT-NUM-ALIGN LOW for the header.
