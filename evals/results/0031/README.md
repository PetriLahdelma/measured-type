# Spec 0031 on the corpus

The three checks of [spec 0031](../../../specs/0031-leading-links-x-height.md)
run over the 100 pages of [spec 0028](../0028/) with `evals/0028/run.js`, on
9 November 2026, before release. Per-page reports name the sites and stay
private, as for 0028 and 0029; this file gives the aggregate.

## Three runs

The first run used the checks as first written. Two of them fired on
interface, not running text, so they were narrowed test-first and the corpus
run again.

| Run | `MT-LINK-COLOUR` | `MT-LH-TIGHT` (rendered) | `MT-SIZE-FLOOR` (x-height) |
|---|--:|--:|--:|
| 1, as first written | 1,298 findings on 44 pages | 35 on 16 pages | 0 |
| 2, interface skipped, links grouped by style | 15 on 14 pages | 10 on 8 pages | 0 |
| 3, leading only on columns of 30 characters or more | 15 on 14 pages | 8 on 6 pages | 0 |

What run 1 caught that was not running text: navigation lists, tables of
contents and sidebars (a `li` holding a link and a nested list), consent
banners, and one container whose own `line-height: 0` was read instead of
its lines' pitch. One long specification page alone gave 1,195 link
findings, one per element path; links styled alike are now one finding with a count
(2,650 on that page in run 2: run 1 counted each element path once, run 2
counts every link).
Run 3 re-audited only the eight pages with leading findings, since the change
can only remove them.

## Spot-check

Ten findings, five of each new check, were re-measured independently: the
link's computed decoration, border, shadow, background, pseudo-elements and
both colours, with a crop of the link; and the paragraph's rendered line
pitch from its text rectangles. All ten hold (5 of 5 and 5 of 5). Two of the
leading findings sit just under the house floor (1.37 and 1.38 against 1.40),
which is a house value, not a standard.

## Verdicts

Pages approved fell from 23 at spec 0029 to 18: five pages now block on
`MT-LINK-COLOUR`, a WCAG 1.4.1 failure (F73). No page has text at 16px or
more with an x-height under 7px: the floor guards faces with a small
x-height, such as Futura (Rutter gives its ratio as 0.417), which none of
these pages sets for reading text at 16px.
