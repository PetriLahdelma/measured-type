# Spec 0026: a plugin manifest, a plugin README and plain words

Status: accepted 5 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`tools/test/plugin.test.js`; Q2
also rewrites P1 and P2 in `tools/test/marketplace.test.js`, which it
supersedes).

## Why

The 5 November review found the plugin folder has no manifest, so
`claude plugin validate --strict` fails on it and Anthropic's directory would
list it for Claude Code only; the skill's description holds its key term
inside quotation marks and opens with words nobody searches for (a rewrite
was tried and withdrawn, see Q4); and the README names no install line for
Codex or Cursor, although the skills CLI already reaches both. The directory, skills.sh and `find-skills` are where
the people this skill is for look for one, so the folder they would get has to
validate, explain what it runs and say what it is in the words they type.

The plugin root stays the skill folder, `skills/measured-type/`, so one folder
serves the skills CLI, `gh skill`, the Claude Code marketplace and the
directory, and Claude Code's lockfile install keeps fetching Playwright for
plugin users. One consequence to know: a copy of the folder under
`~/.claude/skills/` now carries `.claude-plugin/plugin.json`, so Claude Code
loads it as a skills-directory plugin named `measured-type` whose one skill is
`measured-type`; the description, and so the triggering, are the same.

## Requirements

- **Q1** `skills/measured-type/.claude-plugin/plugin.json` exists and names
  the plugin `measured-type`, with `version` equal to CITATION.cff and the
  newest CHANGELOG release, a `description`, an `author` with a name and no
  email address, `homepage`, `repository`, an SPDX `license`, `keywords` and
  `skills: ["./"]`, so the folder's own `SKILL.md` is the plugin's skill.
- **Q2** The marketplace entry declares no component field (`skills`,
  `commands`, `agents`, `hooks`), no `strict` and no `version`, so
  `plugin.json` is the manifest and the two cannot disagree.
  `claude plugin validate --strict` passes for the marketplace root and for
  the plugin folder. Before, the entry carried `strict: false` and `skills`,
  which with a manifest present is a conflict that stops the plugin loading,
  and the folder failed validation with "No manifest found".
- **Q3** The plugin folder has a `README.md` of at least 40 words outside
  code blocks (the directory's floor) that says what the scripts open,
  download and read (the page you name in a headless Chromium, Playwright's
  Chromium download, local stylesheets and font files, nothing sent anywhere)
  and gives the install lines for the marketplace and the skills CLI.
- **Q4** The skill's description stays the wording whose triggering was
  measured (spec 0016, 30 October, repeated 5 November). A plain-words
  opening ("Web typography for agents: measures line length, zoom growth,
  contrast, tabular figures and font coverage ...") was written for search,
  run through spec 0016's protocol on 5 November (240 runs) and compared with
  the measured wording on the same afternoon (132 control runs): it tied on
  typography tasks with Opus, lost one Sonnet holdout prompt and loaded on 3
  of 114 near-miss runs against 0 of 66 for the measured wording, so under
  the rule spec 0016 fixed for a new wording it does not ship
  (`evals/triggering/README.md`). The searched words live where people and
  search read them instead: the plugin manifest, the marketplace entry and
  the READMEs, none of which the model reads before loading the skill. The
  test keeps the description within 1,024 characters and SKILL.md within its
  word budget (spec 0014 B1).
- **Q5** The README gives skills CLI install lines for Codex and Cursor
  beside the Claude Code one.
- **Q6** The plugin folder keeps within the directory's automatic limits: at
  most 512 files outside `node_modules`, every file that is not an image or a
  font under 256 KiB and no `.DS_Store`.

Added the same day, for the listings:

- **Q7** The repository root carries `.cursor-plugin/plugin.json`, the
  manifest Cursor's plugin template and cursor.directory read, with the same
  name, version (tied to CITATION.cff and the changelog), description, author
  without an email, licence and keywords as the Claude manifest, and a `logo`
  path inside the repository. cursor.directory detects the skill itself at
  `skills/measured-type/SKILL.md`, the path its scanner looks for.
- **Q8** The Claude manifest carries the directory listing links
  `documentationUrl` and `supportUrl` as `https://` URLs, so the listing
  points at the README and at Discussions; `claude plugin validate --strict`
  still passes (Claude Code 2.1.281 and later accept the fields).
