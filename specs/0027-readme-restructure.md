# Spec 0027: a README that shows the number first

Status: accepted 5 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`tools/test/readme.test.js`).

## Why

The 5 November review compared this README with the READMEs of the skills
people install in numbers: theirs lead with a two-command install and a demo
of what the tool prints, and run to a few hundred words; this one ran to
4,200 words and led with licence and eval badges. The three personas the
skill is for want one thing before they install, a number they can see: the
developer wants the gate's output, the designer the page at 200% zoom, the
typographer the citation beside the measurement. All three were on the page,
below the fold. Nothing is dropped: the evidence table, the reference by
decision, the proofs, the scripts table and the identity move to `docs/`,
where the README links them.

## Requirements

- **W1** The README has at most 1,650 words outside fenced code blocks and
  HTML tags (about 1,500 in prose; before, 2,650 by the same count).
- **W2** Install comes first: the first `##` section is Install, its first
  code block holds the two commands that install the skill and the measuring
  scripts, and the zoom image with its table follows in the next section.
- **W3** Every file in `docs/` is linked from the README, and every relative
  link in the README and in `docs/*.md` resolves to a file in the repository
  (anchors are not checked).
- **W4** Nothing is lost in the move: the full evidence table (every
  experiment row), the "How to read it" paragraph, the three proofs (`66ch`,
  the italic's small caps, the editorial example), the reference by decision,
  the scripts table, the Rhythmguard comparison and the identity images are in
  `docs/`, and the README keeps the install lines its tests already pin
  (spec 0015 P3, spec 0025 R13, spec 0026 Q5).
