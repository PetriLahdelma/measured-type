# Spec 0015: install as a Claude Code plugin

Status: accepted 30 October 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`tools/test/marketplace.test.js`).

## Why

Claude Code users install shared skills from plugin marketplaces with
`/plugin marketplace add owner/repo`. The skill could be installed with the
skills CLI, `gh skill` or a copy, but not that way. A marketplace file in this
repository adds the fourth route without moving any files. The plugin root is
`skills/measured-type`, so an install copies the skill and its scripts but
not the evals, which are most of the repository.

A trial install from a local copy on 30 October 2026 (Claude Code
`claude plugin details`) found one skill, `measured-type`, at about 330 tokens
always loaded and 5.6k when it runs, and the installer ran `npm install` for
Playwright. Chromium and fontTools still need the commands in the README.

## Requirements

- **P1** `.claude-plugin/marketplace.json` parses and lists one plugin named
  `measured-type` whose `source` is a folder in this repository holding
  `SKILL.md`, loaded with `"skills": ["./"]` and `"strict": false`.
- **P2** The plugin `version` equals the `version` in `CITATION.cff` and the
  newest release heading in `CHANGELOG.md`, so a release that forgets the
  manifest fails the gate. Plugin updates key on this version.
- **P3** The README install section gives `/plugin marketplace add
  PetriLahdelma/measured-type` and `/plugin install
  measured-type@measured-type`.
- **P4** The manifest names the owner by name and GitHub URL and holds no
  email address.
- **P5** Where the `claude` CLI is installed, `claude plugin validate .
  --strict` passes; elsewhere the test skips and says why.
- **P6** The gate's tools step runs every `*.test.js` in `tools/test`, so
  these checks block a push like the others. (It ran only `gate.test.js`.)
