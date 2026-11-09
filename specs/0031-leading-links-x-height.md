# Spec 0031: leading by line length, links by colour alone, the x-height floor

Status: accepted 9 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/gap-review.test.js`).

## Why

A review of six web-typography sources on 9 November (Schöndorfer on size
and on line length and line height, Imperavi's *User Interface Typography*,
Butterick's *Practical Typography*, Tim Brown's *Combining Typefaces* and
Rutter's 2019 talk) found that the skill already covers most of what they
say. Three gaps can be measured on the rendered page with numbers the audit
already collects:

1. The skill says a wider measure wants more leading but gives no numbers,
   and the rendered audit does not check leading at all. Schöndorfer gives
   about 1.3 for 30-character lines and 1.5 or more for 60 to 80; Imperavi
   1.3 to 1.7 for body text, less on shorter lines; Bringhurst 1.4 to 1.6 at
   book measures.
2. A link in running text told apart only by its colour fails WCAG 1.4.1
   (failure F73) unless the colour differs from the text around it by 3:1 and
   another cue appears on hover and focus (technique G183). Imperavi makes
   the same point as practice. The audit has no check for it.
3. `MT-SIZE-FLOOR` counts CSS pixels, so a 16px face with a low x-height
   passes while it reads like 14px. Rutter (size by aspect value), Imperavi
   (1 to 2px more for a low x-height) and Schöndorfer all size by x-height.

The bands below are house values derived from those sources, not
standards, and the catalogue says so.

## Requirements

- **Y1** `measureLines` reports `leading`: the line pitch divided by the font
  size, with `line-height: normal` resolved by a probe in the element's own
  font. `measure-line.js` prints it beside the characters per line, with the
  house floor for that line length and whether the text is under it.
- **Y2** `leadingFloor(chars)` is the house floor: 1.3 up to 45 characters
  per line, 1.4 from 60, straight between. It is exported from
  `measure-line.js` and used by both tools.
- **Y3** The rendered audit reports `MT-LH-TIGHT` (MEDIUM) for reading text
  whose leading is under the floor for its measured line length at 1280px,
  with the leading, the line length, the floor and a fix of the floor plus
  0.1, rounded up to 0.05. Leading at or over the floor is not reported. CJK
  text is skipped (it is set to other conventions). So is a
  lead paragraph set 15% or more above the body size (the size that sets the
  most measured lines), because larger text sets tighter. Only running
  text counts: a block of three or more lines and 30 or more characters per
  line (narrower is a card or a sidebar), outside navigation, menus, dialogs
  and consent banners. The leading is the median rendered line pitch, so a
  container whose own `line-height` is not its lines' is read correctly. The
  source lint keeps its 1.3 floor, because it cannot see the line length.
- **Y4** The rendered audit reports `MT-LINK-COLOUR` (HIGH) for a link inside
  reading text that has no cue but its colour and whose colour is under 3:1
  against the text around it. Cues: a visible underline or overline, a
  block-end border, a background colour or image, a weight 300 or more apart
  from the text, a different style or family, and raised or lowered
  position, a box shadow, and a `::before` or `::after` with content (an
  underline or an icon drawn there). Only links in running text count: the
  nearest ancestor holds 20 or more letters outside links, and the link is
  not in navigation, a menu, a dialog or a consent banner, so a list of links
  is skipped. Links styled alike are one finding with their count.
- **Y5** A link told apart by colour at 3:1 or more, with no other cue, is
  listed under Not verified: the audit does not hover or focus it, and G183
  asks for a cue there.
- **Y6** `MT-SIZE-FLOOR` also reports Latin reading text of 16px or more
  whose rendered x-height is under 7px (house threshold: a 16px face with an
  x-height ratio under 0.4375), with the x-height, the ratio, the size that
  gives an 8px x-height and `font-size-adjust: ex-height 0.5` as the fixes.
  Text under 16px keeps its existing finding.
- **Y7** `references/rules.md` §2.2.1 gives the band as a table with its
  sources; `references/audit.md` lists the rendered `MT-LH-TIGHT`,
  `MT-LINK-COLOUR` and the x-height case of `MT-SIZE-FLOOR`.

The other gaps from the review (body text stepped up at wide viewports and
its zoom growth, a pairing method with face metrics, a note on what research
says about measure, table rules and fills, and the (c), (TM) and (R)
substitutes) are left for later specs.
