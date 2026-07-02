# Spec: cc-sdd-inspired enhancements (batch 1)

| Field | Value |
|---|---|
| **ID** | CHG-003 |
| **Status** | draft |
| **Author** | Specway maintainer |
| **Created** | 2026-07-02 |

> Lightweight batch (no requirements doc): three additive, low-risk enhancements borrowed from
> `cc-sdd` (gotalab/cc-sdd) that fit specway's existing design. The big one — an autonomous
> `implement-spec` loop — is deliberately deferred to its own full-path spec (needs design + review).

## Context

Analysis of `cc-sdd` surfaced four transferable ideas. This spec lands the three cheap, high-fit ones:
1. **EARS requirements** as an additional methodology in `gather-requirements` + the requirements
   template (EARS criteria map 1:1 to `TEST-NN`, reinforcing the traceability the checker already
   enforces).
2. **`## Tasks` (boundary/deps) + `## File Structure Plan`** in the feature-spec template — enables
   boundary-first work and is the prerequisite the future autonomous loop consumes.
3. **`--dry-run`** on the `specway` CLI (`init`/`scan`/`upgrade`) — preview what would be copied /
   merged / stamped, writing nothing.

## Scope

- Edit `.specs/templates/requirements-spec.md` (+ `gather-requirements` SKILL) for EARS.
- Edit `.specs/templates/feature-spec.md` (+ `run-tdd` SKILL reference) for Tasks + File Structure Plan.
- Edit `bin/specway.mjs` for `--dry-run`; add `test/cli-dry-run.test.mjs`.

### Out of Scope

- The autonomous `implement-spec` loop (separate spec); multi-spec initiatives; broader i18n; more agents.

## Tasks

> Boundary-first (dogfooding the new section). `_Boundary:_` = files this task may touch;
> `_Depends:_` = task ids that must land first.

- [x] T1 — EARS in the requirements template + skill. _Boundary:_ `.specs/templates/requirements-spec.md`, `.claude/skills/gather-requirements/SKILL.md` _Depends:_ —
- [x] T2 — Tasks + File Structure Plan in the feature-spec template + run-tdd reference. _Boundary:_ `.specs/templates/feature-spec.md`, `.claude/skills/run-tdd/SKILL.md` _Depends:_ —
- [x] T3 — `--dry-run` flag: write-guards in the copy helpers + banner + help. _Boundary:_ `bin/specway.mjs` _Depends:_ —
- [x] T4 — Tests for `--dry-run` (init + upgrade preview, no writes). _Boundary:_ `test/cli-dry-run.test.mjs` _Depends:_ T3

## File Structure Plan

- **modify** `.specs/templates/requirements-spec.md` — add `### 4.5 EARS Requirements`
- **modify** `.claude/skills/gather-requirements/SKILL.md` — EARS in the methodology menu + Step 4
- **modify** `.specs/templates/feature-spec.md` — add `## Tasks` + `## File Structure Plan`
- **modify** `.claude/skills/run-tdd/SKILL.md` — read the spec's `## Tasks` in Step 1
- **modify** `bin/specway.mjs` — `DRY` flag, guarded writes, banner, help text
- **create** `test/cli-dry-run.test.mjs` — dry-run behavioral tests

## Tests

> `--dry-run` is the only part with runtime behavior. EARS/Tasks-FSP are template content, verified by
> `check-consistency` staying green + the sections being present.

| ID | Test | Type | Description |
|---|---|---|---|
| TEST-01 | `init --dry-run` writes nothing | integration | `specway init --dry-run` in an empty dir → exit 0, output previews, dir stays empty |
| TEST-02 | `upgrade --dry-run` mutates nothing | integration | On a fixture (old version + custom settings.json) → settings.json and config.md are byte-identical after; output previews the merge/refresh |
| TEST-03 | non-dry `init` does write (control) | integration | `specway init` (no flag) in an empty dir → files appear (proves the flag is what suppresses writes) |

### Test Files

| File | What It Covers |
|---|---|
| `test/cli-dry-run.test.mjs` | TEST-01..03 |

---

## Validation Checklist

- [x] Tests written BEFORE implementation (Red)
- [x] All tests passing (Green — 20/20)
- [x] `node scripts/check-consistency.mjs` green; skills index in sync
- [x] EARS section present in the requirements template; Tasks + File Structure Plan in the feature template
- [x] `--dry-run` documented in `specway help`
- [x] No regression in the existing 17 hook/merge tests (suite now 20)

## Notes

- No requirements doc → the traceability/alignment gate does not apply to this lightweight spec.
- Deferred follow-up: the autonomous `implement-spec` loop (per-task fresh subagent, independent
  reviewer, auto-debug) — the highest-value cc-sdd idea, gets its own spec + design.
