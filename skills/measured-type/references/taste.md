# Typographic taste, 2026

Bringhurst tells you what is correct. This file is about what reads as
considered: the choices a careful typographer makes once the rules are met. It
is opinionated on purpose. When a project has a house style or design tokens,
work inside them and use this to judge and refine, not to override.

## The stance

Typography is in service of the text. Hierarchy comes from size, weight and
space, used sparingly and consistently. Decoration that stands in for
hierarchy (gradients, glows, outlines, mixed effects) is a sign that the
system underneath is weak. Details nobody notices individually (real quotes,
hard spaces, figure styles, measured spacing) are what make a page feel
expensive as a whole.

## Hierarchy

- **Few sizes, clear steps.** Adjacent roles you want readers to distinguish
  should differ by a step of about 1.2–1.25× (never below about 1.15×, the
  floor `rules.md` §3.1.1 sets for phones). Sizes 1–2px apart read
  as mistakes, not hierarchy.
- **Two or three weights.** Regular for text, one heavier weight for emphasis
  and headings, perhaps one display weight. Medium, semibold and bold side by
  side blur together.
- **Space is hierarchy too.** More space above a heading than below it binds
  the heading to its section. Equal space everywhere flattens structure.
- **One loud thing per view.** A single display size or accent treatment per
  screen; a page of shouting headlines has no headline.

## Families

- **One family can carry a whole site** when it has the weights, italics,
  figures and optical sizes for every role. That restraint is often the most
  refined option.
- **Pair only when each family has a job:** a text face for reading and a sans
  for interface, or a mono for code and data. Pair by contrast (serif with
  sans, different construction) or by shared structure (similar x-height and
  proportions). Two similar sans serifs on one page look like an accident.
- **Choose text faces for reading,** at the sizes they will be read: open
  counters, moderate contrast, a large enough x-height, real italics, text
  figures and small caps. Choose display faces for their size; many look poor
  below 24px.
- **Use the font's full kit:** optical sizes (`opsz`), true italics, figure
  sets, small caps, case-sensitive forms. A family used at default settings
  shows only part of what you paid for.

## Reading text

- **Size:** editorial reading text on desktop is commonly 17–21px (about
  1.0625–1.3rem) in 2026; 16px is the floor for any reading text and a
  reasonable default for interface copy. Let the reader's settings scale it.
- **Measure, leading, ragged:** see `rules.md`. Ragged right with good
  hyphenation beats justified text on screens almost every time.
- **Color:** dark gray to near-black on an off-white or white ground, with
  AA contrast (4.5:1) at minimum for all text including secondary copy. Light
  gray body text at 60% opacity is the commonest readability failure in
  contemporary UI.
- **Italic for emphasis and titles; bold sparingly;** never underline for
  emphasis (underline means link).

## Display text

- Tighten leading as size grows (about 1.0–1.15 at 48px and above) and test
  descenders and diacritics for collisions.
- Tracking at display sizes: slightly negative for most lowercase sans faces
  (about −0.01em to −0.03em), measured per face; never so tight that letters
  touch, and never negative on capitals.
- `text-wrap: balance`, deliberate breaks with `&nbsp;`, no single-word last
  lines.
- Large type earns its size by saying less. A five-line hero heading is a
  paragraph set too large.

## Capitals and labels

- All caps only for short labels, nav items, eyebrows, buttons when the system
  calls for it: smaller size, +0.06–0.12em tracking, often a heavier weight to
  compensate for the reduced size.
- Never whole sentences or paragraphs in caps.
- Prefer real small caps for acronyms in prose; in UI, full caps acronyms
  (with normal tracking at text sizes) are fine.
- Use `text-transform` so the content keeps its true case.

## Dark mode and light-on-dark

Light text on dark grounds looks bolder and tighter than the same CSS on
light grounds (irradiation). Compensate on three axes: a slightly lighter
weight or lower grade (`font-variation-settings: "GRAD" -50` where the font
has a grade axis, since grade changes weight without changing width), a touch
more tracking (+0.005–0.01em at text sizes) and a little more leading. Avoid
pure white on pure black for long text; off-white on a dark gray is calmer.
Keep the contrast at AA or better. Hook these adjustments into the project's
own theme switch (its class or attribute); use `prefers-color-scheme` only as
the fallback when no explicit theme is set, or a dark OS will restyle a page
the reader set to light.

## Numbers

- Text figures in prose, lining in headings and caps, tabular lining in tables
  and prices (see `rules.md` §3.2.1).
- Big statistics: lining figures, the display weight, units smaller and kept
  on the same line with a hard space.
- Monospace is for code and fixed-width data, not a costume that signals
  "technical".

## Details that signal care

- Real punctuation: typographic quotes and apostrophes per language, en dashes
  in ranges, `×`, `−`, `…`.
- Hard spaces before units and between numbers and currency.
- Link underlines with offset and skip-ink; visited states where useful.
- Bullets and numbers hang outside the text block so the text edge stays
  clean (`list-style-position: outside` with the list aligned to the text
  edge rather than indented).
- Focus and hover states that never change the text's size or weight (no
  layout jump); use color, underline or outline.
- Fonts that load without jumping: metric-matched fallbacks with `size-adjust`
  and `ascent-override`, `font-display: swap` or `optional`, preload only the
  critical text face, subset by `unicode-range` per script without stripping
  OpenType features.
- Selection color and `::marker` styled to match the system.

## Template tells to avoid

These patterns mark a page as assembled from defaults, not designed:

- A tracked-caps eyebrow above every section heading, a gradient-filled
  heading and a gray 18px subhead, repeated down the page.
- One geometric sans at default settings for everything, with every heading
  tracked tight regardless of size.
- Centered paragraphs longer than two or three lines.
- Every text style a different gray; secondary text below AA contrast.
- A size ladder of one-off values (13, 15, 17, 19, 22, 28) with no system.
- Title Case Everywhere, especially in languages that do not use it.
- Emoji or icons substituting for headings and list structure.
- Dash-heavy prose; follow the house style on dashes.
- Letter-by-letter or word-by-word reveal animations on reading text; motion
  belongs to display moments and must respect `prefers-reduced-motion`.

## Reviewing with a point of view

When asked for a typographic review, go beyond correctness: name the single
biggest improvement first (often measure, contrast or too many sizes), then
the system issues (scale, roles, families), then details. Show the fix in CSS,
and say what the page will feel like after it, so the reviewer understands the
reason, not just the rule.
