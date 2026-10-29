# Spec 0001: measured audit tools and a head-to-head proof

Status: accepted, 29 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name. Work is done when every test named
here passes and the head-to-head acceptance in part E is met or honestly
reported as not met.

## Goal

Measured Type should be the typography skill that finds and fixes more real
text problems than any competing skill, and proves it. Competitors give
advice; this skill measures. Four tools carry that into whole pages, code
review, font loading and type scales, and one shared report format makes
their output actionable.

## A. Report format (`references/audit.md`)

- **A1** Every finding has a rule ID from the catalog, a severity (HIGH,
  MEDIUM, LOW), a location, a measured value and a CSS fix.
- **A2** Severity follows the catalog: HIGH for a failed standard or lost text,
  MEDIUM for a measured value out of range or a convention the reader feels,
  LOW for conventions and preferences.
- **A3** A report ends with a verdict: Block when any HIGH remains, otherwise
  Approve, plus a "Not verified" list.
- **A4** Findings with the same rule and measurement collapse into one row that
  lists every location.

## B. `scripts/lint-css.js` (static, no dependencies)

Fixture: `scripts/test/lint/`. Every check below is a test.

- **B1** `font-size: 4vw` is MT-ZOOM-VW HIGH, reported at its line.
- **B2** A fluid size is judged by evaluating it at 200% and 500% zoom over
  320-2560px windows, not by pattern: `clamp(2.5rem, 2.0833rem + 1.8519vw,
  3.75rem)` is not ZOOM-VW and is MT-ZOOM-RANGE LOW (range 1.5×).
- **B3** A size token in a custom property (`--font-size-hero`) is evaluated
  the same way as `font-size`.
- **B4** `html { font-size: 10px }` is MT-ROOT-PX HIGH; `62.5%` is LOW.
- **B5** `p { line-height: 22px }` is MT-LH-LENGTH MEDIUM; a heading with
  `line-height: var(--line)` is not flagged.
- **B6** `body { line-height: 1.2 }` is MT-LH-TIGHT MEDIUM.
- **B7** `text-align: justify` without `hyphens: auto` is MT-JUSTIFY MEDIUM;
  with it, no finding.
- **B8** `width: 960px` on a text container is MT-WIDTH-PX MEDIUM.
- **B9** `max-width: 66ch` is MT-MEASURE-CH LOW.
- **B10** `font-variant: small-caps` is MT-SMALLCAPS-SYNTH MEDIUM unless the
  file sets small-caps synthesis to none.
- **B11** `font-feature-settings: "tnum"` is MT-FFS LOW.
- **B12** `margin-left` is MT-PHYSICAL LOW, HIGH with `--rtl`.
- **B13** `widows: 1` is MT-WIDOWS LOW.
- **B14** `@font-face` without `font-display` is MT-FONT-DISPLAY LOW.
- **B15** HTML: `user-scalable=no` is MT-VIEWPORT-ZOOM HIGH; text `-12%` is
  MT-MINUS; `1990-2004` is MT-RANGE but `2026-10-29` is not; straight quotes
  are MT-QUOTES; nothing inside `code`, `pre`, `script` or `style` text counts.
- **B16** Comments and strings do not break parsing or line numbers.
- **B17** `--diff <ref>` reports only findings on lines changed since the ref.
- **B18** Exit code 1 and "Verdict: Block" when a HIGH remains; 0 and
  "Approve" otherwise.
- **B19** No false alarms on good CSS: `examples/editorial/after.css` has no
  HIGH or MEDIUM finding.
- **B20** It catches the known bad page: `examples/editorial/before.css` and
  `before.html` yield MT-ZOOM-VW, MT-ROOT-PX, MT-LH-TIGHT, MT-JUSTIFY,
  MT-MINUS, MT-RANGE and MT-QUOTES.

## C. `scripts/page-audit.js` (rendered, Playwright)

Fixture pages: `scripts/test/audit/`.

- **C1** A 960px fixed container is MT-REFLOW HIGH at 320 CSS px.
- **C2** A full-width paragraph at 1280px is MT-MEASURE-LONG MEDIUM with the
  measured characters per line in the finding.
- **C3** `#999` text on white is MT-CONTRAST HIGH with the ratio; `#333` is not.
- **C4** A fixed-height `overflow: hidden` text box that clips under the WCAG
  1.4.12 override is MT-TEXT-SPACING HIGH.
- **C5** A web font whose file is missing is MT-FONT-FALLBACK MEDIUM, naming
  the face that rendered.
- **C6** A 14px paragraph is MT-SIZE-FLOOR MEDIUM.
- **C7** A heading in pure `vw` is MT-ZOOM-VW HIGH (never 2× at 500%); a fluid
  heading under 1.6× at 200% on 1280px is MT-ZOOM-GROWTH LOW.
- **C8** A heading whose last line is one word is MT-HEADING-RUNT LOW.
- **C9** Rendered `text-align: justify` without hyphenation is MT-JUSTIFY MEDIUM.
- **C10** More than 8 distinct text sizes is MT-SIZE-COUNT LOW.
- **C11** No false alarms: `examples/editorial/after.html` has no HIGH or
  MEDIUM finding.
- **C12** It catches the known bad page: `examples/editorial/before.html`
  yields MT-MEASURE-LONG, MT-ZOOM-VW, MT-JUSTIFY and MT-CONTRAST.
- **C13** Same report format, verdict and exit code as B18.

## D. Fallback and type-scale tools

- **D1** `scripts/fallback-metrics.py <webfont> --fallback <file> --name <local
  name>` prints an `@font-face` fallback with `size-adjust`,
  `ascent-override`, `descent-override` and `line-gap-override`, and notes that
  Safari applies only `size-adjust`.
- **D2** Measured outcome: in Chromium, a paragraph in the fallback with these
  overrides is closer to the web font than the plain fallback, in both total
  height and average line length, and within 1 line of height.
- **D3** Missing or unreadable files exit nonzero with a message.
- **D4** `scripts/type-scale.js` turns a base size, ratios and a viewport range
  into `clamp()` tokens and verifies each step: fluid range at most 1.4×, 2×
  reachable by 500% zoom, at least 1.6× at 200% on a 1280px window (house),
  adjacent steps at least 1.15× at both ends. It prints the table and exits
  nonzero when the request cannot meet them, naming the failing step.
- **D5** Its computed sizes match Chromium's computed `font-size` at 360, 640
  and 1440px within 0.1px.

## E. Head-to-head acceptance

- **E1** Cases are pre-registered in `evals/h2h-*` before any run, written
  after the skill content is frozen (`content-freeze-3`), from failure modes
  the baseline has actually shown: fluid zoom, `ch` overshoot, decorative and
  double mirroring, fallback layout shift, synthesized small caps, audits of a
  bad page.
- **E2** Configurations: no skill, Measured Type and the strongest available
  competitors (Anthropic frontend-design, impeccable typeset, better-typography,
  practicaltypography, wondelai web-typography), two runs each, same prompts,
  same graders, graders blind to configuration.
- **E3** Acceptance: Measured Type passes more pooled assertions than every
  other configuration. A tie or loss is published as such; the cases are not
  edited after a run to change the outcome.
- **E4** Competitor content is used locally for the runs only; the repository
  records each competitor's source URL and commit, not its files.
