# Spec 0028: a measurement of 100 public pages and templates

Status: pre-registered 5 November 2026, before any page of the corpus was run.
The test that keeps the list and the analysis honest is
`tools/test/corpus.test.js` (Z1 to Z4).

## Question

What do `page-audit.js` and `measure-line.js` report on widely used public
pages: how long are the lines, how far does display type grow under 200% zoom,
how common is each finding and how often is a finding wrong? This is a study
of pages and of the tools. It compares no skills, and it says nothing about
agent output.

## Corpus

[`evals/0028/corpus.json`](../evals/0028/corpus.json), frozen by
[`evals/0028/preflight.js`](../evals/0028/preflight.js) from
[`evals/0028/candidates.json`](../evals/0028/candidates.json). Four categories,
25 pages each:

- **Design system**: each system's own typography page where it has one.
- **Developer docs**: a getting-started or reference page.
- **Reading**: long-lived articles and essays.
- **Template**: live demos of documentation, blog, shop and admin templates.

Candidates were listed by hand from memory of widely used sites. In each
category the first 25 that answered 200 to a status request are primary and the
next 5 are reserves. **This is a convenience sample of well-known pages, not a
random one, and it supports no claim about the web at large.** The author's own
site is left out. Four hosts in it were audited during earlier work on the tools
(stripe.com, developer.mozilla.org, primer.style, designsystem.suomi.fi), so the
tools have already been corrected against them.

## Method

[`evals/0028/run.js`](../evals/0028/run.js), Measured Type at `v1.5.0`, Chromium
through its pinned Playwright, three pages at a time. For each page:

1. `page-audit.js <url> --json`.
2. `measure-line.js <url> "main p, article p, [role=main] p" --json` at 1280px,
   and on `p` if that matches no element or fewer than three full lines.

A page that errors or times out (300 seconds per tool) is retried once, then
recorded as failed and replaced by the next reserve in its category. Bot walls
that answer 200 cannot be told apart and are audited as served; consent banners
stay on the page. An exit code of 3 stops the study, because it means the browser
is missing. **The tools are not changed during the run.** A tool fault found by
the run is reported, and any fix goes to a later spec with its re-run reported
separately.

## What is reported

From [`evals/0028/analyze.js`](../evals/0028/analyze.js), overall and by category:

- **Line length**: the median of the pages' average characters per full line and
  the share of pages under 45, within 45 to 75 and over 75, on pages with at least
  three full lines. The band is Bringhurst's, not a standard.
- **Zoom**: the share of pages with display type under 1.6× at 200% zoom on a
  1280px window (this project's bar, not WCAG's), the median lowest growth and the
  share with MT-ZOOM-VW.
- **Every rule**: the pages with at least one finding, by severity.
- **Verdicts**: Block, Approve with work left and Approve.
- **What could not be checked**: the commonest Not verified entries.

Pages with no number columns cannot be separated from pages whose columns pass, so
MT-TABULAR and MT-NUM-ALIGN are reported as a share of all pages and say so.

## How often the tools are wrong

For each of MT-CONTRAST, MT-REFLOW, MT-TEXT-SPACING and MT-ZOOM-VW, five findings
are drawn by hash (`spotSample`: pages ordered by the SHA-256 of URL and rule, the
first finding by location). Each is checked against the live page with code that
does not use the tools' helpers and marked true, false or unclear. Five line
counts, drawn the same way, are recounted the same way.

- A rule with two or more false findings of five is marked **not reliable** in the
  write-up, and its prevalence is not used as a claim until a fix is re-measured.
- The sample size is small and is reported as such: five checks bound a false
  rate only roughly.

## How it will be read (fixed now)

- No ranking of sites and no per-site verdict in the write-up. It reports
  categories and rules.
- A verdict of Block means the tool found a HIGH finding. It is not reported as a
  WCAG conformance result: an automated run cannot establish conformance, and it
  sees one page in Chromium.
- No conclusion about what agents or any skill would do follows from this study.
- The aggregate is written up either way. Per-page reports name public sites, so
  whether they are committed to this repository is the owner's decision after the
  run, not a default.
