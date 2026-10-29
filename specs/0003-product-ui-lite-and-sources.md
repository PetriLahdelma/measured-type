# Spec 0003: product UI, a lite mode, a softer trigger and more sources

Status: accepted and implemented, 29 October 2026 (N2 and N3 results: ties on pass rate, see `evals/results/h2h-2` and `h2h-3`). Each requirement has an ID; the test that
proves it carries the same ID in its name.

## Why

The first outside review (Shane Matthews, senior UI/UX designer, LinkedIn,
29 October 2026) asked for three things:

1. Dense product UI: tables, labels and status text next to the long-form
   reading rules.
2. A softer trigger, so the skill works alongside other design skills instead
   of claiming to go first.
3. A lighter mode that skips Playwright, so it is easier to try.

Our own review added two more: the static linter reads only plain `.css` and
`.html`, while most product code is Sass, single-file components or Tailwind
classes; and the head-to-head benchmark barely separates the skill from no
skill (40/40 against 38 to 39/40), so it needs harder cases.

## J. Trigger

- **J1** The description makes no priority claim: no "first", no "ahead of".
- **J2** It says the skill works alongside general frontend and design skills
  and owns the type decisions.
- **J3** It stays within the 1024-character limit of the Agent Skills format.
- **J4** The triggering eval is run again on both sets. Near misses must stay
  at 10/10 and 6/6. Recall is reported next to content-freeze-2; a drop larger
  than run-to-run noise (more than one prompt) blocks the change.

## K. Lite mode (no Playwright)

- **K1** `page-audit.js --lite`, or any run where Playwright cannot be loaded,
  does not crash. For a local HTML file it lints the page and the local
  stylesheets it links, reports `mode: lite` and lists every rendered check it
  skipped under Not verified. For a URL it says it needs a browser and exits 2.
- **K2** `measure-line.js` without Playwright prints an estimate instead of a
  stack trace when the face is in the calibration table, marked as an
  estimate, and the install command.
- **K3** `scripts/estimate-measure.js` estimates characters per line from a
  face, a size and a width (`66ch`, `34em`, `600px`) with no browser, using a
  table of average character and zero widths measured in Chromium. For the
  faces in the table the estimate is within 6% of the rendered count at three
  widths. Faces not in the table get a generic estimate labelled as such.
- **K4** `lint-css.js` reports the estimate in `MT-MEASURE-CH` when the same
  rule sets a known face.
- **K5** SKILL.md and the README describe a no-install path: `lint-css.js` and
  `estimate-measure.js` need only Node; everything else is optional.

## L. Dense product UI

Guidance in `references/product-ui.md`, with sources and the kind of each
rule (standard, measured, convention, preference). Rendered checks in
`page-audit.js`:

- **L1 Tabular figures in number columns** (Bringhurst §3.2.1, already in the
  core table). In a table column where at least two cells hold numbers, the
  digits are drawn in the cell's own font and `font-variant-numeric`; if `1`
  and `0` differ in width by more than 2% the column is `MT-TABULAR` MEDIUM.
- **L2 Numbers aligned at the end** (convention). A number column whose cells
  are start-aligned while their lengths differ is `MT-NUM-ALIGN` LOW.
- **L3 Tracked capitals** (Bringhurst §2.1.6). Uppercase text under 20px with
  `letter-spacing` at or below 0 is `MT-CAPS-TRACKING` LOW, from
  `text-transform: uppercase` or from text that is all capitals; the static
  linter reports `text-transform: uppercase` without `letter-spacing` in the
  same rule under the same ID.
- **L4 Truncated text the reader cannot get back** (WCAG 1.4.4 at zoom,
  convention at 100%). Text cut by `text-overflow: ellipsis` or
  `-webkit-line-clamp`, with no `title`, `aria-label` or `aria-describedby`
  carrying the full text: `MT-TRUNCATE` LOW at 1280px; MEDIUM when the text
  fits at 1280px and is cut only at 200% zoom.
- **L5 A floor for interface text** (house heuristic). Visible interface text
  under 12px, outside reading text: `MT-UI-SIZE` LOW with the size.
- **L6** A dense, well-set product fixture triggers none of L1 to L5, and the
  editorial and clean fixtures still trigger none of them.

## M. Sources beyond plain CSS

- **M1** `.scss` and `.less` files are linted with the CSS rules (nested
  blocks, variables and mixins do not break the parser).
- **M2** In `.vue`, `.svelte` and `.astro` files only the `<style>` blocks are
  linted; template text is not checked for quotes and dashes, because it is
  code.
- **M3** Tailwind classes in `class` and `className` attributes of `.html`,
  `.jsx`, `.tsx`, `.vue`, `.svelte` and `.astro` files are linted:
  `text-justify` without `hyphens-auto` (`MT-JUSTIFY`), `text-[Nvw]`
  (`MT-ZOOM-VW`), physical utilities such as `ml-`, `pr-`, `text-left`,
  `float-right` (`MT-PHYSICAL`, with the logical class as the fix),
  `uppercase` without `tracking-` (`MT-CAPS-TRACKING`), `tracking-[Npx]`
  (`MT-LS-PX`), `max-w-[Nch]` and `max-w-prose` (`MT-MEASURE-CH`),
  `font-thin`, `font-extralight` or `font-light` on reading elements (`p`,
  `li`, `dd`, `blockquote`, `figcaption`; `MT-WEIGHT-THIN`) and
  `leading-none` or `leading-tight` on the same (`MT-LH-TIGHT`). Variant
  prefixes (`md:`, `hover:`) and `!` are ignored. Each finding has a file and
  line.

## N. Harder evaluation

- **N1** New head-to-head cases are written and committed, with graders,
  before any run: cases where an agent without the skill is likely to miss
  something measurable (a dense data table, a `66ch` measure in a wide face,
  uppercase labels and truncation at zoom).
- **N2** They run with the skill and with no skill, the same model and
  settings, at least two runs each, graded blind. All scores are published,
  including any case the skill loses.
</content>
</invoke>
- **N3** Head-to-head 3 removes the confound found in head-to-head 2: the
  runner brief (`evals/h2h-3-brief.md`) no longer says that Node, Playwright
  or a browser is available, forbids installing or downloading anything and
  limits runs to Read, Write, Edit, Glob, Grep and Bash. A run with the skill
  still has its scripts and their installed `node_modules`, as after the
  README's install; a run without it has whatever it finds for itself in its
  own working directory. Same two cases and graders, unchanged. Four
  configurations, two runs each: Claude Opus 5.5 and Claude Sonnet 5.5 (the
  smaller model), each with the skill (frozen at `content-freeze-5`) and
  with none. Graded blind; every score published.
