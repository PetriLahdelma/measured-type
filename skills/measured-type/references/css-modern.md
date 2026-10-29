# Legacy to modern CSS

Older typography tutorials (webtypography.net was written 2005–2008, updated
in parts since) describe properties that were renamed, never shipped or carry
typos. Use this table when auditing a stylesheet or when you recall a property
from an older source.

Support notes reflect late 2026. When a decision depends on support, check MDN
or caniuse instead of trusting this table.

## Renamed, dead or wrong

| Seen in old CSS or tutorials | Status | Use instead |
|---|---|---|
| `hyphenate: auto` | never shipped | `hyphens: auto` (+ `-webkit-hyphens` for older Safari) |
| `hyphenate-before: 2; hyphenate-after: 3` | never shipped | `hyphenate-limit-chars: 6 2 3` (+ `-webkit-hyphenate-limit-before/after`) |
| `hyphenate-lines: 3` | never shipped | `-webkit-hyphenate-limit-lines: 3` (Safari only) |
| `hyphenate-dictionary: url(...)` | never shipped | correct `lang`; the browser supplies dictionaries |
| `kerning-mode`, `kerning-pair-threshold` | never shipped | `font-kerning: normal` |
| `text-align-last: size` | dropped | fluid `font-size` or fitting text with JS for one-off display |
| `page-break-before/after/inside` | legacy aliases | `break-before`, `break-after`, `break-inside` |
| `page-break-inside: never` | **invalid value** | `break-inside: avoid` |
| `content: "2022"` / `content: "2767"` | **bug**: prints the digits | `content: "\2022"` / `"\2767"` |
| `font-variant: small-caps` on a font without `smcp` | browser fakes it | `font-variant-caps: all-small-caps` + `font-synthesis: none` |
| `font-feature-settings: "onum"` for figures | works, but overrides all other features | `font-variant-numeric: oldstyle-nums` |
| `text-rendering: optimizeLegibility` | legacy; can slow long pages | `font-kerning: normal`; ligatures are on by default |
| `-webkit-font-smoothing: antialiased` everywhere | macOS-only, thins text | omit for body text; consider it only for light-on-dark display |
| `line-height: 22px` / `line-height: 1.5em` | inherits a fixed length | unitless `line-height: 1.5` |
| `html { font-size: 62.5% }` | overrides reader settings | `font-size: 100%` and `rem` tokens |
| `font-size: 4vw` | ignores zoom (WCAG 1.4.4) | `clamp(2rem, 1.5rem + 2vi, 4rem)` |
| `width: 960px` on text containers | measure changes with zoom | `max-inline-size: 34em` |
| `margin-left`, `padding-right`, `left`, `text-align: left` | physical | logical equivalents, see `logical-and-language.md` |
| `<acronym>` | removed from HTML | `<abbr title="...">` |
| `display: table` to center verse in IE | workaround | `inline-size: fit-content; margin-inline: auto` |
| IE conditional comments, `ie-lte-7.css` | obsolete | delete |
| PHP regex to wrap acronyms, insert `&nbsp;`, kern `To`/`Wa` | brittle | `Intl` formatters, content-pipeline transforms, `font-kerning` |
| `<span class="kern">` around letter pairs in prose | fights the font's kerning | delete; trust the kern table |
| `text-justify: distribute` | deprecated value | `inter-character` (CJK) or `inter-word` |
| `word-wrap: break-word` | legacy alias | `overflow-wrap: anywhere` or `break-word` for URLs and long tokens |

## Modern properties and where they work

| Property | What it does | Support (late 2026) |
|---|---|---|
| `hyphens: auto` | dictionary hyphenation by `lang` | all engines; dictionary coverage varies by engine and language |
| `hyphenate-limit-chars` | minimum word, before and after lengths | Chromium; others partial or prefixed |
| `hyphenate-character` | custom hyphen glyph | broad |
| `text-wrap: balance` | even line lengths for short text | all engines |
| `text-wrap: pretty` | avoids runts, better rag in paragraphs | Chromium and Safari; harmless elsewhere |
| `text-box: trim-both cap alphabetic` | trims half-leading to cap height and baseline | Chromium and Safari; Firefox pending |
| `lh`, `rlh` units | element / root line height | all engines |
| `cap`, `ex`, `ic`, `rcap` units | font-relative metrics | broad; `ic` useful for CJK measure |
| `font-variant-numeric` | figure style, spacing, fractions, zero | all engines |
| `font-variant-caps` | real small caps, unicase, petite caps | all engines |
| `font-synthesis` (+ `-weight`, `-style`, `-small-caps`) | blocks faux styles | all engines |
| `font-kerning` | kerning on/off | all engines |
| `font-optical-sizing` | `opsz` axis follows size | all engines |
| `font-size-adjust` | match x-height (or cap height) across families | all engines |
| `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` in `@font-face` | metric-matched fallback, less layout shift | Chromium and Firefox; Safari partial |
| `initial-letter` | drop and raised caps | Chromium and Safari |
| `hanging-punctuation` | hang quotes and stops | Safari only |
| `text-spacing-trim`, `text-autospace` | CJK punctuation and script spacing | Chromium (and Safari for some values) |
| `widows`, `orphans` | paged and multicolumn breaks | Chromium and Safari; not Firefox |
| `:dir()`, `:lang()` | direction and language selectors | all engines |
| `quotes: auto` | language-appropriate `<q>` marks | all engines |
| `text-underline-offset`, `text-decoration-thickness`, `text-decoration-skip-ink` | refined underlines | all engines |
| `line-clamp` / `-webkit-line-clamp` | truncate to N lines | prefixed form in all engines |

## Feature checks worth writing

```css
@supports (text-box: trim-both cap alphabetic) {
  .title { text-box: trim-both cap alphabetic; }
}
@supports not (hyphenate-limit-chars: 6 2 3) {
  .prose { -webkit-hyphenate-limit-before: 2; -webkit-hyphenate-limit-after: 3; }
}
```

Most typographic properties are safe progressive enhancements: an unsupported
one is ignored and the text still reads. Feature queries matter mainly when an
enhancement changes layout (trimmed boxes, changed spacing).
