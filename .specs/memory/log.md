# Working Log

> Append-only, chronological journal of what agents did and learned in this project. This is the
> `log.md` of Karpathy's LLM-Wiki: the running record that makes memory *compounding* rather than
> re-derived each session. Newest entries go at the **bottom** — never rewrite or delete history.

## What this is (and is not)

| This file (`log.md`) | Not this file |
|---|---|
| Chronological — "what happened, in order" | `CHANGELOG.md` — user-facing release notes, compiled from `archive/` |
| Working memory across sessions — pick up where you left off | `troubleshooting.md` — topical error/fix memory, searched by symptom |
| Append-only; entries are never edited after the fact | `architecture.md` — curated ADRs, edited in place |

The CHANGELOG answers *"what shipped"*. This log answers *"what was I doing, and why, last session"*.

## How to write an entry

Append one block per work session (or per meaningful milestone). Keep it short — a few lines, not a
transcript. Format:

```markdown
## YYYY-MM-DD — <short title>

- **Did:** what changed (specs touched, files, decisions made).
- **Learned:** anything non-obvious worth remembering (a gotcha → also record it in troubleshooting.md).
- **Next:** the immediate next step, so the next session starts without re-reading everything.
- **Refs:** spec ids (`CHG-`/`FIX-`/`MIG-`), `TRB-` ids, commits, PRs.
```

Rules:

1. **Append only.** Add at the bottom; do not edit or remove past entries — the history is the point.
2. **Date every entry** with an ISO `YYYY-MM-DD` prefix so it is sortable and greppable.
3. **One block per session/milestone**, not per file edit. Compile, don't dump.
4. **Cross-link, don't duplicate.** Point to specs, `TRB-` entries, and commits instead of restating them.

---

## Log

<!--
Template — copy, set today's date, append at the bottom:

## 2026-01-15 — Implemented CSV export (CHG-014)

- **Did:** Added export service + handler; spec CHG-014 archived; CHANGELOG regenerated.
- **Learned:** the report stream is lazy — must `await` the cursor before serializing or rows drop.
- **Next:** wire the export button into the reports toolbar (follow-up spec 015).
- **Refs:** CHG-014, commit 9f3a1c2, TRB-002 (lazy-cursor gotcha).
-->

## 2026-07-02 — Methodology-enforcing Claude Code hooks (CHG-002, methodology v1.4.0)

- **Did:** Analysed the repo with an adversarial multi-agent workflow, then shipped a high-signal hook
  set. Tier 0: `SessionStart` matcher now `startup|resume|compact`. New `PreToolUse` guard
  (`scripts/methodology-guard.mjs`) blocks archiving an unaligned requirements-backed spec + hand-edits
  of `baseline.json`; new `PostToolUse` nudge (`scripts/methodology-nudge.mjs`) flags a spec written
  without a `## Tests` section and turns `specway upgrade|scan|init` into a next-step directive. Delivery
  gap closed via `scripts/merge-hooks.mjs` (idempotent keyed merge) wired into `cmdScan`/`cmdUpgrade`.
  Added a `node --test` suite (`test/`, now 17 tests) + `npm test`. Bumped methodology version 1.2.0 → 1.4.0
  (config.md + METHODOLOGY.md versions row) so `upgrade` actually delivers the hooks to the installed
  base. Spec/requirements/alignment-review under `001-methodology-hooks`.
- **Learned:** (1) `settings.json` is additive/frozen after first setup, so new hook WIRING can't ride
  the CLI copy — it needs the keyed merge, and `cmdUpgrade` only runs when FROM<TO, so a methodology
  version bump is mandatory for delivery. (2) The adversarial review killed several "obvious" hooks
  (UserPromptSubmit keyword router, turn-end whole-repo check-consistency, per-edit test runs) as
  net-negative noise — the value was the filter, not the fan-out. (3) Pre-existing landmine: the
  `CHG-001` prose mention in `CHANGELOG.md [1.3.0]` will trip `check-consistency`'s archive↔CHANGELOG
  cross-check the first time ANY spec is archived — reword/handle before archiving.
- **Did (follow-up):** neutralized the `CHG-001` changelog landmine, archived CHG-002, regenerated
  CHANGELOG, committed on branch `feat/methodology-hooks`. Then dogfooding fired the CLI-nextstep nudge
  on the commit command itself (it mentioned "specway upgrade"); fixed it to detect by CLI **output
  signature** instead of the command string (TEST-15/16; suite now 16).
- **Verified (live, A-01):** the PreToolUse `deny` contract is enforced — attempting
  `rm .specs/baseline.json` in this session was **blocked** and the guard's reason surfaced back.
  PostToolUse `additionalContext` fired live (the nudge on Bash). SessionStart stdout injection is
  proven by the startup hook; the `compact` matcher reuses that identical mechanism.
- **Next:** push `feat/methodology-hooks` + open a PR when ready. Deferred hooks (stack-specific TDD
  guard, SessionEnd log breadcrumb) remain in the backlog.
- **Refs:** CHG-002, requirements 001-methodology-hooks, methodology 1.2.0 → 1.4.0.

## 2026-07-02 — cc-sdd-inspired enhancements, batch 1 (CHG-003)

- **Did:** Analysed gotalab/cc-sdd and landed the three cheap, high-fit ideas: `--dry-run` on the CLI
  (write-guarded init/scan/upgrade + banner + help + tests), **EARS** as a requirements methodology
  (`gather-requirements` + requirements template), and a **`## Tasks` (boundary/deps) + `## File
  Structure Plan`** section in the feature-spec template (read by `run-tdd`, one task at a time).
  Archived CHG-003; CHANGELOG [Unreleased] updated. Suite now 20 tests.
- **Learned:** the CLI dry-run only needed write-guards in the shared copy helpers + a banner — the
  command bodies already compute the "would-happen" list. EARS acceptance criteria map 1:1 to
  `TEST-NN`, reinforcing the traceability the checker already enforces.
- **Next:** the flagship cc-sdd idea — an autonomous `implement-spec` loop (per-task fresh subagent,
  independent reviewer, auto-debug) — gets its own full-path spec + design (003). At the next release,
  bump package + methodology version together (coupled for the kit; cut-release enforces it).
- **Refs:** CHG-003 (archived; lightweight path, no requirements doc).

## 2026-07-02 — Autonomous implement-spec loop (CHG-004)

- **Did:** Full-path spec (requirements in **EARS**, dogfooding CHG-003) for the flagship cc-sdd idea,
  approved at the alignment gate. Built `scripts/spec-tasks.mjs` (deterministic `## Tasks` parser +
  next-actionable selector; 4 tests, TDD), `.claude/skills/implement-spec/` (the loop as a **Workflow**:
  sequential tasks, fresh implementer per task, **N=3** reviewers with diverse lenses, auto-debug on
  double-reject, HALT on out-of-boundary/red/not-aligned, per-task checkpoint, degrade to `run-tdd`),
  the `## Implement` config block, and `run-change`/`run-tdd` routing. Archived CHG-004; skills index
  → 16; CHANGELOG [Unreleased] updated.
- **Learned:** approved decisions — **Workflow-tool** orchestration (CC-only) + **N=3**. Parser edge: a
  task whose description contains the literal `_Boundary:_`/`_Depends:_` markers (this meta-spec) needs
  right-most annotation matching. Built the loop by dogfooding the method (T2 first — no deps).
- **Next:** **dogfood** — run `implement-spec` end-to-end on the first real multi-task spec (deferred by
  the maintainer). This completes the cc-sdd initiative: **all 4 ideas shipped**. At the next release,
  bump package + methodology together and cut `[Unreleased]` (CHG-003 + CHG-004).
- **Refs:** CHG-004, requirements 003-implement-spec-loop.
