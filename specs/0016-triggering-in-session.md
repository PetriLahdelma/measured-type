# Spec 0016: triggering measured in a real session

Status: pre-registered 30 October 2026, before any run of the sets below.
Results in [`evals/triggering/`](../evals/triggering/README.md).

## Question

The triggering eval so far (spec 0003, skill-creator's `run_eval.py`) found
the skill loading on about one typography task in ten. That method offers
the skill as a stub project command rather than the real skill folder, runs
in an empty directory, and counts only the agent's first tool call, so an
agent that looks at the files and then opens the skill counts as a miss. How
often does the description on `main` (v1.3.0) load the skill when it is
installed as a real project skill and the agent has a site to work in?

## Method

[`evals/triggering/session.js`](../evals/triggering/session.js), tested in
`tools/test/trigger-session.test.js` (T1 to T7):

- Each run gets a fresh copy of [`evals/triggering/workspace/`](../evals/triggering/workspace/),
  a small site whose files the prompts name, with `skills/measured-type`
  copied to `.claude/skills/measured-type`.
- `claude -p` with `--setting-sources project`, `--strict-mcp-config` and no
  session persistence, so user skills, plugins and MCP servers are not
  offered; Claude Code's built-in skills are, as in a real install. The
  start event's skill list is recorded to confirm the skill was offered.
- Read, Glob, Grep and read-only shell commands are allowed. Agents, web
  tools and scheduling are switched off. At most 12 turns, 300 seconds.
- **Loaded before acting** (the primary measure): the agent calls the Skill
  tool with the skill or reads its `SKILL.md` before its first Edit or Write.
  The run stops at whichever comes first. A run that answers without either
  is a miss. The first-call rate, the old measure, is recorded alongside.
- A prompt passes when its rate is above 0.5 for a typography task and below
  0.5 for a near miss, as before.

## Runs

| Set | Prompts | Model | Runs per prompt |
|---|---|---|--:|
| `trigger-eval.json` | 10 typography, 10 near misses | Claude Opus 5.5 | 3 |
| `trigger-holdout.json` | 6 and 6 | Claude Opus 5.5 | 3 |
| `trigger-holdout-2.json` (new, written with this spec) | 10 and 6 | Claude Opus 5.5 | 3 |
| `trigger-eval.json` and `trigger-holdout.json` | as above | Claude Sonnet 5.5 | 3 |

## How it will be read (fixed now)

- The description is left alone if, on Opus across `trigger-eval.json` and
  `trigger-holdout.json`, at least 13 of the 16 typography tasks pass (80%)
  and every near miss passes.
- Otherwise a new description is written against `trigger-eval.json` only
  and compared with the current one on `trigger-holdout-2.json`, three runs
  per prompt each, on the same day. It ships if its mean load rate on that
  set's typography tasks is at least 15 points higher and no more near misses
  fail. Anything less is reported as no detectable improvement, and the
  description stays.
- Any change to the description also keeps SKILL.md inside its word budget
  (spec 0014).
