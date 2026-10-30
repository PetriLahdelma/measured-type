# Security

## Supported versions

Only the [latest release](https://github.com/PetriLahdelma/measured-type/releases/latest)
and `main` get fixes.

## What the tools do

The scripts run locally. `page-audit.js`, `measure-line.js` and the graders
open the file or URL you give them in a local headless Chromium through
Playwright, which loads that page and everything it requests, as any browser
would. `lint-css.js` and `estimate-measure.js` only read files; the Python
scripts read font files with fontTools. No script sends results or files
anywhere. Besides the pages you audit, the only downloads are `npm install`
and `npx playwright install chromium`, which you run yourself.

Treat a page you audit like any page you open in a browser: an audit runs its
scripts.

## Reporting a vulnerability

Report it privately through
[GitHub's private vulnerability reporting](https://github.com/PetriLahdelma/measured-type/security/advisories/new),
not in a public issue. Include the version or commit, the command you ran and
what happened. You will get an answer in that advisory and credit in the fix
if you want it.
