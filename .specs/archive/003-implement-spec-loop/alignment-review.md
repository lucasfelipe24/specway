# Alignment Review — CHG-004

- **Reviewed-spec:** CHG-004
- **Reviewed-requirements:** ../../requirements/003-implement-spec-loop/requirements.md
- **Date:** 2026-07-02
- **Verdict:** aligned

## Per-Requirement Verdicts

| REQ ID | Verdict | Evidence (spec section · quote) | Gap / Action |
|---|---|---|---|
| REQ-003 | Covered | Document-level id (umbrella); every functional REQ below is reviewed | — (meta id) |
| REQ-01 | Covered | `## Design` loop steps 1/7 · "next = first task with box [ ] and all _Depends:_ [x]… one/iteration… Resumable" | — |
| REQ-02 | Covered | `## Design` step 2 · "IMPLEMENTER (fresh subagent)… run-tdd for THIS task only… diff restricted to _Boundary:_" | — |
| REQ-03 | Covered | `## Design` step 3 · "N independent reviewers… accept iff majority approve"; diverse lenses | — |
| REQ-04 | Covered | `## Design` step 4 · "majority-reject #2 or block → AUTO-DEBUG… search troubleshooting.md first" | — |
| REQ-05 | Covered | `## Design` step 5 · "write outside _Boundary:_, check-consistency red, or not-aligned → STOP and report" | — |
| REQ-06 | Covered | `## Design` step 6 · "mark [x]; append Implementation Notes; record TRB-; run tests + check-consistency" | — |
| REQ-07 | Covered | `## Design` Feature-flag mode · "WHERE FEATURE_FLAG_MODE is on… Default off (opt-in)" | — |
| REQ-08 | Covered | `## Design` step 0 + Roadmap · "if a roadmap.md spans multiple specs, run one cross-spec review first" | — |
| REQ-09 | Covered | `## Design` Degradation · "can't spawn subagents → run inline… CI + alignment gate + run-tdd remain enforcement" | — |

## Scope Drift

- `scripts/spec-tasks.mjs` (task parser) is a technical enabler not named by a user story — it is the
  deterministic surface REQ-01/NFR-04 require. Accepted (annotated in the spec `## Technical`/Tasks).
- No requirement is dropped or contradicted.

## Summary

Every functional requirement (REQ-01..09) is covered by a cited design behaviour with a traceable
task and (for the parser) a test. The two design tunables are now resolved by the maintainer:
**Workflow-tool** orchestration (CC-only) and **N=3** reviewers (majority 2/3). Aligned and
**approved** — proceeding to `run-tdd` task-by-task (T2 parser first).
