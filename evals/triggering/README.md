# Triggering eval

Twenty prompts, ten that should load the skill and ten near misses that
should not. Written after `content-freeze-1`, before the skill was run on
them. A run counts as triggered when the agent opens the skill (the
skill-creator `run_eval.py` method: the skill is offered as a project command
and detection watches for the Skill or Read tool naming it). Each prompt runs
three times; a prompt passes when its trigger rate is on the right side of
0.5. User-level skills and plugins are switched off for the run so a similar
personal skill cannot compete.
