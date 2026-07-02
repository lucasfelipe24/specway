# Alignment Review — CHG-002

- **Reviewed-spec:** CHG-002
- **Reviewed-requirements:** ../../requirements/001-methodology-hooks/requirements.md
- **Date:** 2026-07-02
- **Verdict:** aligned

## Per-Requirement Verdicts

| REQ ID | Verdict | Evidence (spec section · quote) | Gap / Action |
|---|---|---|---|
| REQ-001 | Covered | Document-level id of the requirements doc (umbrella); every functional REQ below is reviewed | — (meta id, not a functional requirement) |
| REQ-01 | Covered | `## Scope` · "extend the existing SessionStart matcher to `startup\|resume\|compact`"; `Design` no-fire table; done in this change | — |
| REQ-02 | Covered | `## Design` · archive-gate row "AND `alignment-review.md` missing/not `aligned`"; TEST-01..03,07 | — |
| REQ-03 | Covered | `## Design` · nudge "spec-no-Tests"; TEST-08/09 | — |
| REQ-04 | Covered | `## Design` · guard "baseline" row; TEST-04/05/06 | — |
| REQ-05 | Covered | `## Design` · nudge "CLI next-step"; TEST-10/11 | — |
| REQ-06 | Covered | `## Technical` · `merge-hooks.mjs` + `bin/specway.mjs` "call the merge in cmdScan/cmdUpgrade"; TEST-12..14 | — |
| REQ-07 | Covered | `## Technical` · Packaging row "`files[]` += 3 scripts"; `TOOLING`; skill lists | — |

## Scope Drift

- `scripts/merge-hooks.mjs` is a CLI-only helper not named 1:1 by a user story — it is the mechanism
  REQ-06 requires (idempotent keyed merge), explicitly annotated in the spec `## Notes`. Accepted.
- Consolidating 4 candidate hooks into 2 shipped scripts is an implementation decision (reduces the
  REQ-07 distribution tax), traceable to REQ-07 and annotated in `## Notes`. Accepted.

## Summary

The spec covers every functional requirement (REQ-01..REQ-07) with cited design behavior and a
mapped test case; the two accepted drifts are deliberate implementation choices recorded in the
spec. Aligned — clear to proceed to `run-tdd`.
