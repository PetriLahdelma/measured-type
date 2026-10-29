# Service health dashboard: what changed and why

Outputs: `dashboard.fixed.css` and `dashboard.fixed.html` (links the new stylesheet). The markup had to change, because the worst misread (status) could not be fixed with CSS alone. `dashboard.html` and `dashboard.css` are untouched.

## Problems that caused misreads

1. **Status was colour only.** Each service showed an 8px green, amber or red dot with no text. Anyone with red/green colour blindness, a washed-out screen or a quick glance could not tell Healthy from Down. *Fix (markup + CSS):* every status is now a labelled pill ("Healthy", "Degraded", "Down") with the dot kept as a secondary cue, dark text on a tinted background. Degraded and Down rows also get a tinted background and a coloured left edge so problem rows jump out of the list.
2. **Service names were cut off.** `.name` was capped at 160px with an ellipsis, so "Authentication gateway for partner accounts" read as "Authentication gatewa…". *Fix:* the cap and ellipsis are gone; names wrap.
3. **Numbers were left aligned in proportional digits.** Comparing 411 108 against 80 011 or 18 against 1 104 meant counting characters. *Fix:* numeric cells and their headers are right aligned with tabular (equal width) digits and never wrap mid-number, so magnitudes line up by place value.
4. **Uppercase headers turned units into the wrong units.** `text-transform: uppercase` rendered "p95 (ms)" as "P95 (MS)". *Fix:* column and KPI labels keep their real case; only the "Operations" eyebrow stays uppercase (and gets letter spacing).
5. **KPI figures scaled with the window (`3vw`).** They measured about 11px on a phone (smaller than the labels above them) and about 38px on a wide monitor. *Fix:* a bounded size, `clamp(1.5rem, 1.25rem + 0.75vw, 2rem)`, giving 24px on a phone and about 30px on desktop, with tabular digits.
6. **Low contrast and tiny text.** Labels and headers were #8a8a8a at 11px (3.45:1), the timestamp #999 at 11px (2.7:1) and the footnote #aaa at 10px (2.2:1). The "Updated" time matters on an ops screen because it tells you whether the data is stale. *Fix:* one muted colour (#555, about 7:1) and minimum sizes of 12 to 14px. Every text element now passes 4.5:1.

## Layout problems

7. **Fixed widths broke small screens.** The table was 900px and KPI tiles 260px; at 375px wide the page scrolled sideways by about 550px. *Fix:* content sits in a centred column (max 960px); KPI tiles use a fluid grid; the table fills its column. Below 560px each service becomes a compact block (name, status pill, then Requests / Errors / p95 with their labels) so every figure is visible without sideways scrolling. Between 560px and the desktop width the table keeps a 600px minimum and scrolls inside its own keyboard-focusable box if needed.
8. **Weak structure.** *Fix (markup):* added a table caption, `scope` on header cells, service names as row headers, a `<time>` element for the update time and a `main` landmark. Spacing now comes from a small 4/8/12/16/24px scale instead of ad hoc values, and the page background, cards and table share one border and radius treatment.

## Verified

Rendered both versions in Chromium at 375px and 1280px:

| Check | Original | Fixed |
|---|---|---|
| Page horizontal overflow at 375px | 549px | 0 |
| Service names truncated | 1 | 0 |
| KPI value size (375 / 1280) | 11px / 38px | 24px / 30px |
| Text below 4.5:1 contrast | 11 elements | 0 |

## Not changed (worth a decision)

- Rows keep their original order. Sorting by severity (Down first) would help triage but changes what readers are used to.
- The Errors column is a raw count. Notifications has 2 911 errors out of 3 000 requests (97%), Billing 1 104 out of 80 011 (1.4%); an error-rate column per service would make that comparison honest, but it adds data, so it is left as a suggestion.
