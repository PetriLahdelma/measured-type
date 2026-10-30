## What and why

<!-- One change. What it does and the issue it closes (Closes #...). -->

## Evidence

<!-- For a check or a number: the spec and requirement IDs and how you measured it.
     For a text change: the source. -->

## Gate

Last lines of `npm test` from `skills/measured-type/`, with `MT_PYTHON` set:

```
# tests
# pass
# fail
# skipped
```

## Checklist

- [ ] The spec in `specs/` has the requirement, and its test was written first and seen failing.
- [ ] `npm test` passes, with nothing newly skipped.
- [ ] Every new claim is measured by a script or cited.
- [ ] Prose follows the style in CONTRIBUTING.md (no em dashes, no middle dots, no comma before the final "and", British spelling).
- [ ] Nothing under `evals/results/` was edited, or the change is explained in that results README.
- [ ] Commits are signed off (`git commit -s`).
