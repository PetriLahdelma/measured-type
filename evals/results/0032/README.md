# Spec 0032 on the corpus

The checks of [spec 0032](../../../specs/0032-gap-review-rest.md) over the
100 pages of [spec 0028](../0028/), on 9 November 2026, before release.
Per-page reports name the sites and stay private; this file gives the
aggregate. All three new findings are LOW, so no verdict changed.

| Check | Findings |
|---|--:|
| `MT-PUNCT`, `(c)`, `(TM)` or `(R)` for ©, ™ or ® | 1, on 1 page (a copyright line in a specification's boilerplate) |
| `MT-PUNCT`, a breaking space after ¶ or § | 0 |
| `MT-ZOOM-GROWTH` on reading text | 3, on 1 page |

The reading-text finding was re-measured independently: the page sets its
root size by window width (24px at 1280px, 15.36px at 640px), so its body
text grows 1.28× at 200% zoom; it reaches 2× at 500%, so it is not a WCAG
1.4.4 failure, only under the house bar. `font-features.py --metrics` reads
files, not pages, and was not run on the corpus.
