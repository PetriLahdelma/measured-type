# Contributing to Measured Type

Thank you for helping. Measured Type is a typography skill whose claims are
meant to hold up when someone checks them, so the most useful contributions
are the ones that come with a way to check them: a page that reproduces a
wrong result, a source for a correction, a case that measures something the
evals miss.

- [Ways to help](#ways-to-help)
- [Set up](#set-up)
- [How changes are made](#how-changes-are-made)
- [Writing the text](#writing-the-text)
- [Adding or changing an eval](#adding-or-changing-an-eval)
- [Before you open a pull request](#before-you-open-a-pull-request)
- [Licensing of contributions](#licensing-of-contributions)
- [Working with a coding agent](#working-with-a-coding-agent)

## Ways to help

From the quickest to the largest:

| Contribution | Where |
|---|---|
| A check reported something wrong or missed something | [Wrong result](https://github.com/PetriLahdelma/measured-type/issues/new?template=1-wrong-result.yml) issue, with a page or stylesheet that reproduces it |
| A rule, number or source in the references is wrong or out of date | [Reference correction](https://github.com/PetriLahdelma/measured-type/issues/new?template=2-reference-correction.yml) issue, with the source |
| A case the evals should cover | [Eval case](https://github.com/PetriLahdelma/measured-type/issues/new?template=3-eval-case.yml) issue |
| A new check or tool | [Feature request](https://github.com/PetriLahdelma/measured-type/issues/new?template=4-feature-request.yml) issue first, then a pull request |
| A question, an idea or a result from your own project | [Discussions](https://github.com/PetriLahdelma/measured-type/discussions) |
| Run the scripts on Linux, Windows or Firefox and report what breaks | Issues labelled [`help wanted`](https://github.com/PetriLahdelma/measured-type/labels/help%20wanted) |

Issues labelled [`good first issue`](https://github.com/PetriLahdelma/measured-type/labels/good%20first%20issue)
are scoped so they can be done without knowing the whole codebase.

For anything larger than a typo or a one-rule fix, open an issue before you
write code, so the approach can be agreed first.

## Set up

You need Node 22 or later, Python 3 and Git. The skill and its scripts live in
`skills/measured-type/`; everything else in the repository is evidence about
them.

```bash
git clone https://github.com/PetriLahdelma/measured-type.git
cd measured-type/skills/measured-type
npm install
npx playwright install chromium
```

The font scripts need fontTools. A virtual environment keeps it separate:

```bash
python3 -m venv ~/.venvs/measured-type
~/.venvs/measured-type/bin/pip install fonttools brotli
export MT_PYTHON=~/.venvs/measured-type/bin/python
```

Then run every test from `skills/measured-type/`:

```bash
npm test
```

All tests should pass with none skipped. Without `MT_PYTHON` pointing at a
Python with fontTools, the four font-metric tests skip. The estimate
calibration test skips where its macOS fonts are not installed; say so in
your pull request if that happens to you.

### Where things are

| Path | What it is |
|---|---|
| `skills/measured-type/SKILL.md` | What the agent reads first: workflows, rules and when to run which tool |
| `skills/measured-type/references/` | The rules in depth, with Bringhurst section numbers and sources |
| `skills/measured-type/scripts/` | The tools: `lint-css.js`, `page-audit.js`, `measure-line.js`, `estimate-measure.js`, `type-scale.js`, `font-features.py`, `fallback-metrics.py`, `apca.js` |
| `skills/measured-type/scripts/test/` | Tests and fixtures, one file per spec |
| `specs/` | One numbered spec per change, with requirement IDs |
| `evals/` | Eval cases, graders, analysis scripts and every committed result |
| `examples/` | Before and after pages |

## How changes are made

Every change to the skill follows the same order, and the history shows it
spec by spec:

1. **Write or extend a spec** in `specs/NNNN-short-name.md`. Each requirement
   gets an ID (for example `Z3`) and one testable sentence.
2. **Write the test first**, named with the requirement ID
   (`test('Z3 the plain ramp is reported ...')`), and watch it fail for the
   reason you expect.
3. **Write the smallest change that makes it pass**, then run the whole suite.
4. **Pin thresholds.** A number that decides a finding (a ratio, a size, a
   tolerance) gets a test on each side of it, so changing it breaks a test.

Some rules hold across the tools:

- **Never approve what was not computed.** If a check cannot run (no browser,
  an unreadable stylesheet, a container unit it cannot resolve), it goes
  under Not verified in the report. It is never passed in silence.
- **Every rule ID is in the catalogue.** A rule a script emits must be listed,
  with its severity, and a listed rule must be emitted by a script
  (`catalog.test.js` checks both).
- **Severities mean something.** HIGH is something a reader would hit (text
  that does not reach 2× by 500% zoom, contrast below WCAG). MEDIUM is a real
  problem with a workaround. LOW is a convention or a judgement.
- **Label house heuristics.** Where no source gives a number and it was
  calibrated here (the 1.6× zoom bar, the 0.82 ink overlap for I and l), the
  text says so.
- **No false blocks.** A check that fires on a correct page is a bug as
  serious as one that misses a broken page. Add the correct page as a
  fixture that must stay clean.

## Writing the text

SKILL.md, the references, the README and the eval write-ups share one style:

- Plain statements, one claim per sentence and only claims that were measured
  or can be cited. Give the source: a Bringhurst section number, a WCAG
  success criterion, a specification URL or a measurement you can repeat.
- Paraphrase sources. Do not paste passages from books; a short quote with
  attribution is the limit.
- No em dashes and no middle dots: use commas, colons, full stops or a new
  sentence.
- No comma before "and" or "or" at the end of a list.
- British spelling (colour, behaviour, catalogue), except in code and CSS.

## Adding or changing an eval

An eval case is a folder under `evals/` with `case.yaml`, `prompt.md`, the
input files under `files/`, one grader file per assertion under `graders/`
and a `place-files.sh` that copies the inputs into a run folder. Head-to-head
cases add a deterministic grader function in `evals/h2h-grade.js` that renders
the output in Chromium.

1. **Validate the graders on known answers** before any run: at least one
   output that must fail each grader and one that must pass all of them.
2. **Pre-register.** Commit the case, its graders, the spec that says what
   will be compared and how it will be read and the analysis script before
   the first run.
3. **Report every run.** Results go in `evals/results/<name>/` with each run's
   outputs, `grading.json` and `timing.json`, a README with the method, the
   result under the pre-registered rules and every disclosure: reruns,
   deviations from the brief, scratch files left behind.
4. **Do not edit committed results.** If a grader or a result was wrong, fix
   it in a new commit and say what changed and why in the results README.

`evals/README.md` shows how to regrade a committed run.

## Before you open a pull request

Run the gate from `skills/measured-type/`, with `MT_PYTHON` set:

```bash
npm test
```

and include the last lines of its output (tests, pass, fail, skipped) in the
pull request. There is no CI on pull requests; the maintainer runs the same
gate locally before merging.

Then:

- Keep the pull request to one change, linked to its issue.
- Fill in the pull request template.
- Sign off each commit (`git commit -s`), which certifies the
  [Developer Certificate of Origin](https://developercertificate.org/): that
  you wrote the change or have the right to submit it.

Pull requests are squash-merged. Small, focused ones are reviewed fastest.

## Licensing of contributions

This repository uses more than one license, and a contribution takes the
license of the files it changes:

- **Text** (SKILL.md, `references/` and the prose in `evals/`) is CC BY-NC
  4.0, because it adapts Richard Rutter's webtypography.net. Text you
  contribute is shared under CC BY-NC 4.0 too.
- **Code** (the scripts and tests) is MIT. Code you contribute is MIT too.
- **Test fonts** must be under the SIL Open Font License, with the license
  file next to them.
- **The Measured Type name and the artwork in `.github/brand/`** are not open
  for contributions or reuse.

This is the inbound-equals-outbound arrangement that GitHub's terms of
service describe for public repositories; the sign-off above confirms it for
each commit. See [LICENSE](LICENSE) for the full terms.

## Working with a coding agent

Contributions made with a coding agent are welcome on the same terms as any
other: you are responsible for every line, every claim and every number in
them. [AGENTS.md](AGENTS.md) gives an agent the commands and conventions of
this repository. Do not submit a result the agent reports but did not
measure, and do not let it edit committed eval results.

## Conduct and security

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
Report a security problem privately, as [SECURITY.md](SECURITY.md) describes,
not in a public issue.
