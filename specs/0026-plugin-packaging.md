# Spec 0026: a plugin manifest, a plugin README and plain words

Status: accepted 5 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`tools/test/plugin.test.js`; Q2
also rewrites P1 and P2 in `tools/test/marketplace.test.js`, which it
supersedes).

## Why

The 5 November review found the plugin folder has no manifest, so
`claude plugin validate --strict` fails on it and Anthropic's directory would
list it for Claude Code only; the skill's description holds its key term
inside quotation marks and opens with words nobody searches for; and the
README names no install line for Codex or Cursor, although the skills CLI
already reaches both. The directory, skills.sh and `find-skills` are where
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
- **Q4** The skill's description opens with plain searched words, "Web
  typography", and names line length, zoom, a type scale and a typography
  audit without quotation marks, in the third person, within 1,024
  characters; the trigger list, the "alongside" sentence and the product-UI
  words stay (spec 0003 J1 to J3 and L), and SKILL.md stays within its word
  budget (spec 0014 B1). The in-session triggering result of spec 0016 was
  measured with the old wording and should be run again before the next
  release.
- **Q5** The README gives skills CLI install lines for Codex and Cursor
  beside the Claude Code one.
- **Q6** The plugin folder keeps within the directory's automatic limits: at
  most 512 files outside `node_modules`, every file that is not an image or a
  font under 256 KiB and no `.DS_Store`.
