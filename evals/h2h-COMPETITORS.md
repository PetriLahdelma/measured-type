# Head-to-head configurations (spec 0001, part E)

The `h2h-*` cases run under seven configurations, two runs each, same prompts,
same graders. Graders see anonymized run folders and never the configuration.
Competitor skills are cloned locally at the commits below for the runs only;
their files are not copied into this repository.

| Configuration | Source | Commit | License | Skill folder used |
|---|---|---|---|---|
| none | no skill | | | |
| measured-type | this repository, tag `content-freeze-3` | 356fca4 | CC BY-NC 4.0 / MIT | `skills/measured-type` |
| frontend-design | https://github.com/anthropics/skills | ca45fc4 | Apache-2.0 (LICENSE.txt in the folder) | `skills/frontend-design` |
| impeccable | https://github.com/pbakaus/impeccable | 5e745ac | Apache-2.0 | `.claude/skills/impeccable` |
| better-typography | https://github.com/jakubkrehel/skills | 592aedc | MIT | `skills/better-typography` |
| practicaltypography | https://github.com/danium/practicaltypography | dc7c25f | MIT | `skills/typography` |
| wondelai web-typography | https://github.com/wondelai/skills | c172996 | MIT | `web-typography` |

Every configuration with a skill gets the same instruction: read the skill's
SKILL.md before starting, follow it, read its references and run its scripts
as it directs. The no-skill configuration gets the task alone.

Acceptance (E3): Measured Type passes more pooled assertions than every other
configuration. Ties and losses are published as they come out; cases are not
edited after a run.
