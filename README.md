# measured-type

An agent skill for setting text on the web: Bringhurst's *Elements of
Typographic Style* translated into CSS that ships in 2026, with every claim
that can be measured checked in a real browser.

Several typography skills already exist. This one concentrates on what most
of them do not cover:

- **Measured corrections, not rules of thumb.** `66ch` is not 66 characters:
  `1ch` is the width of the zero, so in Verdana `66ch` renders 81 characters
  and in Outfit, a wide geometric sans, 97 (both at 18px). `rlh` is the body line only when the body
  is set at the root size. `Intl.NumberFormat` currency and percent output
  carry no-break spaces, but `style: 'unit'` emits a plain space that lets
  "18 h" break across lines. A half-line margin under a heading collapses
  into the next element's full-line margin and silently doubles. Fluid type
  with a `vi` term grows less than 2x at 200% zoom, so the skill does the
  ratio math before choosing a `clamp()`.
- **Logical properties and direction from the start.** Every rule is written
  flow-relative, so an RTL or vertical edition is a content change. Audits
  convert physical properties without redesigning the LTR page, mirror only
  directional glyphs and offsets, leave decorative ones alone and never
  double-mirror a Bidi_Mirrored character.
- **Locale conventions as a pattern.** Quotes, decimal marks, grouping, unit
  spacing, dates, heading case and compound hyphenation, worked through for
  English, Finnish and Swedish. Finnish and Swedish compounds are where
  unhyphenated narrow columns fail first.
- **Font files, not font names.** A feature tag is not coverage. The bundled
  script counts what `smcp`, `onum` or `case` actually maps, per file: in
  Source Serif 4 the roman has small caps and the italic has none.
- **A baseline eval suite.** Five eval cases run with and without the skill;
  the results are committed so the numbers below can be checked and rerun.

## Results

Five eval cases, each run twice with the skill and twice without it
(Claude Opus 5.5, 2026-10-29). Rendered claims (line length, zoom ratios,
the characters in the DOM) were measured in Chromium, not read off the
source.

| Case | With skill | Without | What decides it |
|---|---|---|---|
| zoom-safe-scale | 10/10 | 4/10 | fluid hero kept to 1.6x+ at 200% zoom; h3/h4 still 1.15x apart at 360px; spacing from the body line |
| rendered-nbsp-spec-table | 12/12 | 9/12 | logical properties; "up to" bound to its number |
| physical-props-audit | 25/26 | 22/26 | decorative shadow and rotation left physical; 75ch in Verdana named as 92 characters |
| ofl-feature-check | 16/16 | 15/16 | all synthesis disabled, not only small caps |
| measure-wide-face | 14/14 | 13/14 | h3 after h2 spaced a full body line |
| **All assertions** | **77/78 (98.7%)** | **63/78 (80.8%)** | mean per-run pass rate 99% vs 77% |

Runs with the skill took about 35 seconds and 21k tokens more each, spent
reading references and running the scripts.

Gains concentrate in specific cases. A current model without the skill already
knows most typographic CSS, measures line length on its own when it can and
gets locale number formatting right. The skill earns its keep where the model
would otherwise trust a formula: fluid type scales under zoom
(the clearest gap: 10/10 against 4/10, matching an earlier run of the same
case), RTL audits that convert text flow without touching decoration and
small details such as binding a qualifier to its number. On line length
alone the baseline now measures Verdana correctly by itself, so that case no
longer separates the two. With two runs per configuration, treat a
one-assertion difference as noise. Full report:
[`evals/results/iteration-1/benchmark.md`](evals/results/iteration-1/benchmark.md).

## Install

The skill lives in `skills/measured-type/`.

**Claude Code** (personal skill, available in every project):

```bash
git clone https://github.com/PetriLahdelma/measured-type.git
cp -R measured-type/skills/measured-type ~/.claude/skills/
```

For one project only, copy it to `.claude/skills/` in that repository instead.

**GitHub CLI** (`gh skill`, preview), for Claude Code or any other supported
agent:

```bash
gh skill install PetriLahdelma/measured-type measured-type --agent claude-code --scope user
```

**Script dependencies** (optional; the skill works without them, but cannot
measure):

```bash
cd ~/.claude/skills/measured-type
npm install && npx playwright install chromium   # scripts/measure-line.js
pip install fonttools brotli                      # scripts/font-features.py
```

## Scripts

`scripts/measure-line.js` lays text out in Chromium and counts characters per
full line. It reports the box in px, `ch` and `em` and the zero width against
the average character, so a wrong measure can be corrected in one step.

```bash
node scripts/measure-line.js --css prose.css              # built-in sample prose
node scripts/measure-line.js https://example.com ".prose > p" --zoom 2
```

`scripts/font-features.py` lists GSUB and GPOS features per file and counts
the characters each text feature covers.

```bash
python3 scripts/font-features.py fonts/*.woff2 --check smcp=abcdefghijklmnopqrstuvwxyzäöå
```

## What the skill covers

Reading, display and interface text are classified first, because book rules
applied to buttons are their own mistake. Then: measure, leading, vertical
rhythm with a body-line unit and `text-box`, paragraph marking, ragged and
justified setting, hyphenation limits per language, letterspacing caps and
small caps, kerning, type scales in `rem` with zoom-safe fluid steps, text,
lining and tabular figures, true small caps, hard spaces, widows and runts,
punctuation glyphs, legacy CSS that was renamed or never shipped and a
taste reference for review with a point of view.

## Running the evals

The cases in `evals/` use the layout that `claude plugin eval` and the
skill-creator workflow read: `prompt.md`, `case.yaml`, one grader file per
assertion and input files under `files/`. Each was run twice with the skill and
twice without it; the outputs, grades and timings are in `evals/results/`.
The runs read the skill directly, so they measure its content, not whether it
triggers. To rerun the measure check on a committed output:

```bash
node skills/measured-type/scripts/measure-line.js --css evals/results/iteration-1/measure-wide-face/with_skill/run-1/outputs/prose.css
```

The `ofl-feature-check` outputs reference `fonts/`; copy
`evals/ofl-feature-check/files/fonts/` next to them first (the results folder
does not duplicate the font files).

## License

Text (SKILL.md, references, eval prose) is CC BY-NC 4.0 because it adapts
Richard Rutter's [webtypography.net](https://webtypography.net), which is
published under that license. Scripts are MIT. The test fonts are under the
SIL Open Font License. See [LICENSE](LICENSE).

The rules follow Robert Bringhurst, *The Elements of Typographic Style*, and
the rule order of webtypography.net; they are paraphrased and the CSS is
rewritten for current browsers.
