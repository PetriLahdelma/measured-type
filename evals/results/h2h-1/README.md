# Head-to-head 1 (spec 0001, part E)

Three cases (`evals/h2h-page-audit`, `h2h-font-loading`, `h2h-rtl`) with 20
assertions in all. Seven configurations, two runs each: 42 runs on Claude Opus
5.5, 29 October 2026. The cases and graders were committed before any run
(`4aaecde`); the Measured Type skill was frozen at `content-freeze-3`
(`356fca4`). Competitor skills and their commits are listed in
[`../../h2h-COMPETITORS.md`](../../h2h-COMPETITORS.md). Run folders are
anonymized (`runs/<case>/<id>/`) and were graded before the key was opened;
[`key.json`](key.json) maps each id to its configuration.

Grading is deterministic: [`../../h2h-grade.js`](../../h2h-grade.js) renders each
output in Chromium and measures it. Every run folder holds `grading.json`
(corrected graders), `grading.frozen.json` (the graders as committed before the
runs), `timing.json` and the files the run wrote (fonts and screenshots
removed).

## Result

| Configuration | Frozen graders | Corrected graders | Page audit | Font loading | RTL | Mean time | Mean tokens |
|---|--:|--:|---|---|---|--:|--:|
| measured-type | **40/40** | **40/40** | 8/8, 8/8 | 5/5, 5/5 | 7/7, 7/7 | 298 s | 164k |
| frontend-design | 38/40 | **40/40** | 8/8, 8/8 | 5/5, 5/5 | 7/7, 7/7 | 240 s | 145k |
| none (no skill) | 38/40 | 39/40 | 8/8, 7/8 | 5/5, 5/5 | 7/7, 7/7 | 293 s | 139k |
| impeccable | 37/40 | 39/40 | 7/8, 8/8 | 5/5, 5/5 | 7/7, 7/7 | 409 s | 168k |
| practicaltypography | 37/40 | 39/40 | 8/8, 7/8 | 5/5, 5/5 | 7/7, 7/7 | 327 s | 153k |
| better-typography | 37/40 | 38/40 | 7/8, 7/8 | 5/5, 5/5 | 7/7, 7/7 | 241 s | 149k |
| wondelai web-typography | 37/40 | 38/40 | 8/8, 7/8 | 5/5, 5/5 | 7/7, 6/7 | 237 s | 153k |

Per-case columns use the corrected graders.

**Acceptance E3** ("Measured Type passes more pooled assertions than every
other configuration") is met under the frozen graders, 40 against at most 38.
Under the corrected graders it is not met: frontend-design ties at 40/40. The
spread is small everywhere. Every configuration, including no skill at all,
scored at least 37 of 40. With two runs per cell, one assertion is noise.

## What separated the configurations

- **Line length you count, not assume (page audit, assertion 3).** Five runs
  across four configurations (none, impeccable, better-typography twice and
  practicaltypography) shortened the body text but left the 112-character
  `.meta` byline at the full container width, where it sets 79 characters on
  its one full line. The assertion includes every paragraph over 100
  characters; a reader could argue a byline is not body text. Both Measured
  Type runs and both frontend-design runs brought the byline within range too.
- **Naming the contrast failure (page audit, assertion 8).** One wondelai run
  fixed the `.meta` grey but never gave its contrast figure.
- **Mirroring twice (RTL, assertion 2).** One wondelai run swapped the
  breadcrumb `›` for `‹` without isolating it. Browsers already mirror `›` in
  right-to-left text, so the swap flipped it back: rendered, it points right in
  both directions. This is the failure the assertion was written for.
- **Font loading did not separate anything.** All 14 runs self-hosted the
  variable font, built a metric-matched Georgia fallback per style and kept
  line count and height within the bounds. Three runs (one each of none,
  Measured Type and impeccable) chose `font-display: optional` to remove the
  last re-wraps, trading a first-view web font for zero reflow.

## Corrections after the runs (disclosed)

1. **RTL assertion 2 was replaced.** As frozen, it required the separator's
   `::before` content to stay U+203A with no mirroring transform. Nine runs
   isolated the separator as left-to-right and set U+2039, or drew a chevron in
   CSS. Those render correctly. The frozen check failed them all: it tested
   a property of the source, not the page. The corrected check
   (`separatorPoints` in `h2h-grade.js`, criterion text updated) reads the
   rendered pixels and requires the separator to point left in RTL and right in
   LTR. It was validated on three variants before regrading: unchanged input
   (passes, since browsers mirror `›`), swap without isolation (fails, points
   right) and swap with isolation (passes). Pixel orientation was confirmed in
   Chromium and WebKit. The corrected grader moved every configuration except
   Measured Type up by one or two. It changed one result: frontend-design
   rose from 38 to 40.
2. **One flaky grade was rerun.** The font-loading grader renders a "loaded"
   state. With `font-display: optional` a 1.2 MB font must arrive within about
   100 ms; once, while other grading ran in parallel, it did not, and a no-skill
   run scored 3/5. The three `optional` runs were each regraded five times in a
   row and scored 5/5 every time; the table uses that result.
3. **Probe files touched running workspaces.** While checking the separator,
   an `__probe.html` copy of each run's page was written into RTL output
   folders, including folders of runs still in progress. One runner (a
   practicaltypography run) noticed it and left it alone. The files were
   deleted before grading and are not part of any output here.

## Limits

- Two runs per configuration, one model, one day.
- The RTL graders render the English markup with `dir="rtl" lang="ar"`; two
  runners reported that the separator's mirroring can differ with Arabic text
  beside it, which these graders do not test.
- The cases were built from failure modes seen in earlier runs. Font loading
  turned out not to be one for this model; the other two cases separate
  configurations by single assertions.
- Measured Type runs cost about 25k tokens more than no skill at a similar
  time, mostly spent reading references and running the bundled scripts.
