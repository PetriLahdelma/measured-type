# Changelog

Notable changes to Measured Type. Each release has full notes on the
[releases page](https://github.com/PetriLahdelma/measured-type/releases), and
each change has a spec in [`specs/`](specs/).

## Unreleased

### Added

- `type-scale.js --fit MIN:MAX` (spec 0009): when a brief fixes both ends of a
  fluid size, it prints the plain ramp and two forms that keep both sizes and
  pass the 1.6× zoom bar on a 1280px window, an early max and two slopes
  (`clamp(min, min(steep, gentle), max)`), with growth on 1024, 1280, 1440 and
  1920px windows. SKILL.md and `references/rules.md` §3.1.1 point to it, and
  the MT-ZOOM-RANGE fix names it.
- Evals: the 2×2 of skill and browser (spec 0007), the one-sentence hint arm
  and ten runs per cell (spec 0008), the hero rerun (spec 0009) and a held-out
  twin of the hero case (spec 0010), each pre-registered with its results in
  `evals/results/`.
- A shorter SKILL.md (spec 0014): 2,297 words from 2,899, with a 2,300-word
  budget under test. The type-scale rules moved to `references/rules.md`
  §3.1.1 and the tool details to "Running the tools" in
  `references/audit.md`; every script and reference is still named.
- `contrast-fix.js` (spec 0013): the nearest text or ground colour that
  reaches a WCAG ratio, changing only OKLCH lightness so the hue stays
  (`#888` on white gives `#767676`), with the APCA Lc. Each MT-CONTRAST
  finding now names that colour in its fix.
- `measure-line.js --solve N` and `estimate-measure.js <family> --target N`
  (spec 0012): the `em` width for a target line length, searched in Chromium
  or estimated without a browser. `--solve` reports a container too narrow
  for the width, and the MT-MEASURE-LONG fix names both.
- `npm run gate` (spec 0011): the prose check (`tools/prose-check.js`) and
  every test in one command, and a pre-push hook in `.githooks/`.
- Contributor documents: CONTRIBUTING.md, AGENTS.md, a code of conduct, a
  security policy, issue forms and a pull request template.

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
