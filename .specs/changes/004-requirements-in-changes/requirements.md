# Requirements Specification

| Field | Value |
|---|---|
| **ID** | REQ-004 |
| **Status** | draft |
| **Author** | Bruna |
| **Created** | 2026-07-04 |
| **Stakeholders** | Kit maintainer (Bruna), agents that run the change path, projects that `upgrade-methodology` |

---

## 1. Problem Statement

### Current Situation

A single logical change is spread across three sibling directories keyed only by its number `<nnn>-<slug>`:

- `.specs/requirements/<nnn>-<slug>/requirements.md` — created first by `gather-requirements`
- `.specs/changes/<nnn>-<slug>/{spec.md, alignment-review.md}` — active spec
- `.specs/archive/<nnn>-<slug>/{spec.md, alignment-review.md}` — where the spec lands when done

When a change is archived, only `spec.md` + `alignment-review.md` move to `archive/`. The
`requirements.md` is left behind in `.specs/requirements/` **permanently**. Confirmed: the
requirements of the already-archived `001` and `003` are orphaned there right now.

### Why This Matters

- **Orphaned artifacts:** every completed change leaves its requirements stranded in a growing
  `.specs/requirements/` that no longer maps 1:1 to anything active — the archive is incomplete.
- **Cognitive load:** reading everything about one change means visiting three directories.
- **Coupling by convention:** the only thing linking the three is a shared number + a fragile
  relative link (`../../requirements/...`); nothing physically groups them.

### Success Definition

Everything about one change lives in one folder that travels together through its whole lifecycle.

| Metric | Current | Target |
|---|---|---|
| Directories to read one change | 3 | 1 |
| Orphaned requirements after archive | grows unbounded (2 today) | 0 |
| Top-level `.specs/` spec dirs | `requirements/`, `changes/`, `archive/` | `changes/`, `archive/` |

---

## 2. Stakeholder Map

| Stakeholder | Role | Interest | Influence | Key Concern |
|---|---|---|---|---|
| Bruna | Kit maintainer | Coherent, low-drift methodology | High | Migration is safe & consistency stays green |
| Change-path agents | Consumers | Know where to write/read requirements | High | Skills + templates point at the right path |
| Upgrading projects | Downstream | Non-destructive upgrade | High | Existing `.specs/requirements/` migrates cleanly |

---

## 3. Methodology

EARS (each requirement maps 1:1 to a `check-consistency` / script test) + Functional Requirements.

---

## 4. Requirements

### 4.5 EARS Requirements

| ID | EARS Requirement | Acceptance Criteria |
|---|---|---|
| EARS-01 | WHEN `gather-requirements` runs, the system SHALL write `requirements.md` inside `.specs/changes/<nnn>-<slug>/` (not a separate `requirements/` dir) | 1. Skill/template writes `changes/<nnn>-<slug>/requirements.md` 2. No `.specs/requirements/` path is created |
| EARS-02 | WHILE a change is archived (`changes/<nnn>` → `archive/<nnn>`), the system SHALL carry its `requirements.md` along with `spec.md` and `alignment-review.md` | 1. Archived dir contains all three files 2. Nothing is left behind under `.specs/` |
| EARS-03 | WHEN `check-consistency` validates traceability, the system SHALL resolve requirements from within `changes/` and `archive/` | 1. A change dir with `requirements.md` + `spec.md` passes traceability 2. Dangling REQ ids still fail |
| EARS-04 | WHEN `check-consistency` runs the alignment gate on an archived spec, the system SHALL read `requirements.md` co-located in the same archived dir | 1. Missing/`not aligned` review still blocks 2. Grandfathered baseline specs stay exempt |
| EARS-05 | IF a spec.md links its requirements, THEN the link SHALL be the co-located `requirements.md` (no `../../requirements/...`) | 1. Traceability accepts the local link 2. `feature-spec.md` template updated |
| EARS-06 | WHEN `upgrade-methodology` runs on a project with a legacy `.specs/requirements/`, the system SHALL move each `requirements.md` into the matching `changes/` or `archive/` dir | 1. Orphaned + active requirements relocated by number 2. Nothing lost; `.specs/requirements/` removed when empty |
| EARS-07 | WHEN `resume-session` reports state, the system SHALL derive "requirements without a spec yet" from change dirs holding a `requirements.md` but no `spec.md` | 1. A requirements-only change dir is reported as in-flight 2. No reference to a `requirements/` dir |

---

## 5. Functional Requirements

| ID | Description | Source | Priority (MoSCoW) |
|---|---|---|---|
| REQ-01 | `requirements.md` is co-located in the change dir across the whole lifecycle (create → active → archive) | EARS-01/02 | Must |
| REQ-02 | `check-consistency` traceability + alignment gate resolve requirements from `changes/`+`archive/` | EARS-03/04 | Must |
| REQ-03 | Skills, templates, and scripts referencing `.specs/requirements/` are updated to the co-located path | EARS-01/05/07 | Must |
| REQ-04 | `.specs/methodology.md` + `METHODOLOGY.md` change-path text describes the new layout | EARS-01 | Must |
| REQ-05 | `upgrade-methodology` migrates legacy `.specs/requirements/` non-destructively | EARS-06 | Must |
| REQ-06 | This repo's own orphaned requirements (001, 003) are migrated as the dogfood proof | EARS-02 | Should |
| REQ-07 | The `.specs/baseline.json` forward-only grandfathering keeps working under the new paths | EARS-04 | Must |

---

## 7. Constraints

| ID | Constraint | Type | Impact |
|---|---|---|---|
| C-01 | `check-consistency` + `update-skills-index --check` must stay green (CI gate) | Technical | Every touched skill/script must remain consistent |
| C-02 | No hardcoded config values; reference `.specs/config.md` | Technical | Paths/patterns follow existing conventions |
| C-03 | Upgrade must be non-destructive (no data loss on downstream projects) | Technical | Migration is move-not-delete, idempotent |
| C-04 | Kit-owned methodology change: `.specs/methodology.md` is upgraded wholesale, project-specific stays out | Process | Coordinate with `METHODOLOGY.md` |

---

## 8. Assumptions

| ID | Assumption | Validation Needed? | Risk if Wrong |
|---|---|---|---|
| A-01 | Requirements↔change numbering stays 1:1 (one `<nnn>` per change) | No | Migration by number would be ambiguous |
| A-02 | A requirements-only change dir (no `spec.md` yet) is a valid in-flight state | No | `changes/` semantics would need rethinking |
| A-03 | No external tooling hardcodes `.specs/requirements/` outside this repo's scripts/skills | Yes | Missed reference breaks after migration |

---

## 9. Out of Scope

- Renaming the `changes/` or `archive/` directories themselves.
- Changing the `<nnn>-<slug>` numbering scheme.
- Reworking the alignment-review semantics (only its file location moves).
- Merging `requirements.md` and `spec.md` into one file — they stay separate files, same folder.

---

## 10. MoSCoW Prioritization

| Priority | Requirements | Rationale |
|---|---|---|
| **Must have** | REQ-01..05, REQ-07 | Core layout + consistency + upgrade migration |
| **Should have** | REQ-06 | Dogfood: migrate this repo's own orphans |
| **Could have** | — | — |
| **Won't have (now)** | — | See Out of Scope |

---

## 14. Traceability Matrix

> Test IDs filled after the spec is written.

| REQ ID | Source | Requirement Summary | Priority | Implementation Spec | Test ID |
|---|---|---|---|---|---|
| REQ-01 | EARS-01/02 | Co-locate requirements.md in change dir | Must | changes/004-requirements-in-changes/ | — |
| REQ-02 | EARS-03/04 | Consistency resolves reqs from changes+archive | Must | changes/004-requirements-in-changes/ | — |
| REQ-03 | EARS-01/05/07 | Update skills/templates/scripts paths | Must | changes/004-requirements-in-changes/ | — |
| REQ-04 | EARS-01 | Methodology docs describe new layout | Must | changes/004-requirements-in-changes/ | — |
| REQ-05 | EARS-06 | Upgrade migrates legacy requirements | Must | changes/004-requirements-in-changes/ | — |
| REQ-06 | EARS-02 | Migrate this repo's orphans (001, 003) | Should | changes/004-requirements-in-changes/ | — |
| REQ-07 | EARS-04 | Baseline grandfathering keeps working | Must | changes/004-requirements-in-changes/ | — |

---

## 15. Appendix

### Open Questions (pending user confirmation — 3 design decisions)

- [ ] **Layout:** requirements "travels together" (eliminate `.specs/requirements/`) vs. separate
      staging dir for spec-less requirements. *Proceeding with: travels together.*
- [ ] **Process:** dogfood the full change flow vs. micro-spec vs. plan-only.
      *Proceeding with: dogfood full flow.*
- [ ] **Migration:** automatic in `upgrade-methodology` vs. kit-only + manual.
      *Proceeding with: automatic migration.*

### Note on this document's own location

This is the **first** requirements doc co-located inside its change folder
(`.specs/changes/004-requirements-in-changes/requirements.md`) — dogfooding the new layout. It was
drafted under the legacy `.specs/requirements/004-*/` and migrated here by task T3.

---

## Validation Checklist

- [x] Stakeholders identified
- [x] Methodology chosen and section(s) filled (EARS + FR)
- [x] Functional requirements documented with sources
- [ ] Non-functional requirements defined (N/A — internal tooling change)
- [x] Constraints and assumptions listed
- [x] MoSCoW prioritization complete
- [x] Out of scope explicitly defined
- [x] Traceability matrix populated
- [ ] Stakeholders reviewed and approved (pending — 3 open questions)
