# Measured Type

An agent skill for web typography: Bringhurst's rules in current CSS, with
scripts that measure line length, zoom growth, contrast, tabular figures and
font coverage in a real browser or in the font file. This folder is the skill
(`SKILL.md` and `references/`) and its scripts (`scripts/`). The evidence,
specs and evals live in the repository,
[github.com/PetriLahdelma/measured-type](https://github.com/PetriLahdelma/measured-type).

## Install

As a Claude Code plugin, from the repository's marketplace:

```
/plugin marketplace add PetriLahdelma/measured-type
/plugin install measured-type@measured-type
```

With the skills CLI, into Claude Code, Codex, Cursor or any of its other
agents:

```bash
npx skills add PetriLahdelma/measured-type --skill measured-type --agent claude-code -g
npx skills add PetriLahdelma/measured-type --skill measured-type --agent codex -g
npx skills add PetriLahdelma/measured-type --skill measured-type --agent cursor -g
```

With the GitHub CLI (preview): `gh skill install PetriLahdelma/measured-type measured-type`.

## What it runs, opens and fetches

Nothing runs at install beyond what the installer does itself: Claude Code
installs the pinned Playwright package from `package-lock.json` (the npm
registry, install scripts disabled). The scripts run only when the agent
calls them:

- `page-audit.js` and `measure-line.js` open the page you name in a headless
  Chromium that Playwright downloads once (`npx playwright install chromium`,
  about 150 MB) and fetch that page's own resources, nothing else.
- `lint-css.js`, `estimate-measure.js`, `type-scale.js`, `contrast-fix.js`
  and `apca.js` read local files and arguments, with no network.
- `font-features.py` and `fallback-metrics.py` read font files with
  fontTools, with no network.

Nothing is sent anywhere and there is no telemetry. The only writes are the
report on standard output and, for `measure-line.js --css`, a temporary HTML
file in the system's temporary folder.

## Set up the measuring scripts

Without them the skill advises and lints; `page-audit.js --lite` lists every
check it skipped.

```bash
npm install && npx playwright install chromium
python3 -m venv ~/.venvs/measured-type
~/.venvs/measured-type/bin/pip install fonttools brotli
export MT_PYTHON=~/.venvs/measured-type/bin/python
npm test
```

## Use

Name the skill for a first task: *Use measured-type to audit the typography
in styles.css and fix the HIGH findings. Measure the line length in the
browser.* After that it loads on its own when a request touches how words and
numbers sit on a page.

## Licence

The text (`SKILL.md`, `references/`) is CC BY-NC 4.0, because it adapts
webtypography.net by Richard Rutter; the scripts are MIT. See [LICENSE](LICENSE).
