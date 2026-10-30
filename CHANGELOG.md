# Changelog

Notable changes to Measured Type. Each release has full notes on the
[releases page](https://github.com/PetriLahdelma/measured-type/releases), and
each change has a spec in [`specs/`](specs/).

## Unreleased

### Added

- **Claude Code plugin.** `.claude-plugin/marketplace.json` makes this
  repository a plugin marketplace: `/plugin marketplace add
  PetriLahdelma/measured-type`, then `/plugin install
  measured-type@measured-type`. A test keeps the plugin version equal to the
  release version (spec 0015).

### Fixed

- `page-audit.js` on live sites (spec 0019), found by auditing 14 pages of
  digitaltableteur.com: the zoom check pairs elements by path, so a page
  that renders different elements at different widths no longer crashes it;
  the audit scrolls the page once and finishes animations before measuring,
  so text that fades in on scroll is no longer reported at 1:1 contrast and
  the audit waits for fades a script runs; text still at opacity 0 is
  listed as not verified; and visually hidden text and icon-only controls
  are never reported as truncated text.

### Evidence

- Triggering in a real session (spec 0016): installed as a project skill,
  it loaded before the first edit on 26 of 26 typography prompts with Opus
  5.5 and 15 of 16 with Sonnet 5.5, and on no near miss in 114 runs. The
  earlier one-in-ten figure came from the stub-command setup.
- A held-out line length in Charter (spec 0017): the skill came closer to
  the requested 62 characters than one sentence of advice (0.18 against
  0.82 off, p = 0.004), and no closer than a model that measures without
  it (0.43, p = 0.077).
- Committed runs re-graded with tighter bands, after the fact (spec 0018).

## 1.3.0 (30 October 2026)

Three solvers that compute the answer instead of leaving it to the agent, a
shorter SKILL.md, a one-command gate and a contributor kit.

### Added

- `type-scale.js --fit MIN:MAX` (spec 0009): when a brief fixes both ends of a
  fluid size, it prints the plain ramp and two forms that keep both sizes and
  pass the 1.6× zoom bar on a 1280px window (an early max and two slopes,
  `clamp(min, min(steep, gentle), max)`), with the growth on 1024, 1280, 1440
  and 1920px windows. The MT-ZOOM-RANGE fix names it.
- `measure-line.js --solve N` and `estimate-measure.js <family> --target N`
  (spec 0012): the `em` width for a target line length, searched in Chromium
  or estimated without a browser. `--solve` reports a container too narrow for
  the width, and the MT-MEASURE-LONG fix names both.
- `contrast-fix.js` (spec 0013): the nearest text or ground colour that
  reaches a WCAG ratio, changing only OKLCH lightness so the hue stays (`#888`
  on white gives `#767676`), with the APCA Lc. Each MT-CONTRAST finding now
  names that colour in its fix.
- `npm run gate` (spec 0011): the prose check (`tools/prose-check.js`) and
  every test in one command, and a pre-push hook in `.githooks/`.
- Contributor documents: CONTRIBUTING.md, AGENTS.md, a code of conduct, a
  security policy, issue forms and a pull request template.

### Changed

- SKILL.md is 2,297 words, down from 2,899, under a 2,300-word budget that a
  test holds (spec 0014). The type-scale rules moved to
  `references/rules.md` §3.1.1 and the tool details to "Running the tools" in
  `references/audit.md`; every script and reference is still named.
- The guidance on fluid type tells the agent to keep sizes the request fixes
  and to use `--fit`.

### Evidence

- The 2×2 of skill and browser (spec 0007), the one-sentence hint arm and ten
  runs per cell (spec 0008), the hero rerun (spec 0009) and a held-out twin of
  the hero case (spec 0010), each pre-registered with its results in
  `evals/results/`.

## 1.2.0 (30 October 2026)

Dense product UI checks (`MT-TABULAR`, `MT-NUM-ALIGN`, `MT-CAPS-TRACKING`,
`MT-TRUNCATE`, `MT-UI-SIZE`), a lite mode without a browser
(`page-audit.js --lite`, `estimate-measure.js`) and linting for SCSS, Less,
Vue, Svelte, Astro and Tailwind classes. Fixes from a second review make sure
no check passes what it did not compute. Specs 0003 to 0006.
[Release notes](https://github.com/PetriLahdelma/measured-type/releases/tag/v1.2.0).

## 1.1.0 (29 October 2026)

Eleven rendered checks from Matej Latin's *Better Web Typography for a Better
Web* and Ina Saltz's *Typography Essentials*, in a new
`references/screen-and-ui.md`, plus APCA contrast in `scripts/apca.js`.
Spec 0002.
[Release notes](https://github.com/PetriLahdelma/measured-type/releases/tag/v1.1.0).

## 1.0.0 (29 October 2026)

The first versioned release: Bringhurst's rules applied to current CSS, with
`measure-line.js`, `lint-css.js`, `page-audit.js`, `font-features.py`,
`fallback-metrics.py` and `type-scale.js`. Spec 0001.
[Release notes](https://github.com/PetriLahdelma/measured-type/releases/tag/v1.0.0).
