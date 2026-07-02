# Spec: Autonomous implement-spec loop (v1 complete)

| Field | Value |
|---|---|
| **ID** | CHG-004 |
| **Status** | draft |
| **Author** | Specway maintainer |
| **Created** | 2026-07-02 |

> **Design-for-approval.** This spec is written to be reviewed at the alignment gate *before* any code
> (the methodology's requirements→spec gate). It dogfoods the CHG-003 additions: EARS requirements
> (`requirements/003`) and this `## Tasks` + `## File Structure Plan`. The flagship cc-sdd idea.

## Context

`run-tdd` is a single manual cycle in one growing context — no isolation per task, no independent
review, no systematic auto-debug. This adds an **`implement-spec`** skill that autonomously drives a
spec's `## Tasks` one at a time with a **fresh implementer subagent**, an **independent multi-vote
reviewer**, and an **auto-debug** pass — resumable, halting at real failures, as a **Claude-Code
accelerator** (`run-tdd`/CI/skills remain the harness-agnostic baseline).

## Scope

- A new `implement-spec` skill (the loop) + a deterministic `## Tasks` parser script.
- Multi-vote reviewer, auto-debug, checkpoint/halt logic, optional feature-flag mode, optional
  multi-spec/roadmap cross-review, and graceful degradation to inline `run-tdd`.

### Out of Scope

- Parallel task execution (v1 = one-per-iteration for resumability); replacing `run-tdd`; non-CC
  subagent internals.

## Requirements

### Functional
- [ ] REQ-01: per-task Red→Green→Refactor from `## Tasks` in dependency order, one/iteration, resumable
- [ ] REQ-02: fresh implementer subagent scoped to the task `_Boundary:_`
- [ ] REQ-03: independent multi-vote reviewer (N skeptics, majority) gates acceptance
- [ ] REQ-04: auto-debug subagent (clean context, troubleshooting-first) on double-reject/block
- [ ] REQ-05: stop-and-report on out-of-boundary edit / red check-consistency / not-`aligned`
- [ ] REQ-06: per-task checkpoint — task `[x]`, `## Implementation Notes`, `TRB-`, tests + check
- [ ] REQ-07: optional feature-flag TDD mode (config-gated, default off)
- [ ] REQ-08: optional multi-spec / roadmap cross-review
- [ ] REQ-09: CC accelerator; degrade to inline `run-tdd`; CI/skills stay the baseline

### Non-Functional
- [ ] NFR-01 portability/degrade · NFR-02 never bypass CI/alignment · NFR-03 bounded cost ·
  NFR-04 deterministic task parser · NFR-05 reuse run-tdd/review-alignment/record-troubleshooting

### Technical

| Layer | File / Component | Change |
|---|---|---|
| Skill | `.claude/skills/implement-spec/SKILL.md` | NEW — the loop (orchestration instructions) |
| Script | `scripts/spec-tasks.mjs` | NEW — deterministic `## Tasks` parser + next-actionable selector |
| Config | `.specs/config.md` | NEW `## Implement` block (REVIEWER_VOTES=3, FEATURE_FLAG_MODE=off) |
| Skill | `run-change`, `run-tdd` | route large multi-task specs here / cross-reference the autonomous variant |
| Packaging | `package.json`, `bin/specway.mjs` | ship `spec-tasks.mjs` (`files[]` + `TOOLING` + alias) |
| Test | `test/spec-tasks.test.mjs` | NEW — parser tests |

## Design

### The loop (orchestration the skill instructs the agent to run)

```
implement-spec <spec-dir>:
  0. Preflight: if the spec has a requirements doc, require alignment-review.md == aligned (else HALT).
     If a roadmap.md spans multiple specs (REQ-08), run one cross-spec review first.
  1. tasks = spec-tasks.mjs <spec>/spec.md        # deterministic: id, boundary, deps, done-state
     next  = first task with box [ ] and all _Depends:_ boxes [x]     # dependency order
     if no next: DONE → final full-suite + check-consistency + report.
  2. IMPLEMENTER (fresh subagent, REQ-02): given { spec, this task, its _Boundary:_, conventions,
     clean-code.md }, run run-tdd for THIS task only (write failing test → implement → refactor).
     Returns the diff (restricted to _Boundary:_) or "blocked: <reason>".
  3. REVIEW (REQ-03): spawn N independent reviewers (config REVIEWER_VOTES, default 3) in separate
     contexts, each adversarial against { the task, clean-code.md, the _Boundary:_ }: "find why this
     is wrong or out-of-scope; default to reject if unsure." Accept iff majority (2/3) approve.
  4. On block, or majority-reject #2 (REQ-04): AUTO-DEBUG (fresh clean subagent) — search
     troubleshooting.md first, reproduce, find the root cause, propose the fix; loop back to step 2
     with its findings. Bound attempts (NFR-03).
  5. HALT conditions (REQ-05): a write outside _Boundary:_, check-consistency red, or (requirements-
     backed) not-aligned → STOP and report the failing task + reason. Do not continue.
  6. CHECKPOINT (REQ-06): mark the task [x]; append what was learned to `## Implementation Notes`;
     record a TRB- for a non-trivial debug; run the task's tests + check-consistency. Resumable here.
  7. goto 1.
```

- **Orchestration (approved):** the skill has the agent **author and run a Workflow script** —
  `pipeline(tasks, implement, review×3, verify)` — for deterministic fan-out, observable in
  `/workflows`. This makes the loop **Claude-Code-only** by design.
- **Degradation (REQ-09):** the loop is CC-only (Workflow tool). Where it isn't available (e.g.
  opencode), the **manual `run-tdd`** per task stays the baseline — no auto-loop, but nothing breaks:
  CI + the alignment gate + `run-tdd` remain the enforcement.
- **Feature-flag mode (REQ-07):** WHERE `FEATURE_FLAG_MODE` is on, the implementer ships each Green
  behind the project's flag system. Default off (opt-in; flag mechanics are stack-specific).
- **Reviewer prompt** carries distinct lenses across the N votes (correctness / boundary-and-scope /
  test-quality) rather than N identical passes — diversity catches more (as in this session's reviews).

### Edge Cases
- No `## Tasks` (or a lightweight spec) → the skill falls back to plain `run-tdd` on the whole spec.
- Circular/again-unmet deps → parser reports it; loop halts with a clear message.
- A task already `[x]` on resume → skipped (idempotent, resumable).

## Tasks

> Boundary-first. `_Depends:_` gates order; `_Boundary:_` scopes each task's writes.

- [ ] T1 — `implement-spec` SKILL.md: the full loop (dep-order iteration, implementer, review, auto-debug, halt, checkpoint, degradation). _Boundary:_ `.claude/skills/implement-spec/` _Depends:_ T2
- [x] T2 — `scripts/spec-tasks.mjs`: parse `## Tasks` (id, `_Boundary:_`, `_Depends:_`, `[ ]/[x]`) + select next-actionable; bulletproof. _Boundary:_ `scripts/spec-tasks.mjs` _Depends:_ —
- [ ] T3 — reviewer (multi-vote, diverse lenses) + auto-debug subagent prompt templates in the skill. _Boundary:_ `.claude/skills/implement-spec/` _Depends:_ T1
- [ ] T4 — `## Implement` config block (REVIEWER_VOTES, FEATURE_FLAG_MODE) + skill reads it. _Boundary:_ `.specs/config.md`, `.claude/skills/implement-spec/` _Depends:_ T1
- [ ] T5 — optional multi-spec/roadmap cross-review step. _Boundary:_ `.claude/skills/implement-spec/` _Depends:_ T1
- [ ] T6 — routing: `run-change` sends large multi-task specs here; `run-tdd` cross-references it; regenerate INDEX. _Boundary:_ `.claude/skills/run-change/SKILL.md`, `.claude/skills/run-tdd/SKILL.md` _Depends:_ T1
- [x] T7 — tests for `spec-tasks.mjs` (parse, dependency order, done-detection, no-Tasks). _Boundary:_ `test/spec-tasks.test.mjs` _Depends:_ T2

## File Structure Plan

- **create** `.claude/skills/implement-spec/SKILL.md` — the loop skill (6 canonical sections)
- **create** `scripts/spec-tasks.mjs` — deterministic task parser / next-actionable selector
- **create** `test/spec-tasks.test.mjs` — parser tests
- **modify** `package.json` — `files[]` += `scripts/spec-tasks.mjs`; `scripts` alias
- **modify** `bin/specway.mjs` — `TOOLING` += `scripts/spec-tasks.mjs`
- **modify** `.specs/config.md` — `## Implement` settings block
- **modify** `.claude/skills/run-change/SKILL.md` — route large multi-task specs to `implement-spec`
- **modify** `.claude/skills/run-tdd/SKILL.md` — cross-reference the autonomous variant

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Token burn on a hard task | Med | Med | Bounded votes/auto-debug (NFR-03); halt (REQ-05); report budget |
| Reviewer rubber-stamps | Med | High | Adversarial + diverse-lens majority of N (REQ-03) |
| Silent spec divergence | Low | High | Reuse alignment gate; halt on not-aligned (REQ-05) |

## Dependencies

- `## Tasks`/File Structure Plan (CHG-003); `run-tdd`, `review-alignment`, `record-troubleshooting`,
  `clean-code.md`; Agent/subagent capability; `check-consistency` + CI.

## Requirements Traceability

**Requirements:** [`requirements/003-implement-spec-loop/requirements.md`](../../requirements/003-implement-spec-loop/requirements.md)

| REQ ID | Requirement Summary | Priority | Acceptance Criteria |
|---|---|---|---|
| REQ-01 | Per-task loop, dependency order, resumable | Must | one task/iteration; unmet deps not started; resumable |
| REQ-02 | Fresh implementer subagent (boundary-scoped) | Must | implementer context isolated; only in-boundary writes |
| REQ-03 | Multi-vote independent reviewer | Must | N separate reviewers; accept on majority |
| REQ-04 | Auto-debug on double-reject/block | Must | fires on 2nd majority-reject/block; reads troubleshooting first |
| REQ-05 | Stop-and-report on boundary/red/not-aligned | Must | any condition halts; report names task + reason |
| REQ-06 | Per-task checkpoint + notes + TRB | Must | task [x]; checkpoint runs; resumable |
| REQ-07 | Optional feature-flag TDD | Should | config-gated; default off |
| REQ-08 | Optional multi-spec/roadmap cross-review | Should | multi-spec gets cross-review; single-spec skips |
| REQ-09 | CC accelerator + graceful degrade | Must | inline fallback works; CI/alignment unchanged |

> **Semantic gate:** before `run-tdd` and before archiving, `review-alignment` judges REQ coverage
> and writes `alignment-review.md`; `check-consistency` blocks archiving until it reads `aligned`.

## Tests

> The deterministic, unit-testable surface is the task parser (`spec-tasks.mjs`). The loop
> orchestration is agent behavior (validated by dogfooding it on a real spec, not unit tests).

| ID | Test | Type | Description |
|---|---|---|---|
| TEST-01 | parse `## Tasks` | unit | ids, `_Boundary:_`, `_Depends:_`, `[ ]/[x]` extracted from a Tasks block |
| TEST-02 | next-actionable = dependency order | unit | returns the first `[ ]` task whose every `_Depends:_` is `[x]`; skips dep-blocked |
| TEST-03 | done detection | unit | all `[x]` → next is null (loop done); mixed → correct next |
| TEST-04 | bulletproof on no/`malformed` Tasks | unit | a spec without `## Tasks` → empty list, no throw |

### Test Files

| File | What It Covers |
|---|---|
| `test/spec-tasks.test.mjs` | TEST-01..04 |

---

## Validation Checklist

- [x] Tests written BEFORE implementation (Red) — for the parser (T2/T7)
- [x] All tests passing (Green — parser; suite now 24)
- [ ] Skill has the 6 canonical sections; `check-consistency` + skills index green (T1)
- [ ] Degradation path documented (no Workflow tool → run-tdd baseline) (T1)
- [x] `spec-tasks.mjs` wired (`files[]` + `TOOLING` + alias)
- [ ] Dogfood: run `implement-spec` on a real small spec end-to-end before archiving
- [x] No regression in the existing tests (suite now 24)

## Notes

- **CC-only accelerator**, same posture as the hooks: `run-tdd` + CI + skills stay the harness-agnostic
  enforcement; opencode/no-subagent degrades to inline. Do not let the loop become sole enforcement.
- Resolved by the maintainer (2026-07-02): **Workflow-tool orchestration** (CC-only) and **N=3**
  reviewers (majority 2/3; lenses: correctness / boundary-and-scope / test-quality).
- Approved; implementing task-by-task in dependency order via `run-tdd` (T2 parser first).
