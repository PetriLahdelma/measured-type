# Spec 0023: the skill's shape follows Anthropic's authoring guidance

Status: accepted 2 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name
(`skills/measured-type/scripts/test/structure.test.js`).

## Why

Anthropic's skill authoring guidance
(platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
says an agent may preview a reference file with a partial read such as
`head -100`, so a reference longer than 100 lines should open with a table
of contents that shows its whole scope. It also asks for references one
level deep from `SKILL.md`, a `SKILL.md` body under 500 lines and a feedback
loop (run the validator, fix, run it again) on quality-critical work.

Three references were over 100 lines without a contents list:
`audit.md` (146), `screen-and-ui.md` (112) and `taste.md` (169). An agent
that previewed the first 100 lines of `taste.md` never saw "Template tells
to avoid" or "Reviewing with a point of view", and one that previewed
`audit.md` never reached the rule catalogue. The audit workflow ended at the
report: nothing told the agent to run the tools again after its fixes, so a
fix that did not take was reported as done. The type-scale workflow said the
script exits 1 on a failing step without saying to change the inputs and
run it again.

## Requirements

### S. Structure

- **S1** Every reference file longer than 100 lines has a `## Contents`
  section before its first other `##` heading.
- **S2** Each `##` heading in such a file appears in its contents list: the
  heading's first two words, compared without case or punctuation, occur in
  the list, so a section added later without a contents entry fails.
- **S3** No reference sends the reader to another reference that `SKILL.md`
  does not name, so every reference is one read away from `SKILL.md`.
- **S4** `SKILL.md` is under 500 lines, Anthropic's limit for the body. The
  2,300-word budget of spec 0014 still applies and is the stricter of the
  two.

### F. Feedback loops

- **F1** The audit workflow in `SKILL.md` tells the agent to run the same
  tools again after applying fixes and to report what still fails, so a
  report says what was fixed only after a rerun showed it.
- **F2** The type-scale workflow tells the agent to change the inputs and
  run `type-scale.js` again until it exits 0.

### T. Time

- **T1** `SKILL.md` ties no instruction to a year ("CSS for 2026", "as of
  2026"): the guidance asks for no time-sensitive information, and the skill
  outlives the year it was written in. Dated measurements in the references
  ("calibrated on 29 October 2026") stay, because the date is part of the
  evidence.

## Not in scope

The UX Planet article that prompted this review (2 November 2026) also says
Claude previews only the first 100 lines of `SKILL.md` itself, and that
newer models need less prescriptive skills. Neither claim is in Anthropic's
guidance, so neither is a requirement here. The sections of `SKILL.md`
already put the classification, the core rules and the workflows before the
reference table.
