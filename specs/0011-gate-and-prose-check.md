# Spec 0011: one-command gate and prose check

Status: accepted 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`tools/test/gate.test.js`).

## Why

Pull requests get no CI here, so the maintainer and contributors run the same
checks by hand. The house style for prose (CONTRIBUTING.md, "Writing the
text") was enforced only by review. One command should run both the same way
on every machine, and a pre-push hook should be able to run it.

## Requirements

- **R1** `node tools/prose-check.js` reports every em dash (U+2014) in prose
  with its file and line, and exits 1.
- **R2** It reports every middle dot (U+00B7) the same way.
- **R3** It reports a serial comma, a list with a comma before the final
  "and" or "or" (`A, B, and C`). When every item is three words or fewer the
  finding is an error; a longer candidate is printed as a note to review and
  does not fail the check, because a comma before "and" that joins two clauses
  is allowed. `A, B and C` is never reported, nor is a comma whose items are
  long or already contain "and" or "or" (`review, audit or critique it, and
  whenever`).
- **R4** It skips fenced code, inline code, URLs and blockquote lines (quoted
  text stays verbatim).
- **R5** It checks every Markdown file in the repository except
  `node_modules/`, `.github/brand/`, agent outputs under `evals/results/`
  and test fixtures. The repository as committed passes it.
- **R6** `node tools/gate.js` (also `npm run gate` from the root) runs the
  prose check and then the skill's `npm test` and prints one summary line per
  step. It exits non-zero when either fails and warns when `MT_PYTHON` is
  unset, because the font tests will skip.
- **R7** `.githooks/pre-push` runs the gate, and CONTRIBUTING.md documents
  `npm run gate` and `git config core.hooksPath .githooks`.
