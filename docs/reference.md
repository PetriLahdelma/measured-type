# Reference, by decision

The skill's references are written to be read one at a time, when a decision
comes up. This table goes from the decision to the page and the script that
settles it.

| You are deciding | Read |
|---|---|
| How wide a column of text should be | [Choose a comfortable measure](../skills/measured-type/references/rules.md#212-choose-a-comfortable-measure), then [`measure-line.js`](../skills/measured-type/scripts/measure-line.js) |
| Leading for a line length | [Choose a basic leading](../skills/measured-type/references/rules.md#221-choose-a-basic-leading-that-suits-the-typeface-text-and-measure) (the house band), then [`measure-line.js`](../skills/measured-type/scripts/measure-line.js), which prints it |
| Leading and the space between blocks | [Vertical space in measured intervals](../skills/measured-type/references/rules.md#222-add-and-delete-vertical-space-in-measured-intervals) |
| Setting text on a strict baseline grid | Strict baseline grid, at the end of [Vertical space in measured intervals](../skills/measured-type/references/rules.md#222-add-and-delete-vertical-space-in-measured-intervals), then `page-audit.js --baseline` |
| A type scale that survives zoom | [Building or reviewing a type scale](../skills/measured-type/SKILL.md#building-or-reviewing-a-type-scale) and [Don't compose without a scale](../skills/measured-type/references/rules.md#311-dont-compose-without-a-scale) |
| Whether a font has real small caps or text figures | [Checking what a font contains](../skills/measured-type/references/rules.md#checking-what-a-font-contains), then [`font-features.py`](../skills/measured-type/scripts/font-features.py) |
| Spacing for capitals, labels and acronyms | [Letterspace capitals and small caps](../skills/measured-type/references/rules.md#216-letterspace-capitals-small-caps-and-long-digit-strings) |
| Data tables, labels, badges and status text | [Dense product UI](../skills/measured-type/references/product-ui.md) |
| Which two typefaces to pair | [Families](../skills/measured-type/references/taste.md#families), then `font-features.py text.woff2 heading.woff2 --metrics` for their proportions |
| Inline code, icons beside labels, heading order, kerning, thin weights | [Screen and interface type](../skills/measured-type/references/screen-and-ui.md) |
| Where hard spaces go | [Link short numerical expressions](../skills/measured-type/references/rules.md#246-link-short-numerical-expressions-with-hard-spaces) |
| Making a layout work right to left | [Physical to logical map](../skills/measured-type/references/logical-and-language.md#physical-to-logical-map) and [Mirroring](../skills/measured-type/references/logical-and-language.md#mirroring) |
| Quotes, decimals, units and dates for a locale | [Locale conventions](../skills/measured-type/references/logical-and-language.md#locale-conventions-the-pattern), worked for English, Finnish and Swedish |
| Replacing CSS that was renamed or never shipped | [Renamed, dead or wrong](../skills/measured-type/references/css-modern.md#renamed-dead-or-wrong) |
| Whether the result looks considered | [Reviewing with a point of view](../skills/measured-type/references/taste.md#reviewing-with-a-point-of-view) |
| Reviewing, and the meaning of every rule id | [Auditing: report format and rule catalog](../skills/measured-type/references/audit.md) |
