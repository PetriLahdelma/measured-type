# Spec 0033: the skill and plugin are named measured-typography

Status: accepted 10 November 2026. Each requirement has an ID; the test that
proves it carries the same ID in its name (`tools/test/rename.test.js`).

## Why

Skill search ranks by name first: `gh skill search` lists skills whose name
contains the query before those whose description does. On 9 November a
search for "typography" returned 13 skills, every one with the word in its
name, and not this one. The review of 5 November recommended renaming the
skill, not the repository or the brand, while installs are few and before
the directory listings go out (awesome-claude-code opens on 13 November).

The Agent Skills specification requires a skill's `name` to match its
folder, so the folder moves with the name. Claude Code migrates installed
plugins through a `renames` map in the marketplace (Claude Code docs,
"Migrate users with a renames map"); it has no mechanism for renaming a
marketplace, so the marketplace keeps its name. The repository keeps its
name too, so its URL, stars, releases and badges are unchanged.

## Requirements

- **E1** The skill lives in `skills/measured-typography/`, and its `SKILL.md`
  frontmatter `name` is `measured-typography`, matching the folder.
- **E2** The plugin is named `measured-typography` in its manifest, in the
  Cursor manifest and in the marketplace entry, whose `source` is
  `./skills/measured-typography`. The marketplace keeps the name
  `measured-type` and maps the old plugin name to the new one with
  `"renames": { "measured-type": "measured-typography" }`.
  `claude plugin validate --strict` passes for the marketplace and the plugin.
  Checked with a real install in a separate Claude config: after the
  marketplace update, the enabled plugin's key in the settings was renamed,
  and one `/plugin install measured-typography@measured-type` installed it
  under the new name. The README and the old folder's pointer say so.
- **E3** Every install line and first-task prompt in the README, `docs/` and
  the plugin README uses the new name: `--skill measured-typography`,
  `/plugin install measured-typography@measured-type`,
  `gh skill install PetriLahdelma/measured-type measured-typography`, "Use
  measured-typography", and paths under `skills/measured-typography/` or
  `~/.claude/skills/measured-typography/`. No current document gives the old
  skill name as something to type.
- **E4** `skills/measured-type/` holds only a README that says where the skill
  moved, so a link to the old folder lands on a pointer, and no tool finds a
  second skill there (no `SKILL.md`).
- **E5** The repository, the brand, the marketplace name, the virtual
  environment path and the package names keep "measured-type"; the
  changelog, specs and committed results keep the old paths as history.
