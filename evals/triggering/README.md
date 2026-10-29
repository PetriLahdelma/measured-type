# Triggering eval

Twenty prompts, ten that should load the skill and ten near misses that
should not. Written after `content-freeze-1`, before the skill was run on
them. A run counts as triggered when the agent opens the skill (the
skill-creator `run_eval.py` method: the skill is offered as a project command
and detection watches for the Skill or Read tool naming it). Each prompt runs
three times; a prompt passes when its trigger rate is on the right side of
0.5. User-level skills and plugins are switched off for the run so a similar
personal skill cannot compete.

## Result, 29 October 2026 (skill at content-freeze-1, claude-opus-5-5)

`results/2026-10-29-content-freeze-1.json`. Near misses: 10 of 10 correctly not
loaded (trigger rate 0 for every one). Typography tasks: 1 of 10 passed the 0.5
threshold ("Review the typography in landing.css", 2 of 3 runs); two more
loaded in 1 of 3 runs (the long-lines prose fix and the Swedish compounds); the
other seven never loaded. A prompt that names the skill loaded it in a control
run. Detection counts only the agent's first tool call, so an agent that looks
at files first and opens the skill later counts as a miss: the recall figure is
a lower bound.

## Description tuning, 29 October 2026 (content-freeze-2)

skill-creator's `run_loop.py`, five iterations on `trigger-eval.json` split
12 train and 8 test, three runs per prompt (`results/2026-10-29-description-loop/`).
The best description scored 6/8 on the test split against 4/8 for the
original; it is the description at `content-freeze-2`.

Measured afterwards (rate = share of runs that opened the skill):

| Set | Description | Typography tasks passed | Mean load rate | Near misses passed |
|---|---|--:|--:|--:|
| `trigger-eval.json` (tuning set) | freeze-1 | 1/10 | 13% | 10/10 |
| `trigger-eval.json` (tuning set) | freeze-2 | 1/10 | 23% | 10/10 |
| `trigger-holdout.json` (fresh, pre-registered) | freeze-1 | 1/6 | 17% | 6/6 |
| `trigger-holdout.json` (fresh, pre-registered) | freeze-2 | 1/6 | 22% | 6/6 |

The tuned description is no worse and slightly more eager, but the change is
within run-to-run noise. Wording alone does not make the skill load on its own
in this setup.

