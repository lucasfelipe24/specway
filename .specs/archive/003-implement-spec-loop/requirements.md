# Requirements Specification

| Field | Value |
|---|---|
| **ID** | REQ-003 |
| **Status** | draft |
| **Author** | Specway maintainer |
| **Created** | 2026-07-02 |
| **Stakeholders** | Kit maintainer, AI agents (Claude Code), downstream projects, CI |

---

## 1. Problem Statement

### Current Situation

`run-tdd` drives a **single** Red→Green→Refactor cycle that the agent performs in **one growing
context**. Implementing a multi-task spec means the agent holds the whole spec + every task's diff in
one window (context-rot late in the run), with **no independent review** (the same context that wrote
the code judges it) and **no systematic auto-debug** (a stuck agent improvises). `cc-sdd`'s `/kiro-impl`
shows a better shape: one task per iteration in a fresh context, an independent reviewer, and an
auto-debug pass — resumable and long-running.

### Why This Matters

The recurring goal is an **autonomous** agent that follows the methodology without constant user
input. A per-task loop with independent multi-vote review + auto-debug raises implementation quality
and lets the agent run long safely, while the human stays in the loop only at genuine failures.

### Success Definition

| Metric | Current | Target |
|---|---|---|
| Context isolation per task | none (one window) | fresh subagent per task |
| Independent review before accepting a task | none | N-vote majority by independent subagents |
| Systematic root-cause step on failure | none | auto-debug subagent (troubleshooting-first) |
| Resumability after interruption | manual | 1 task/iteration, checkpointed |
| Sole enforcement risk | n/a | 0 — accelerator only; run-tdd/CI stay the baseline |

---

## 2. Stakeholder Map

| Stakeholder | Role | Interest | Influence | Key Concern |
|---|---|---|---|---|
| Kit maintainer | Owner | Autonomy without losing the gates | High | Loop must stop at real failures, never bypass CI/alignment |
| AI agent (Claude Code) | Executor | Orchestrates subagents | High | Clear per-task contract; graceful degrade without subagents |
| Downstream project | Consumer | Gets the skill via the kit | Med | Works on any stack; feature-flag mode optional |
| CI | Backstop | Still the deterministic gate | Med | Loop must not become a parallel source of truth |

---

## 3. Methodology

Selected: **EARS** (primary — precise `SHALL` behavior for the loop's fire/stop conditions, each
mapping 1:1 to a test) + a short **Job Story** frame. (Dogfoods the EARS support added in CHG-003.)

---

## 4. Requirements

### 4.3 Job Stories

| ID | Story |
|---|---|
| JS-01 | When I have an approved multi-task spec, I want the agent to implement it task-by-task with independent review, so that I get higher-quality code without babysitting each step. |
| JS-02 | When a task keeps failing, I want the agent to investigate the root cause and, if it still can't, stop and tell me, so that I'm not handed silently-broken code. |

### 4.5 EARS Requirements

| ID | EARS Requirement | Acceptance Criteria |
|---|---|---|
| EARS-01 | WHEN `implement-spec` is invoked on a spec that has a `## Tasks` section, the system SHALL process tasks **in dependency order, one per iteration**. | 1. Tasks with unmet `_Depends:_` are not started. 2. Exactly one task advances per iteration. 3. Progress is resumable. |
| EARS-02 | WHEN a task begins, the system SHALL run it in a **fresh implementer subagent scoped to the task's `_Boundary:_`**, doing Red→Green→Refactor for that task only. | 1. Implementer context excludes other tasks' diffs. 2. Only in-boundary files are written. |
| EARS-03 | WHEN a task's implementation completes, the system SHALL obtain **N independent reviewer verdicts** and accept the task only on a **majority approve**. | 1. Reviewers run in separate contexts from the implementer. 2. Accept requires ⌈N/2⌉ approvals. |
| EARS-04 | IF the reviewers reject by majority **twice**, OR the implementer reports blocked, THEN the system SHALL spawn an **auto-debug subagent in a clean context** that searches `troubleshooting.md` first and investigates the root cause before the next attempt. | 1. Auto-debug runs on the 2nd majority-reject or a block. 2. It reads `troubleshooting.md` before proposing a fix. |
| EARS-05 | IF a task writes outside its `_Boundary:_`, OR `check-consistency` goes red, OR a requirements-backed spec's `alignment-review.md` is not `aligned`, THEN the system SHALL **stop and report to the human** instead of continuing. | 1. Any of the three conditions halts the loop. 2. The report names the failing task + reason. |
| EARS-06 | WHEN a task is accepted, the system SHALL mark it `[x]`, append learnings to `## Implementation Notes`, record a `TRB-` for any non-trivial debug, and **checkpoint** (run tests + `check-consistency`). | 1. Task box flipped. 2. A checkpoint runs before the next task. 3. State is resumable from the checkpoint. |
| EARS-07 | WHILE the loop runs, the system SHALL keep each task's work **context-isolated** so earlier tasks do not rot later tasks' context. | 1. No task's subagent inherits another task's full transcript. |
| EARS-08 | WHERE feature-flag TDD is enabled for the project (config), the system SHALL implement each task's Green **behind a feature flag** (RED→GREEN behind a toggle). | 1. When enabled, new behavior ships gated. 2. Default is **off** (opt-in). |
| EARS-09 | WHERE a `roadmap.md` spans multiple specs, the system SHALL run a **cross-spec review** to catch contradictions / interface mismatches before implementing. | 1. Multi-spec initiatives get a cross-review pass. 2. Single-spec runs skip it. |
| EARS-10 | The system SHALL remain a **Claude-Code accelerator, never sole enforcement**: the loop uses the Workflow tool (CC-only), and where it is unavailable (opencode) the **manual `run-tdd`** per task stays the harness-agnostic baseline. | 1. opencode path uses run-tdd (no auto-loop) and still ships the spec. 2. CI/alignment gate unchanged. |

---

## 5. Functional Requirements

| ID | Description | Source | Priority (MoSCoW) |
|---|---|---|---|
| REQ-01 | An `implement-spec` skill drives per-task Red→Green→Refactor from the spec's `## Tasks` in dependency order, one task/iteration, resumable | EARS-01/02/07, JS-01 | Must |
| REQ-02 | Per-task **fresh implementer subagent** scoped to the task's `_Boundary:_` | EARS-02 | Must |
| REQ-03 | **Independent multi-vote reviewer** (N skeptics, majority) gates task acceptance | EARS-03 | Must |
| REQ-04 | **Auto-debug subagent** (clean context, troubleshooting-first) on double-reject or block | EARS-04, JS-02 | Must |
| REQ-05 | **Stop-and-report** on out-of-boundary edit, red `check-consistency`, or not-`aligned` | EARS-05, JS-02 | Must |
| REQ-06 | **Checkpoint** per accepted task: task `[x]`, `## Implementation Notes`, `TRB-`, tests + check | EARS-06 | Must |
| REQ-07 | **Optional feature-flag TDD** mode (config-gated, default off) | EARS-08 | Should |
| REQ-08 | **Optional multi-spec / roadmap cross-review** | EARS-09 | Should |
| REQ-09 | **Claude-Code accelerator** with graceful degradation to inline `run-tdd`; CI/skills stay the baseline | EARS-10 | Must |

---

## 6. Non-Functional Requirements

| ID | Category | Description | Measurement |
|---|---|---|---|
| NFR-01 | Portability | Skill instructions must degrade to inline run-tdd where subagents aren't available; no rule enforced solely by this loop | opencode/no-subagent run still implements the spec |
| NFR-02 | Safety | The loop never bypasses CI or the alignment gate; a checkpoint runs each task; halts on the EARS-05 conditions | Fault-injection: red check → loop halts, not proceeds |
| NFR-03 | Cost control | Reviewer vote count N and auto-debug are bounded; the loop reports token/iteration budget and respects a cap | A run terminates within the configured task/vote caps |
| NFR-04 | Determinism of the task parser | Parsing `## Tasks` deps/boundaries is deterministic and testable | `scripts/spec-tasks.mjs` unit tests pass |
| NFR-05 | Reuse | The loop reuses `run-tdd`, `record-troubleshooting`, `review-alignment`, `clean-code.md` rather than re-implementing them | Skill references, no duplication |

---

## 7. Constraints

| ID | Constraint | Type | Impact |
|---|---|---|---|
| C-01 | The loop is orchestrated by the Claude Code Workflow tool | Technical | Loop is CC-only; opencode uses manual `run-tdd` (baseline). Accepted trade-off for deterministic, observable fan-out. |
| C-02 | Scripts must ship via `files[]` + `TOOLING` (per REQ-07 wiring pattern) | Technical | The task-parser script needs the standard wiring |
| C-03 | Feature-flag mechanics are stack-specific | Technical | Feature-flag mode stays opt-in + delegated to the project's flag system |

---

## 8. Assumptions

| ID | Assumption | Validation? | Risk if Wrong |
|---|---|---|---|
| A-01 | The agent can spawn isolated subagents (Task/Agent) and collect their results | Yes (matches this session's Workflow/Agent usage) | Loop degrades to inline (still works) |
| A-02 | A spec's `## Tasks` section (CHG-003) is the task source | No | — |
| A-03 | Majority-vote review meaningfully catches defects a single reviewer misses | Partly | Tune N; single-vote fallback |

---

## 9. Out of Scope

- Non-Claude-Code subagent orchestration internals; a GUI; parallel multi-task execution (v1 is
  one-task-per-iteration for resumability); replacing `run-tdd` (it stays the baseline).

---

## 10. MoSCoW Prioritization

| Priority | Requirements | Rationale |
|---|---|---|
| **Must** | REQ-01..06, REQ-09 | The core autonomous loop + safety + portability |
| **Should** | REQ-07, REQ-08 | Feature-flag mode + multi-spec (the "v1 complete" additions) |
| **Won't (now)** | Parallel task execution | Conflicts with resumable 1-task/iteration |

---

## 11. Dependencies

| Dependency | Type | Status | Impact |
|---|---|---|---|
| `## Tasks` + File Structure Plan (CHG-003) | Internal | Available | Task source |
| `run-tdd`, `review-alignment`, `record-troubleshooting`, `clean-code.md` | Internal | Available | Reused per NFR-05 |
| Agent/subagent capability | Platform | Available (CC) | REQ-02/03/04 |
| `check-consistency` + CI | Internal | Available | EARS-05 halt + NFR-02 |

---

## 12. Domain Glossary

| Term | Definition |
|---|---|
| Implementer | Fresh subagent that implements one task (Red→Green→Refactor) |
| Reviewer | Independent subagent that adversarially judges a task's diff |
| Auto-debug | Clean-context subagent that finds a root cause after repeated failure |
| Boundary | The files/modules a task may touch (`_Boundary:_` in `## Tasks`) |
| Checkpoint | Post-task tests + `check-consistency` making the loop resumable |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Loop burns tokens on a hard task | Med | Med | Bounded votes + auto-debug attempts; report budget; halt (EARS-05) |
| Reviewer rubber-stamps | Med | High | Adversarial prompt + majority of N; distinct lenses |
| Silent divergence from spec | Low | High | Reuse alignment gate + halt on not-aligned |
| CC-only accelerator ignored by opencode | Low | Low | Graceful degrade to inline run-tdd (REQ-09) |

---

## 14. Traceability Matrix

| REQ ID | Source | Summary | Priority | Spec | Test |
|---|---|---|---|---|---|
| REQ-01 | EARS-01/02/07 | Per-task loop, dep order, resumable | Must | changes/003-implement-spec-loop/ | — |
| REQ-02 | EARS-02 | Fresh implementer per task (boundary) | Must | changes/003-implement-spec-loop/ | — |
| REQ-03 | EARS-03 | Multi-vote independent reviewer | Must | changes/003-implement-spec-loop/ | — |
| REQ-04 | EARS-04 | Auto-debug on double-reject/block | Must | changes/003-implement-spec-loop/ | — |
| REQ-05 | EARS-05 | Stop-and-report on boundary/red/not-aligned | Must | changes/003-implement-spec-loop/ | — |
| REQ-06 | EARS-06 | Per-task checkpoint + notes + TRB | Must | changes/003-implement-spec-loop/ | — |
| REQ-07 | EARS-08 | Optional feature-flag TDD | Should | changes/003-implement-spec-loop/ | — |
| REQ-08 | EARS-09 | Optional multi-spec/roadmap cross-review | Should | changes/003-implement-spec-loop/ | — |
| REQ-09 | EARS-10 | CC accelerator + graceful degrade | Must | changes/003-implement-spec-loop/ | — |

---

## 15. Appendix

### Research & References
- gotalab/cc-sdd `/kiro-impl` (per-task subagent, independent review, auto-debug); the Workflow
  patterns used in this session (fan-out + adversarial verify) are the same shape.

### Open Questions (resolved 2026-07-02)
- [x] N (reviewer votes) = **3** (majority 2/3); lenses: correctness / boundary-and-scope / test-quality.
- [x] Orchestration = **Workflow tool** (deterministic, observable fan-out), accepting CC-only; opencode
      falls back to manual `run-tdd`.

---

## Validation Checklist

- [x] Stakeholders identified
- [x] Methodology chosen (EARS + Job Stories)
- [x] Functional requirements documented with sources
- [x] Non-functional requirements with measurements
- [x] Constraints + assumptions
- [x] MoSCoW complete
- [x] Dependencies + risks
- [x] Out of scope
- [x] Traceability populated
- [ ] Stakeholder approval (pending — this is the design-for-approval)
