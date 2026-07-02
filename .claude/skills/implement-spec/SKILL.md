---
name: implement-spec
description: >-
  Autonomously implement an approved spec's `## Tasks` one at a time via a Claude Code Workflow — a
  fresh implementer per task, N independent reviewers (majority vote), and an auto-debug pass on
  repeated failure — halting at real failures and checkpointing so it is resumable. Use when the user
  says "implement spec", "implementar spec", "run the implement loop", "rodar implement-spec",
  "autonomous implement" or "implementação autônoma", for a spec that has a `## Tasks` section and (if
  requirements-backed) an `aligned` review. For a single small change use `run-tdd` instead. This is a
  Claude-Code accelerator; where the Workflow tool is unavailable (opencode), fall back to manual
  `run-tdd` per task.
metadata:
  version: 1.0.0
---

# Implement Spec (autonomous loop)

## Purpose

Drive a spec to completion **task-by-task, autonomously**, with quality guardrails that a single
long context can't provide. Inspired by cc-sdd's `/kiro-impl`: each task runs in a **fresh implementer**
(no context-rot from earlier tasks), is gated by **independent reviewers** (the writer never judges its
own work), and gets a **clean-context auto-debug** pass when it repeatedly fails. The loop **halts and
reports** at genuine failures instead of shipping broken code, and **checkpoints** after each task so an
interrupted run resumes from the last green task. It is an **accelerator over `run-tdd`**, never a
replacement — `run-tdd` + CI + the alignment gate remain the enforcement.

## Prerequisites

- An active spec at `.specs/changes/<nnn>-<slug>/spec.md` with a **`## Tasks`** section (each task
  carrying `_Boundary:_` and `_Depends:_`; see `feature-spec.md`). No `## Tasks` → use `run-tdd`.
- If the spec has a requirements doc: an **`aligned`** `alignment-review.md` (run `review-alignment`
  first — implementing a misaligned spec bakes in the drift).
- `scripts/spec-tasks.mjs` — the deterministic task parser / next-actionable selector.
- `.specs/config.md## Implement` — `REVIEWER_VOTES` (default 3, majority ⌈N/2⌉) and
  `FEATURE_FLAG_MODE` (default off).
- `.specs/memory/clean-code.md`, `.specs/memory/conventions.md`, `.specs/memory/troubleshooting.md`.
- The **Claude Code Workflow tool** (this skill's instructions authorize calling it). Without it, use
  the manual fallback in Step 6.

## Instructions

### Step 1: Preflight (gate before any code)

1. Confirm the spec has `## Tasks`. If not, stop and route to `run-tdd`.
2. If requirements-backed, confirm `alignment-review.md` reads `Verdict: aligned`; if not, run
   `review-alignment` first and stop until aligned.
3. If a `roadmap.md` spans **multiple** specs (multi-spec initiative), first run a **cross-spec
   review** (one reviewer agent per pair of interacting specs) to catch contradictions / interface
   mismatches; resolve them before implementing. Single-spec runs skip this.
4. Read `REVIEWER_VOTES` (N) and `FEATURE_FLAG_MODE` from `.specs/config.md## Implement`.

### Step 2: Parse the task list

Run `node scripts/spec-tasks.mjs <spec>/spec.md` for the tasks and
`node scripts/spec-tasks.mjs <spec>/spec.md --next` for the next dependency-actionable task. The loop
processes **one task per iteration, in dependency order** (never a task whose `_Depends:_` are unmet),
which is what makes it resumable.

### Step 3: Run the loop as a Workflow

Author and run a **Workflow** that processes tasks **sequentially** (tasks share the codebase and have
dependencies — do not fan-out across tasks) while fanning out the **N reviewers concurrently within**
each task. Reference skeleton (adapt to the spec):

```js
export const meta = {
  name: 'implement-spec-run',
  description: 'Autonomously implement <spec>: per-task implementer -> N reviewers -> verify',
  phases: [{ title: 'Implement' }, { title: 'Review' }, { title: 'Verify' }],
}
const SPEC = args.specPath                 // e.g. .specs/changes/012-foo/spec.md
const N = args.reviewerVotes ?? 3
const LENSES = ['correctness', 'boundary-and-scope', 'test-quality']  // diverse, not N-identical
const done = []
while (true) {
  // deterministic next-actionable task (dependency order); parsed fresh each iteration (resumable)
  const task = await agent(`Return the next actionable task of ${SPEC} as JSON, or null, using
    scripts/spec-tasks.mjs --next.`, { label: 'next', phase: 'Implement', schema: TASK_OR_NULL })
  if (!task || !task.id) break
  // 1) fresh implementer, scoped to the task boundary — run-tdd for THIS task only (Red->Green->Refactor)
  const impl = await agent(implementPrompt(SPEC, task), { label: `impl:${task.id}`, phase: 'Implement',
    isolation: 'worktree', schema: IMPL_RESULT })                    // worktree keeps parallel edits clean
  // 2) N independent reviewers, distinct lenses, concurrent — accept on majority
  const votes = await parallel(Array.from({ length: N }, (_, i) => () =>
    agent(reviewPrompt(SPEC, task, impl, LENSES[i % LENSES.length]),
      { label: `review:${task.id}:${i}`, phase: 'Review', schema: VERDICT })))
  const approvals = votes.filter(Boolean).filter(v => v.approve).length
  if (approvals < Math.ceil(N / 2)) {
    // 3) rejected -> one retry; on 2nd majority-reject or a block -> auto-debug (clean context)
    const dbg = await agent(autoDebugPrompt(SPEC, task, impl, votes), { label: `debug:${task.id}`,
      phase: 'Implement', schema: DEBUG_RESULT })
    // loop continues: next iteration re-attempts the same (still-open) task with dbg.findings
    continue
  }
  // 4) verify + checkpoint: run the task's tests + check-consistency; on green, mark [x] + notes
  const ok = await agent(verifyAndCheckpointPrompt(SPEC, task, impl),
    { label: `verify:${task.id}`, phase: 'Verify', schema: CHECKPOINT })
  if (!ok.green) return { halted: task.id, reason: ok.reason }        // HALT (see Step 5)
  done.push(task.id)
}
return { done }
```

- **Implementer prompt** (`implementPrompt`): "Implement ONLY task `<id>` of this spec via `run-tdd`
  (write the failing test first, then the minimum code, then refactor to `clean-code.md`). Touch ONLY
  files under `<_Boundary:_>`. If blocked, return `{ blocked: <why> }`." (WHERE `FEATURE_FLAG_MODE` is
  on, add: "ship the Green behind the project's feature flag.")
- **Reviewer prompt** (`reviewPrompt`, per lens — Step T3): "Adversarially review task `<id>`'s diff
  through the **`<lens>`** lens. correctness = logic/edge/error paths vs the spec; boundary-and-scope =
  did it stay within `<_Boundary:_>` and not gold-plate; test-quality = is the test real, does it fail
  without the code, are assertions meaningful. Default to **reject** if unsure. Return `{approve, reasons}`."
- **Auto-debug prompt** (`autoDebugPrompt` — Step T3): "Task `<id>` failed/was rejected. **Search
  `.specs/memory/troubleshooting.md` first.** Reproduce the failure, find the ROOT cause (not a
  symptom), and return the concrete fix + a one-line lesson. If non-trivial, it will be recorded as a
  `TRB-`."

### Step 4: Checkpoint per accepted task (resumability)

On a green verify: mark the task `[x]` in the spec, append what was learned to a `## Implementation
Notes` section, record a `TRB-` (via `record-troubleshooting`) for any non-trivial debug, and confirm
`node scripts/check-consistency.mjs` is green. This is the resume point — a re-run picks up at the next
`[ ]` task.

### Step 5: Halt conditions (never push through)

**Stop the loop and report to the human** if any of these occur — do not continue to the next task:
- a task wrote **outside its `_Boundary:_`**;
- `node scripts/check-consistency.mjs` goes **red**;
- a requirements-backed spec's `alignment-review.md` is **not `aligned`**;
- reviewers still reject after auto-debug (bounded attempts — respect a small cap, see `NFR-03`).
Report the failing task id, the reason, and the diff so far.

### Step 6: Degradation (no Workflow tool)

If the Workflow/subagent capability is unavailable (e.g. opencode), do **not** fail — run the same
steps **manually per task**: `run-tdd` for the next-actionable task, then a self-review against the
three lenses, then checkpoint, then the next task. This is plain `run-tdd` sequenced by the task list;
CI + the alignment gate remain the enforcement.

### Step 7: Finish

When `--next` returns null (all tasks `[x]`), run the **full suite** + `check-consistency`, then hand
off to `run-tdd` Step 10–11 (alignment re-review → archive → `update-changelog` → `log.md` entry). Do
not archive on a red check or an unaddressed halt.

## Output

Report: tasks completed (with review vote tallies), any auto-debug root causes (+ `TRB-` ids), any
**halt** (task id + reason), the final `check-consistency` / suite result, and the next step (archive
or fix the halted task).

## Examples

### Example 1: Autonomous implementation of a multi-task feature

**User says:** "implementar spec 012 de forma autônoma"

**Agent should:** preflight (has `## Tasks`, review `aligned`) → parse tasks → run the Workflow: for
each next-actionable task, a fresh implementer does `run-tdd`, 3 reviewers (correctness / boundary /
test-quality) vote, accept on 2/3, checkpoint → on all green, full suite + check → hand to `run-tdd`
archive/changelog/log. Report vote tallies and any halts.

### Example 2: A task keeps failing

**User says:** "rodar implement-spec no 007"

**Agent should:** implement task T3 → reviewers reject 2× → spawn auto-debug (searches
`troubleshooting.md`, finds the root cause) → re-attempt → still rejected after the cap → **HALT**,
report T3 + the reason + record a `TRB-`, and stop (do not touch T4+).

## References

- `.claude/skills/run-tdd/SKILL.md` — the per-task cycle the implementer runs (and the manual fallback)
- `.claude/skills/review-alignment/SKILL.md` — the preflight gate + the archive gate
- `.claude/skills/record-troubleshooting/SKILL.md` — where auto-debug lessons become `TRB-` memory
- `scripts/spec-tasks.mjs` — deterministic `## Tasks` parser / next-actionable selector
- `.specs/config.md## Implement` — `REVIEWER_VOTES`, `FEATURE_FLAG_MODE`
- `.specs/memory/clean-code.md`, `.specs/memory/troubleshooting.md` — review standard + debug memory
- `.specs/templates/feature-spec.md` — the `## Tasks` + `## File Structure Plan` sections this consumes
