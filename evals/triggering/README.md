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


## Softer trigger, 29 October 2026 (spec 0003 J)

An outside reviewer asked for a description that does not claim to go
"first, ahead of" other design skills. Two softer wordings were run, then the
freeze-2 description again on the same evening as a same-day baseline, three
runs per prompt each:

| Set | Description | Typography tasks passed | Mean load rate | Near misses passed |
|---|---|--:|--:|--:|
| `trigger-eval.json` (tuning set) | freeze-2, rerun | 1/10 | 20% | 10/10 |
| `trigger-eval.json` (tuning set) | 0003-a "works alongside" | 0/10 | 10% | 10/10 |
| `trigger-eval.json` (tuning set) | 0003-b "use it whenever ... alongside" (shipped) | 0/10 | 10% | 10/10 |
| `trigger-holdout.json` | freeze-2, rerun | 0/6 | 11% | 6/6 |
| `trigger-holdout.json` | 0003-a | 0/6 | 6% | 6/6 |
| `trigger-holdout.json` | 0003-b (shipped) | 0/6 | 11% | 6/6 |

On the fresh holdout set 0003-b loads exactly as often as freeze-2. On the
tuning set, which freeze-2 was optimised on, it loads half as often and loses
that set's one passing prompt; spec 0003 J4 allows a loss of one prompt. The
freeze-2 holdout rate also fell from 22% to 11% between two runs on the same
day, which is the size of the noise in this setup. Files:
`results/2026-10-29-*spec0003*` and `results/2026-10-29-*freeze-2-rerun.json`.

## In a real session, 30 October 2026 (spec 0016)

[Spec 0016](../../specs/0016-triggering-in-session.md), pre-registered in
`7188c1b` before any run. [`session.js`](session.js) copies the real skill
folder to `.claude/skills/` in a small site ([`workspace/`](workspace/)) whose
files the prompts name, runs `claude -p` with user settings, plugins and MCP
servers off, and counts a load any time before the agent's first edit. The
skill at `main` (v1.3.0 description), three runs per prompt; every run's
start event listed the skill.

| Set | Model | Typography tasks passed | Mean load before acting | On the first call | Near misses passed |
|---|---|--:|--:|--:|--:|
| `trigger-eval.json` | Opus 5.5 | 10/10 | 100% | 100% | 10/10 |
| `trigger-holdout.json` | Opus 5.5 | 6/6 | 100% | 78% | 6/6 |
| `trigger-holdout-2.json` (new) | Opus 5.5 | 10/10 | 100% | 90% | 6/6 |
| `trigger-eval.json` | Sonnet 5.5 | 9/10 | 90% | 83% | 10/10 |
| `trigger-holdout.json` | Sonnet 5.5 | 6/6 | 94% | 83% | 6/6 |

Under the rule fixed before the runs (at least 13 of the 16 typography tasks
on Opus across the first two sets, and every near miss), the description
stays as it is; no tuning was run. No near miss loaded the skill in any of
114 runs. Sonnet's one failing prompt asks whether `fonts/Lora-Italic.woff2`
has small caps; the site has no such file, and in all three runs Sonnet
looked for it and stopped without loading the skill. The other Sonnet miss
(one of three runs on the print-styles prompt) edited first.

What changed from the 10% to 20% above: the skill is the real folder rather
than a stub command, the agent has files to look at, and a load after a first
look counts. These runs do not separate the three. The first-call column,
the old measure in the new setup, is already 78% to 100%, so most of the gap
is the setup, not the counting rule.

Limits: the only skills offered were this one and Claude Code's built-in
skills. A user with several typography or design skills installed may see
fewer loads; that is not tested. Three runs per prompt, one day, two models.
The runs started before `3c55fea` pre-approved read-only `find` as well as
`ls`, `cat`, `head`, `tail`, `wc`, `grep` and `file`; the runner no longer
approves `find`. Files: `results/2026-10-30-session-*.json`.
