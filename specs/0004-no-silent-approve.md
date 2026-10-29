# Spec 0004: never approve what was not computed

Status: accepted, 29 October 2026. From the second council review
(six seats, about 50 adversarial inputs). Each requirement has an ID; the test
that proves it carries the same ID in its name (`scripts/test/council2.test.js`).

## Why

The rendered audit and the linter returned Approve on pages they never
computed: text colours in `oklch()`, text under `opacity`, overflow hidden by
`overflow-x: hidden`, headings sized in `vh`, custom properties whose names
contain a digit, number cells with a unit. Some checks also blocked correct
code or advised a harmful fix. For a tool whose promise is proof, a silent
Approve is the most expensive failure. The invariant: anything a check cannot
compute goes under Not verified, and a fixture pins each case.

## P. No silent approval

- **P1** Contrast reads any CSS colour the browser computes (`oklch()`,
  `lab()`, `color()`) by converting it through a canvas, and multiplies the
  opacity of the element and its ancestors. A colour it still cannot read is
  listed under Not verified, never skipped.
- **P2** Disabled controls (`:disabled`, or inside `[aria-disabled="true"]`)
  are exempt from MT-CONTRAST, as WCAG 1.4.3 exempts inactive components.
- **P3** At 320 and 375px, text that runs past the viewport edge is MT-REFLOW
  HIGH even when `overflow-x: hidden` keeps the page from scrolling. Text
  inside a scroll container (`overflow-x: auto` or `scroll`) is allowed, as
  WCAG 1.4.10 allows for two-dimensional content.
- **P4** Zoom emulation divides the viewport height by the zoom factor as well
  as the width, so text sized in `vh` is caught by MT-ZOOM-VW.
- **P5** Contrast is also measured with `prefers-color-scheme: dark`; a
  failure that appears only there is reported with "(dark scheme)" in its
  location.
- **P6** A number cell with a short unit (`12 ms`, `4.2 GB`, `−3.2 pp`)
  counts as a number for MT-TABULAR and MT-NUM-ALIGN.
- **P7** The linter parses custom properties whose names contain digits or
  underscores (`--step-0`, `--font-size-4`), so `type-scale.js` output is
  linted; a failing `type-scale.js` scale fails the linter too.
- **P8** The linter treats `vh`, `vb`, `dvh`, `svh` and `lvh` (and the
  `dvw`, `svw`, `lvw` widths) as viewport units in fluid sizes; container
  units (`cqi` and the rest) cannot be evaluated statically and are listed
  under Not verified.
- **P9** Inputs the linter cannot read are listed under Not verified, not
  reported as clean: `.sass` files, `<style lang="sass">`, class lists built
  by expressions (`className={...}`, `cn(`, `clsx(`, Vue `:class`, Svelte
  `class:`) and, in lite mode, stylesheets that are remote or root-relative.

## F. No false blocks or harmful fixes

- **F1** A rule that sets the same value on both physical sides
  (`margin-left: auto; margin-right: auto`, `left: 0; right: 0`) is
  direction-neutral and not MT-PHYSICAL; Tailwind `left-1/2` with
  `-translate-x-1/2` is centring and not MT-PHYSICAL either.
- **F2** MT-ICON-ALIGN reads the label's baseline from inside the label's own
  inline box, so an icon centred in a flex row is not reported; an icon on the
  baseline in running text still is.
- **F3** MT-WIDOWS flags only a value of 1; 2 is the CSS initial value.
- **F4** Checks that only make sense for Latin text leave other scripts
  alone: no MT-CAPS-TRACKING for joining scripts (Arabic, Syriac, N'Ko,
  Mongolian, Indic), no MT-CONFUSABLE when the reading text is not Latin, and
  CJK reading text is measured against 20 to 40 characters per line (the skill
  recommends `35ic`; WCAG 1.4.8 caps CJK at 40).
- **F5** MT-TABULAR probes the element that holds the digits and names the
  face that rendered, not the first face declared.
