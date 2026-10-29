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

