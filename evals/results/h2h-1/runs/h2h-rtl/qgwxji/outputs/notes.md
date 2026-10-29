# help.rtl.css: notes

`help.rtl.css` replaces `help.css` for both editions. It is the same stylesheet with direction-dependent parts rewritten, so the English page (`lang="en" dir="ltr"`) renders exactly as before and the Arabic page (`lang="ar" dir="rtl"`) mirrors correctly. `help.html` is unchanged; only its `<link>` needs to point at the new file.

## Changes

| Rule | Before | After | Why |
|---|---|---|---|
| `.title h2` | `text-align: left; padding-right: 4rem` | `text-align: start; padding-inline-end: 4rem` | A hard `left` pinned the Arabic heading to the wrong edge, and the space reserved for the badge sat on the side where the heading starts. |
| `.tag` | `right: 0` | `inset-inline-end: 0` | The badge belongs at the end of the title line, which is the left in Arabic. Before, it landed on top of the start of the heading. |
| `.steps` | `padding-left` | `padding-inline-start` | List numbers hang on the right in Arabic and need their indent there. |
| `.note` | `border-left`, `padding-left` | `border-inline-start`, `padding-inline-start` | The rule marks where reading starts, so it moves to the right side. |
| `.crumbs li + li::before` | `content: "›"` | same glyph in English; `‹` under `:dir(rtl)`; the separator is isolated as left-to-right | The separator must point toward the next crumb. Unicode allows engines to mirror this character in right-to-left text, but leaving the result to each engine is fragile. Isolating it as left-to-right turns mirroring off everywhere, and the glyph is picked explicitly for each direction. |
| `.next::after` | `content: " →"` | `→` in English, `←` under `:dir(rtl)` | Arrows are never mirrored by the bidi algorithm, so without a swap the Arabic "Next" link pointed backwards. |
| `margin: 0 0.5em`, `padding: 0 0.5em`, `margin: 1.5rem 0` | physical shorthands | `margin-inline`, `padding-inline`, `margin-block` + `margin-inline` | Symmetric, so no visual change; written logically for consistency. |

Unchanged on purpose: the font stack, size, line height (1.6 suits Arabic's tall ascenders and descenders) and the 36rem width. No letter-spacing or text-transform was added: tracking breaks Arabic letter joining, and Arabic has no case.

## Verification (Chromium on macOS, via Playwright)

- English: full-page screenshots of `help.html` with the old and new stylesheet are byte-identical at 320, 700 and 1200 px.
- Arabic: rendered `rtl-check.html`, which is the same markup with `lang="ar" dir="rtl"` and placeholder Arabic copy. Heading, badge, list indent, note rule and arrow all sit on the correct side; the heading and badge do not collide at any of the three widths (`shot-ar-320.png`, `shot-ar-700.png`, `shot-ar-1200.png`; `shot-ar-orig.png` shows the old stylesheet on the same page).
- The breadcrumb separator's orientation was measured from pixels, not by eye (`glyph2.js`): `›` in English, `‹` in Arabic.
- Fonts actually used for the Arabic text: `.SF Arabic` through `system-ui`. An earlier draft listed named Arabic families; that bypassed the system fallback and selected Geeza Pro, which looked smaller, so the draft was dropped.

## Not verified, and decisions for the Arabic editors

- Firefox and Safari were not rendered. `:dir()` and logical properties are supported in all current engines.
- List numerals: `<ol>` still shows Western digits (1, 2, 3). Whether to use Arabic-Indic digits (`list-style-type: arabic-indic`) is a regional house-style call: Maghreb usage generally prefers Western digits, much of the Gulf and Egypt the Arabic-Indic forms. I left the default rather than guess.
- Mixed-direction runs, such as English product or menu names inside Arabic sentences, need `<bdi>` or `dir` on those spans in the translated markup. CSS cannot fix them reliably.
- The Arabic copy in `rtl-check.html` is a placeholder. Re-check line breaks and the title/badge spacing with the real translation.

Files: `help.rtl.css` (deliverable), `notes.md`, test pages `ltr-check.html` / `rtl-check.html` / `g-*.html`, scripts `check.js`, `pix.js`, `glyph2.js`, screenshots `shot-ar-*.png`.
