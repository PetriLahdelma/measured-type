# AGENTS.md

Instructions for coding agents working in this repository. People should read
[CONTRIBUTING.md](CONTRIBUTING.md); this file is the short version of it.

## Layout

- `skills/measured-type/`: the skill (SKILL.md, `references/`) and its tools
  (`scripts/`, tests in `scripts/test/`). Run commands from here.
- `specs/`: one numbered spec per change, with requirement IDs.
- `evals/`: eval cases, graders, analysis scripts and committed results.

## Commands

```bash
cd skills/measured-type
npm install && npx playwright install chromium   # once
npm test                                         # the whole suite
node --test scripts/test/<name>.test.js          # one file
```

From the repository root, `npm run gate` runs the prose check and every test;
it is what "done" is checked against.

Set `MT_PYTHON` to a Python that has fontTools, or four tests skip.

## Rules

- **Test first.** Add the requirement to a spec in `specs/`, write the test
  named with its ID, watch it fail, then change the code. Run the whole suite
  before you say a change works.
- **Never approve what was not computed.** A check that cannot run reports
  under Not verified; it never passes in silence.
- **Do not edit anything under `evals/results/`** except to add a new
  experiment. Do not change a grader after the runs it grades.
- **Do not touch `.github/brand/`** or the license files.
- **Claims need evidence.** Every rule, number and statement in SKILL.md and
  `references/` is either measured by a script or cited (Bringhurst section,
  WCAG criterion, specification URL). Paraphrase sources; do not paste them.
- **Style for prose:** no em dashes, no middle dots, no comma before the "and"
  or "or" that ends a list, British spelling outside code.

## Done means

`npm run gate` passes from the repository root with nothing skipped that was
not skipped before, and the change, its spec and its tests are in one commit.
