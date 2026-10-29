# help.rtl.css

One stylesheet for both editions. Link it in place of `help.css`. The English page renders the same as before: screenshots of `help.html` with the old and new stylesheet match byte for byte at 1024 px and 360 px wide (Chromium).

## What changed

- **Physical sides became logical sides.** `text-align: left` is now `start`. `padding-right` on the heading and `right: 0` on the "New" tag are now `padding-inline-end` and `inset-inline-end`. The list's `padding-left` and the note's `border-left` and `padding-left` are now `-inline-start`. Under `dir="ltr"` these resolve to exactly the old values. Under `dir="rtl"` they mirror: the tag sits on the left with room reserved for it, list numbers hang on the right, and the red rule on the note moves to the right edge.
- **Breadcrumb separator.** The flex row reverses by itself. The "›" glyph does not: Chromium and WebKit draw it pointing right in RTL, which points back toward "Help". The separator is now isolated as LTR, and RTL pages get "‹". The isolation matters because "›" is formally a mirrored character. Without it, an engine that does mirror would flip the swapped glyph a second time.
- **"Next" link arrow.** "→" is never mirrored, so RTL pages get " ←". It points forward in reading order and sits at the end of the link text.
- **Arabic line height.** `body:lang(ar)` gets `line-height: 1.8`, up from 1.6. Arabic letterforms have taller ascenders, deeper descenders and stacked dots and marks, so they need more space between lines.

## Left alone on purpose

- **Font stack.** `system-ui` has no Arabic glyphs on macOS, but the browser's fallback then picks SF Arabic. Naming a family made things worse: I tried adding Arabic families after `system-ui` and Chromium switched to Geeza Pro, which looked smaller and less consistent.
- **List numerals.** The steps still use `decimal` (1, 2, 3). Arabic-Indic digits (١، ٢، ٣) suit Mashriq audiences, and Maghreb audiences use Western digits. That is an editorial choice, not a direction fix. If you want them, add `.steps:lang(ar) { list-style-type: arabic-indic; }`.
- **The `.help` column** keeps `max-width: 36rem` and now hugs the right edge in RTL. That is correct for a start-aligned column.

## How it was checked

`rtl-check/` holds the test pages: English with the old and new CSS, and an Arabic translation with the old and new CSS. It also has the Playwright scripts and screenshots. `check.js` compares the English renders and logs the box positions and computed sides. `zoom2.js` crops the breadcrumb separator in Chromium and WebKit. Firefox was not available to test.
