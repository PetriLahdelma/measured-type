# Spec 0013: the nearest colour that passes

Status: accepted 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`scripts/test/contrast-fix.test.js`).

## Why

MT-CONTRAST reported the ratio and said "darken the text or lighten the
ground". An agent then guesses a darker grey, often far darker than needed or
in a different hue, which moves a brand colour further than the fix requires.
Like `--fit` and `--solve`, this computes the answer: the smallest change in
OKLCH lightness, keeping hue, that reaches the ratio.

## Requirements

- **C1** `contrast-fix.js <text> <ground>` prints the colour nearest to the
  text colour, changing only OKLCH lightness, that reaches 4.5:1 on the
  ground, with its WCAG ratio and APCA Lc. It is minimal: the same colour
  0.01 lighter (or darker) in OKLCH lightness, towards the original, fails.
- **C2** It keeps the hue within 3 degrees, and lowers chroma only where the
  lightness it needs is outside sRGB at the original chroma.
- **C3** On a dark ground it moves the text lighter: `#555` on `#111` comes
  back lighter than `#555`.
- **C4** `--large` targets 3:1 and `--ratio N` any ratio; `--move ground`
  changes the ground instead of the text.
- **C5** When no colour of that hue reaches the ratio on that ground, it says
  so, gives the best ratio reachable and exits 1.
- **C6** It reads hex (`#rgb`, `#rrggbb`), `rgb()` and `oklch()`, and a
  malformed colour exits 2 with a message.
- **C7** Each MT-CONTRAST finding from `page-audit.js` gives the nearest
  passing text colour in its fix, computed by the same function.
- **C8** SKILL.md names `contrast-fix.js`.
