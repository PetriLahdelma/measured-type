# Running the evals

The cases here use the layout that `claude plugin eval` and the skill-creator
workflow read: `prompt.md`, `case.yaml`, one grader file per assertion and
input files under `files/`.

| Folder | What it holds |
|---|---|
| `measure-wide-face`, `ofl-feature-check`, `physical-props-audit`, `rendered-nbsp-spec-table`, `zoom-safe-scale` | The development set, written while the skill was written |
| `heldout-*` | Cases written after `content-freeze-1`, committed before any run |
| `h2h-*` | Head-to-head cases with deterministic graders in [`h2h-grade.js`](h2h-grade.js); [`h2h-COMPETITORS.md`](h2h-COMPETITORS.md) lists the other skills and their commits; [`h2h-3-brief.md`](h2h-3-brief.md) is the runner brief without a browser |
| `2x2/` | The skill and a browser varied independently (spec 0007): runner briefs and the pre-registered [`analyze.js`](2x2/analyze.js) |
| `0008/` | The one-sentence hint arm and ten runs per cell (spec 0008): the pre-registered [`analyze.js`](0008/analyze.js), which pools the 2×2 runs |
| `triggering/` | Whether the skill loads on its own, with skill-creator's `run_eval.py` |
| `results/` | Every run's outputs, grades and timings, with a README of method, results and disclosures per experiment |

The runs read the skill directly, so they measure its content, not whether it
loads.

## Recheck a committed result

Count the lines of a run's output yourself:

```bash
node skills/measured-type/scripts/measure-line.js --css evals/results/iteration-1/measure-wide-face/with_skill/run-1/outputs/prose.css
```

Grade a head-to-head run again (the graders render each output in Chromium and
print `grading.json`):

```bash
NODE_PATH=skills/measured-type/node_modules node evals/h2h-grade.js h2h-dashboard evals/results/h2h-3/runs/h2h-dashboard/pkfafu/outputs
```

Run both from the repository root. The `ofl-feature-check` and
`heldout-results-table` outputs reference `fonts/`: copy the case's
`files/fonts/` next to them first. The results folders do not duplicate the
font files.
