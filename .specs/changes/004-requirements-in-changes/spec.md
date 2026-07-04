# Spec: Co-locate requirements.md inside the change folder

| Field | Value |
|---|---|
| **ID** | CHG-005 |
| **Status** | implemented |
| **Author** | Bruna |
| **Created** | 2026-07-04 |

> **Design-for-approval.** Written to pass the alignment gate *before* implementation (Key Rule #1:
> spec first). Dogfoods the new layout: this very change is the **first** authored with its
> requirements co-located — task T3 moves `requirements/004-*/requirements.md` into this folder and
> flips the link below to the local `requirements.md`.
>
> **ID note:** archived specs already used `CHG-002/004`; this takes `CHG-005` to avoid reuse. The
> requirements/change dir number is `004`.

## Context

A single logical change is scattered across three sibling trees keyed only by number:
`.specs/requirements/<nnn>-<slug>/`, `.specs/changes/<nnn>-<slug>/`, `.specs/archive/<nnn>-<slug>/`.
When a change archives, only `spec.md`+`alignment-review.md` move; `requirements.md` is **orphaned**
forever under `.specs/requirements/` (confirmed for `001` and `003`). This hurts coherence (three dirs
per change), leaves the archive incomplete, and couples the parts only by a fragile relative link.
Co-locating `requirements.md` inside `changes/<nnn>-<slug>/` — travelling into `archive/` with the
rest — makes each change one self-contained, greppable unit. Better for humans, and for loop agents
(`implement-spec`) that read one folder.

## Scope

- `requirements.md` lives inside `changes/<nnn>-<slug>/` from gathering through archive; `.specs/requirements/` is eliminated.
- Consistency (traceability + alignment gate) and the archive guard resolve requirements co-located.
- Skills, templates, methodology docs updated to the co-located path.
- `upgrade-methodology` migrates a legacy `.specs/requirements/` non-destructively; this repo's own orphans (001, 003) are migrated as the dogfood.

### Out of Scope

- Renaming `changes/`/`archive/` or the `<nnn>-<slug>` scheme.
- Merging `requirements.md` into `spec.md` — they stay **separate files, same folder**.
- Changing alignment-review semantics (only its neighbor `requirements.md` moves).

## Requirements

### Functional

- [x] REQ-01: `requirements.md` co-located in the change dir across the whole lifecycle (create → active → archive)
- [x] REQ-02: `check-consistency` traceability + alignment gate resolve requirements from `changes/`+`archive/`
- [x] REQ-03: skills, templates, and scripts referencing `.specs/requirements/` updated to the co-located path
- [x] REQ-04: `.specs/methodology.md` + `METHODOLOGY.md` change-path text describes the new layout
- [x] REQ-05: `upgrade-methodology` migrates a legacy `.specs/requirements/` non-destructively
- [x] REQ-06: this repo's orphaned requirements (001, 003) migrated as the dogfood proof
- [x] REQ-07: `.specs/baseline.json` forward-only grandfathering keeps working under the new paths

### Non-Functional

- [x] NFR-01: migration is move-not-delete and idempotent (no data loss on downstream upgrade)
- [x] NFR-02: never weaken the gates — a dangling REQ still fails; a missing/`not-aligned` review still blocks archiving
- [x] NFR-03: no hardcoded paths beyond the existing constants; conventions preserved

### Technical

| Layer | File / Component | Change |
|---|---|---|
| Script | `scripts/check-consistency.mjs` | resolve `requirements.md` from within `changes/`+`archive/`; drop `REQUIREMENTS_DIR` as a scan root; accept local link in 6a |
| Script | `scripts/session-context.mjs` | "requirements without a spec" = change dir with `requirements.md`, no `spec.md` |
| Script | `scripts/methodology-guard.mjs` | archive-gate reads co-located `requirements.md`, not a `requirements/<n>-*` dir |
| Script | `scripts/methodology-nudge.mjs` | path reference update |
| Template | `.specs/templates/feature-spec.md` (+ bugfix/migration/test) | link → local `requirements.md` |
| Skill | gather-requirements, review-alignment, run-change, init-project, create-project, resume-session, scan-project, implement-spec | co-located path + examples |
| Docs | `.specs/methodology.md`, `METHODOLOGY.md`, `AGENTS.md` (if referenced) | change-path layout |
| Skill/Script | `upgrade-methodology` (+ any support script) | migration step |
| Data | `.specs/baseline.json` | verify grandfathering by dir name still valid |
| Test | `test/methodology-guard.test.mjs`, `test/check-consistency-colocated.test.mjs` (NEW) | co-located resolution |

## Design

### Target layout

```
.specs/
├── changes/
│   └── 004-requirements-in-changes/
│       ├── requirements.md        ← co-located (was .specs/requirements/004-…/)
│       ├── spec.md
│       └── alignment-review.md
└── archive/
    └── 001-…/
        ├── requirements.md        ← travels in on archive (was orphaned)
        ├── spec.md
        └── alignment-review.md
(.specs/requirements/ removed)
```

### Consistency resolution (the core change)

- `findSpec(num)` already walks `[archive, changes]`. Add a sibling `findRequirements(num)` that walks
  the same bases and reads `<base>/<dir>/requirements.md`. Requirements and spec now share a dir.
- `checkTraceability`: iterate change/archive dirs that hold **both** `requirements.md` and `spec.md`;
  keep 6a (needs `## Requirements Traceability`) and 6b (no dangling REQ). 6a link check accepts the
  **local** `requirements.md` link (drop the `requirements/<num>-` requirement; keep resolving REQ ids).
- `checkAlignmentGate`: for each archived dir, read its co-located `requirements.md`; unchanged gate logic.
- A `requirements.md` with no `spec.md` yet in a change dir = valid in-flight (traceability skips it).

### Migration (upgrade + this repo)

For each legacy `.specs/requirements/<n>-<slug>/requirements.md`: move it into `changes/<n>-<slug>/`
if that active dir exists, else into `archive/<n>-<slug>/` (the archived case — 001, 003). `git mv`
(move-not-delete, NFR-01). Remove `.specs/requirements/` once empty. Idempotent: skip if already moved.

### Edge Cases

- A lightweight archived spec without requirements (002) → no `requirements.md` to move; gate still N/A.
- Legacy requirements whose spec is still active → lands in `changes/`; whose spec is archived → `archive/`.
- Downstream project mid-flight (requirements gathered, no spec) → `requirements/<n>` → `changes/<n>`.

## Tasks

> Boundary-first. The layout flip (T1–T3) validates together — the migration (T3) is what turns the
> new resolution logic (T1) from "skipped" to "actively passing".

- [x] T1 — `check-consistency.mjs`: co-locate requirements resolution (traceability 6a/6b + alignment gate + `findRequirements`, drop `REQUIREMENTS_DIR` scan root). _Boundary:_ `scripts/check-consistency.mjs` _Depends:_ —
- [x] T2 — guard/context scripts read co-located requirements. _Boundary:_ `scripts/session-context.mjs`, `scripts/methodology-guard.mjs`, `scripts/methodology-nudge.mjs`, `test/methodology-guard.test.mjs` _Depends:_ —
- [x] T3 — migrate this repo: `git mv` 001/003 requirements into `archive/`, 004 requirements into `changes/004-*`, remove `.specs/requirements/`; flip this spec's traceability link to local. _Boundary:_ `.specs/requirements/`, `.specs/archive/`, `.specs/changes/` _Depends:_ T1
- [x] T4 — templates: requirements link → local `requirements.md`. _Boundary:_ `.specs/templates/` _Depends:_ —
- [x] T5 — skills (8) path/examples + regenerate INDEX. _Boundary:_ `.claude/skills/` _Depends:_ T1
- [x] T6 — methodology docs describe co-located layout. _Boundary:_ `.specs/methodology.md`, `METHODOLOGY.md`, `AGENTS.md` _Depends:_ —
- [x] T7 — `upgrade-methodology` migration step (skill + support). _Boundary:_ `.claude/skills/upgrade-methodology/`, `scripts/` _Depends:_ T1
- [x] T8 — integration test `test/check-consistency-colocated.test.mjs` asserts traceability + alignment actively run (count ≥ 1, not skipped) on the migrated layout; verify baseline. _Boundary:_ `test/`, `.specs/baseline.json` _Depends:_ T1, T3

## File Structure Plan

- **modify** `scripts/check-consistency.mjs` — co-located requirements resolution
- **modify** `scripts/session-context.mjs`, `scripts/methodology-guard.mjs`, `scripts/methodology-nudge.mjs` — path resolution
- **create** `test/check-consistency-colocated.test.mjs` — active-validation regression guard
- **modify** `test/methodology-guard.test.mjs` — co-located fixture
- **modify** `.specs/templates/feature-spec.md` (+ bugfix/migration/test if they link requirements)
- **modify** 8 skills under `.claude/skills/` + regenerate `INDEX.md`
- **modify** `.specs/methodology.md`, `METHODOLOGY.md`, `AGENTS.md`
- **modify** `.claude/skills/upgrade-methodology/SKILL.md` (+ migration support)
- **move** `.specs/requirements/{001,003}-*/requirements.md` → `.specs/archive/…`; `…/004-*/requirements.md` → `.specs/changes/004-*/`
- **delete** `.specs/requirements/` (once empty)

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Consistency goes green-but-blind after migration (checks silently skip) | Med | High | T8 asserts traceability/alignment counts ≥ 1, not "skipped" (NFR-02) |
| Missed `.specs/requirements/` reference in a skill/script | Med | Med | grep sweep in T5; `orphaned references` check; INDEX regen |
| Downstream upgrade loses a requirements file | Low | High | `git mv` move-not-delete, idempotent (NFR-01) |
| Grandfathering breaks under new paths | Low | Med | baseline keyed by dir name, not requirements path (T8 verify) |

## Dependencies

- `check-consistency` + CI; `review-alignment` (alignment gate); `git mv`; existing `methodology-guard` test harness.

## Requirements Traceability

**Requirements:** [`requirements.md`](requirements.md)

> T3 relocates the requirements into this folder and updates this link to `requirements.md` (local).

| REQ ID | Requirement Summary | Priority | Acceptance Criteria |
|---|---|---|---|
| REQ-01 | Co-locate requirements.md in change dir, whole lifecycle | Must | gather writes into `changes/<nnn>-<slug>/`; archive carries it along |
| REQ-02 | Consistency resolves requirements from changes+archive | Must | traceability + alignment gate actively pass (count ≥ 1) on co-located layout |
| REQ-03 | Skills/templates/scripts updated to co-located path | Must | no `.specs/requirements/` scan-root references remain |
| REQ-04 | Methodology docs describe new layout | Must | change-path text + examples show co-located requirements |
| REQ-05 | Upgrade migrates legacy requirements non-destructively | Must | move-not-delete, idempotent; `.specs/requirements/` removed when empty |
| REQ-06 | This repo's orphans (001, 003) migrated | Should | archived dirs contain requirements.md; nothing left in requirements/ |
| REQ-07 | Baseline grandfathering keeps working | Must | grandfathered archived specs stay exempt after migration |

> **Semantic gate:** before implementation and before archiving, `review-alignment` judges REQ
> coverage and writes `alignment-review.md`; `check-consistency` blocks archiving until it reads `aligned`.

## Tests

> **TDD:** written before implementation. The deterministic surface is the guard's resolution and
> consistency's active-validation. The integration guard proves the checks don't silently skip.

### Test Cases

| ID | Test | Type | Description |
|---|---|---|---|
| TEST-01 | guard co-located resolution | unit | archive-gate treats a co-located `requirements.md` (no `requirements/<n>-*` dir) as requirements-backed |
| TEST-02 | traceability actively runs | integration | after migration, `check` output reports `traceability: N … linked` with N ≥ 1 (not "skipped") |
| TEST-03 | alignment gate actively runs | integration | `check` output reports `alignment gate: N archived spec(s) reviewed and aligned`, N ≥ 1 |
| TEST-04 | dangling REQ still fails | integration | a spec citing a REQ absent from its co-located requirements → violation (gate not weakened) |

### Test Files

| File | What It Covers |
|---|---|
| `test/methodology-guard.test.mjs` | TEST-01 |
| `test/check-consistency-colocated.test.mjs` | TEST-02..04 |

---

## Validation Checklist

- [x] Tests written BEFORE implementation (Red)
- [x] All tests passing (Green)
- [x] `check-consistency` + skills index green after migration
- [x] Requirements met (REQ-01..07)
- [x] Edge cases tested (lightweight-no-requirements, active-vs-archived migration)
- [x] No regression in existing tests
- [x] Docs + upgrade path updated
- [x] `alignment-review.md` written and `aligned` before archiving

## Notes

- Kit-owned methodology change: `.specs/methodology.md` upgrades wholesale; keep project-specific out.
- This spec is the dogfood — first change authored with co-located requirements (post-T3).

## Implementation Notes

> Checkpoint log (dogfooding per-task note-taking). Two deliberate divergences from `## Design`:

- **T1 (consistency):** implemented the co-located resolution as a `specDirsWithBase()` iteration over
  `changes/`+`archive/` rather than a `findRequirements(num)` lookup — simpler, since requirements and
  spec now always share one dir (no number-matching needed). Dropped `REQUIREMENTS_DIR` and the now-dead
  `findSpec`/`findReqDir`/`numPrefix` helpers (clean-code). 6a link check became `/\]\(\.?\/?requirements\.md\)/`.
- **T2:** `methodology-nudge.mjs` needed **no** change (it only mentions "requirements" in prose, no path).
  Removed dead `dirsUnder`/`numPrefix` from the guard and `numOf` from session-context after the rewrites.
- **T3:** `004`'s requirements.md was untracked (created this session) so `git mv` failed for it — used a
  plain `mv` (git had nothing to track). 001/003 moved via `git mv`. Rewrote 3 traceability links + 3
  alignment pointers to the co-located `requirements.md`.
- **T7 (upgrade):** the migration is **presence-based**, not version-gated — `migrateRequirementsColocation()`
  runs whenever a legacy `.specs/requirements/` exists (idempotent no-op otherwise), which is more robust
  than a version threshold and needs no bump to function. It copy-then-removes (no data loss) and rewrites
  links. `reconcile-upgrade` gained a verification bullet.
- **T8:** `check-consistency` isn't fixture-parameterizable (it validates the whole kit against its own
  ROOT), so the anti-"green-but-blind" guard asserts on its **real-repo output** (counts ≥ 1); the migration
  is fixture-tested via `specway upgrade` end-to-end. Baseline: none exists in the kit (grandfathering is
  keyed by archive **dir name**, unaffected by requirements location) — REQ-07 holds by construction.
- **Acceptance:** suite 27 → 32; `check-consistency` + skills index green. Left **active** for maintainer
  review; archiving + the **1.6.0** release (`cut-release`) are the remaining steps.
