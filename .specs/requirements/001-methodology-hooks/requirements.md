# Requirements Specification

| Field | Value |
|---|---|
| **ID** | REQ-001 |
| **Status** | draft |
| **Author** | Specway maintainer |
| **Created** | 2026-07-02 |
| **Stakeholders** | Kit maintainer (author), downstream projects, AI agents running under Claude Code, CI |

---

## 1. Problem Statement

### Current Situation

The methodology is enforced today by three layers: harness-agnostic text (`AGENTS.md` +
`@.specs/methodology.md`, inlined every turn), the deterministic CI/`specway check` gate
(`check-consistency` + `update-changelog --check` + `update-skills-index --check`), and the skills.
There is exactly **one** Claude Code hook — `SessionStart → session-context.mjs` — and it fires only
on `startup|resume`. Between session start and CI, the agent must *remember* to run the right skill
at the right lifecycle moment (write the spec first, keep the changelog current, run
`review-alignment` before archiving, feed the log). When it forgets, nothing nudges it until CI fails
or a human notices.

### Why This Matters

The kit's goal is an **autonomous** agent that follows the methodology without the user re-prompting
each obligation. Every missed moment (an archive without an alignment review, a spec with no Tests
section, a dropped `reconcile-upgrade` after `specway upgrade`) costs a CI failure, a human
correction, or silent drift. Well-placed hooks close these gaps at the exact trigger point — but a
badly-placed hook is worse than none: it false-fires on the methodology's own lightweight path, nags
on a normally-dirty working tree, or duplicates CI, training the agent to ignore it.

### Success Definition

| Metric | Current | Target |
|---|---|---|
| Lifecycle moments with a deterministic nudge/gate | 1 (session start) | ≥ 5 high-signal moments |
| Alignment gate skipped at archive time | possible (only caught later by CI) | blocked at the archive action |
| New kit hook wiring reaching existing projects on `upgrade` | 0 (settings.json frozen) | idempotent keyed merge delivers it |
| Hooks that are sole enforcement of a rule | n/a | 0 (every hook has a CI/skill/text backstop) |
| False-positive rate on the lightweight path / dirty tree | n/a (no such hooks) | ~0 (hooks scoped to high-signal, irreversible moments) |

---

## 2. Stakeholder Map

| Stakeholder | Role | Interest | Influence | Key Concern |
|---|---|---|---|---|
| Kit maintainer | Owner/author | Autonomy without noise | High | Hooks must accelerate, never annoy or block legitimate work |
| Downstream project | Consumer of the kit | Gets hooks via init/scan/upgrade | High | Wiring must reach existing projects; must not clobber their `settings.json` |
| AI agent (Claude Code) | Executor | Reads injected context / obeys gates | Med | Nudges must be actionable and non-looping |
| opencode agent | Executor (other harness) | Ignores `.claude/settings.json` | Med | Must lose nothing — CI + text still enforce |
| CI | Deterministic backstop | Already enforces Rules 5/7 + changelog | Med | Hooks must not become a parallel, drifting source of truth |

---

## 3. Methodology

Selected: **User Stories** (primary) + **BDD Scenarios** (for the fire/no-fire behavior of each
guard, which is the risky part). The subjects are the agent and the kit's lifecycle, so stories map
cleanly and Gherkin pins the exact trigger conditions the adversarial review flagged.

---

## 4. Requirements

### 4.1 User Stories

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-01 | As an agent resuming after context compaction, I want the "where you left off" summary re-injected, so that I keep methodology footing instead of resuming by coding | 1. `SessionStart` fires on `compact` (and `startup`/`resume`). 2. Reuses `session-context.mjs` unchanged. 3. Silent when nothing is in flight. 4. `clear` is NOT included. |
| US-02 | As a maintainer, I want archiving a requirements-backed spec **blocked** until its `alignment-review.md` reads `aligned`, so that the semantic gate can never be skipped at the irreversible archive moment | 1. Fires on moving/writing a spec dir into `.specs/archive/`. 2. Denies with a reason pointing to `review-alignment` when unaligned/missing. 3. Only for specs that have a matching requirements doc. 4. Fails **open** on any internal error. |
| US-03 | As an agent authoring a spec, I want a nudge when a `changes/**/spec.md` has a body but no `## Tests` / `## Regression Test` section, so that I don't reach `run-tdd` with a non-TDD-ready spec | 1. Fires after Write/Edit of `.specs/changes/**/spec.md`. 2. Non-blocking (context nudge). 3. Silent when a Tests section exists or the file is an obvious stub/template. 4. Names the missing section. |
| US-04 | As a maintainer, I want manual edits/deletes of `.specs/baseline.json` blocked, so that the forward-only grandfather snapshot can't be gamed to skip the traceability/alignment gate | 1. Fires on Edit/Write/Bash-delete targeting `baseline.json`. 2. Denies with the "one-time snapshot, CLI-only" reason. 3. Silent for all other paths. 4. Fails open on internal error. |
| US-05 | As an agent that just ran `specway upgrade\|scan\|init`, I want the CLI's printed "Next: run X skill" turned into actionable context, so that the judgment phase (`reconcile-upgrade` / `scan-project` / `init-project`) and the `log.md` upgrade record aren't dropped | 1. Fires after a Bash call whose command runs `specway`/`npx …specway` with `upgrade\|scan\|init`. 2. Injects the matching next-skill directive + "record `from→to` in `log.md`" for upgrade. 3. Silent for other `specway` subcommands (`check`, `help`). |
| US-06 | As a downstream project on `specway upgrade`, I want new kit-owned hook wiring merged into my existing `settings.json` idempotently, so that hook improvements actually reach the installed base without clobbering my own hooks | 1. Merge keyed by `matcher`+`command` (no duplicate entries on re-run). 2. Never removes or overwrites user-added hooks. 3. Extends the existing `SessionStart` matcher to include `compact` if it points at `session-context.mjs` and lacks the token. 4. Documented in `upgrade-methodology` + `reconcile-upgrade`. |

### 4.4 BDD Scenarios

```gherkin
Feature: Archive alignment gate (US-02)
  Scenario: Block archiving an unaligned requirements-backed spec
    Given a spec dir 007-x with a matching requirements/007-x
    And its alignment-review.md is missing or verdict is not "aligned"
    When the agent runs `git mv .specs/changes/007-x .specs/archive/007-x`
    Then the PreToolUse hook denies the command
    And the reason tells the agent to run the review-alignment skill first

  Scenario: Allow archiving an aligned spec
    Given a spec dir 007-x whose alignment-review.md reads "Verdict: aligned" covering every REQ
    When the agent archives it
    Then the hook stays silent and the move proceeds

  Scenario: Ignore a lightweight spec with no requirements
    Given a micro-spec 012-fix with no matching requirements doc
    When the agent archives it
    Then the hook stays silent (the alignment gate does not apply)

  Scenario: Internal error never wedges the agent
    Given check-consistency cannot be run (missing/broken)
    When the agent archives any spec
    Then the hook exits 0 (allow) — fail open

Feature: Spec-not-TDD-ready nudge (US-03)
  Scenario: Nudge a real spec missing a Tests section
    Given a written changes/009-y/spec.md with a Context/Requirements body and no "## Tests" section
    When the write completes
    Then a PostToolUse context nudge says the spec is not TDD-ready and names the missing section

  Scenario: Stay silent when Tests exists
    Given changes/009-y/spec.md contains a "## Tests" (or "## Regression Test") section
    When the write completes
    Then the hook injects nothing

Feature: CLI next-step directive (US-05)
  Scenario: Turn an upgrade run into a directive
    When a Bash command running `npx @lucasfelipe23/specway upgrade` completes
    Then a PostToolUse nudge says to run reconcile-upgrade now and record from→to in log.md
  Scenario: Ignore non-lifecycle subcommands
    When a Bash command running `specway check` completes
    Then the hook injects nothing
```

---

## 5. Functional Requirements

| ID | Description | Source | Priority (MoSCoW) |
|---|---|---|---|
| REQ-01 | `SessionStart` must re-inject the resume summary after compaction by matching `startup\|resume\|compact` (reusing `session-context.mjs`, no new script); must not include `clear` | US-01 | Must |
| REQ-02 | A `PreToolUse` hook must block archiving a requirements-backed spec whose `alignment-review.md` is missing or not `aligned`, deny with a `review-alignment` directive, apply only when a matching requirements doc exists, and fail **open** on internal error | US-02 | Must |
| REQ-03 | A `PostToolUse` hook must inject a non-blocking nudge when a `changes/**/spec.md` has a substantive body but no `## Tests`/`## Regression Test` section, and stay silent otherwise | US-03 | Should |
| REQ-04 | A `PreToolUse` hook must deny manual Edit/Write/Bash-delete of `.specs/baseline.json` with the "one-time, CLI-only snapshot" reason, silent for all other paths, fail open on error | US-04 | Should |
| REQ-05 | A `PostToolUse(Bash)` hook must convert a completed `specway upgrade\|scan\|init` run into an actionable next-skill directive (incl. the `log.md` upgrade record for upgrade), silent for other subcommands | US-05 | Should |
| REQ-06 | `specway upgrade` (CLI) and the `upgrade-methodology` + `reconcile-upgrade` skills must merge new kit-owned hook entries into an existing `settings.json` **idempotently** (keyed by `matcher`+`command`), never clobbering user hooks, and extend the `SessionStart` matcher to add `compact` when applicable | US-06 | Must |
| REQ-07 | Every new hook script must be wired to ship and stay refreshed: added to `package.json` `files[]`, the `TOOLING` array in `bin/specway.mjs`, an optional `package.json` `scripts` alias, and the `scan-project`/`upgrade-methodology` script lists | US-01..US-06 | Must |

---

## 6. Non-Functional Requirements

| ID | Category | Description | Measurement |
|---|---|---|---|
| NFR-01 | Portability | Hooks are Claude-Code-only; opencode ignores `settings.json`. No rule may be enforced solely by a hook — each must keep its CI/skill/`AGENTS.md` backstop | For each hook, name the harness-agnostic backstop; opencode run loses nudge but nothing breaks |
| NFR-02 | Safety / blast radius | Every script adopts the `session-context.mjs` bulletproof contract (whole body in try/catch → exit 0 on any internal error, stdlib-only, no network, reads nothing outside the repo). Guards fail **open** on internal error and fail **closed** only on the exact intended violation; an internal crash is never indistinguishable from a deliberate block | Fault-injection: break each script → agent never wedged; a real violation → denied |
| NFR-03 | No silent mutation | Hooks must not silently mutate tracked files (no surprise diffs); they inject context or gate — they do not auto-regenerate/auto-commit | Code review: no script writes a tracked file as a side effect |
| NFR-04 | Non-annoyance | Hooks fire only at high-signal, low-frequency, or irreversible moments; they must not fire on the methodology's lightweight path or on a normally-dirty working tree | BDD no-fire scenarios pass; no `check-consistency`-on-every-turn behavior |
| NFR-05 | Kit self-awareness | Hooks that guard kit-owned artifacts must detect the Specway kit repo itself and not misfire where those files are legitimately edited | Running the suite inside the kit repo produces no false denials on kit development |
| NFR-06 | Performance | Per-tool overhead is a single short-lived `node` fast-path; scripts exit within the hook timeout | Non-matching tool calls add only cold-start (~tens of ms) and no I/O beyond the repo |

---

## 7. Constraints

| ID | Constraint | Type | Impact |
|---|---|---|---|
| C-01 | `.claude/settings.json` is `ADDITIVE_FILES` (copy-if-absent) — frozen after first setup | Technical | New wiring can't ride the CLI copy to existing projects → REQ-06 keyed merge is mandatory |
| C-02 | `PreCompact` cannot inject post-compaction context (cleanup-only) | Technical | US-01 must use `SessionStart:compact`, not `PreCompact` |
| C-03 | `PostToolUse` `permissionDecision:"allow"` reason is not reliably surfaced; additionalContext is reliable | Technical | Nudges use additionalContext; gates use `PreToolUse` deny (reason fed back) |
| C-04 | `PostToolUse`/`PreToolUse` matchers are tool-name only; path/command filtering happens in-script | Technical | Scripts read `tool_input.file_path`/`.command` and self-filter |
| C-05 | `package.json` `files[]` lists scripts individually; a script omitted there is absent from the npm tarball and `copyForce` silently no-ops | Technical | REQ-07 must touch every wiring site |

---

## 8. Assumptions

| ID | Assumption | Validation Needed? | Risk if Wrong |
|---|---|---|---|
| A-01 | Claude Code hook JSON contract (SessionStart stdout injection, PreToolUse deny + reason, PostToolUse additionalContext, SessionStart `compact` source) is as grounded by the capabilities research | Yes (smoke-test in a live session) | A gate silently no-ops or a nudge never surfaces |
| A-02 | The kit has no product test framework wired; tests for the new scripts use Node's built-in `node:test` (zero dependency) | No | — |
| A-03 | Archiving is done via `git mv`/`mv` (Bash) or Write; both are covered by the guard's matcher | Partly | An MCP/other write vector bypasses the guard (accelerator, not a hard gate — CI still enforces) |

---

## 9. Out of Scope

- The rejected ideas: broad `UserPromptSubmit` keyword router (net-negative nag); running the test
  suite on every edit; "did you update AGENTS.md?" watcher; auto-commit/auto-archive/auto-tag; a
  turn-end `Stop` hook running whole-repo `check-consistency`; a stack-specific TDD source guard
  (`tdd-source-guard`) — deferred as opt-in materialized-by-init/scan, not in this change.
- Actually archiving this spec + regenerating `CHANGELOG.md` (deferred; also avoids the pre-existing
  `CHG-001`-in-changelog-prose landmine — see `## 15`).
- opencode-native hook equivalents.

---

## 10. MoSCoW Prioritization

| Priority | Requirements | Rationale |
|---|---|---|
| **Must have** | REQ-01, REQ-02, REQ-06, REQ-07 | The zero-cost win, the one irreversible-moment gate, and the delivery mechanism without which nothing reaches installed projects |
| **Should have** | REQ-03, REQ-04, REQ-05 | Genuine autonomy gains at high-signal moments, lower severity |
| **Could have** | — | — |
| **Won't have (now)** | Stack-specific TDD guard, SessionEnd log breadcrumb | Deferred (see Out of Scope) |

---

## 11. Dependencies

| Dependency | Type | Status | Impact if Unavailable |
|---|---|---|---|
| `scripts/session-context.mjs` | Internal | Available | US-01 reuses it |
| `scripts/check-consistency.mjs` (alignment gate logic) | Internal | Available | US-02 relies on its verdict |
| `bin/specway.mjs` copy/upgrade model | Internal | Available | REQ-06 extends `cmdUpgrade` |
| CI `.github/workflows/consistency.yml` | Internal | Available | NFR-01 backstop for every hook |

---

## 12. Domain Glossary

| Term | Definition | Context |
|---|---|---|
| Hook | A `.claude/settings.json` command run by Claude Code at a lifecycle event | Claude-Code-only accelerator |
| Fail-open | On internal error, allow the action (exit 0) rather than block | NFR-02 for guards |
| Alignment gate | `check-consistency` block requiring `alignment-review.md` = `aligned` before archive | Rule 7 |
| Delivery gap | New wiring can't reach existing projects because `settings.json` is frozen | C-01 / REQ-06 |
| Keyed merge | Idempotent insert of a hook entry keyed by `matcher`+`command` | REQ-06 |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A guard false-fires and wedges the agent | Med | High | Fail-open on error (NFR-02); scope to irreversible moments; BDD no-fire tests |
| Nudge becomes banner-blindness noise | Med | Med | High-signal moments only; silent by default; terse output |
| Keyed merge duplicates or clobbers user hooks | Med | Med | Key on matcher+command; idempotent; never delete; tests for re-run |
| Kit repo self-nag during methodology development | Med | Low | Kit self-detection (NFR-05) |
| Archiving triggers pre-existing `CHG-001`-in-changelog inconsistency | Low | Med | Keep spec in `changes/` this cycle; flag the landmine to the maintainer |

---

## 14. Traceability Matrix

| REQ ID | Source | Requirement Summary | Priority | Implementation Spec | Test ID |
|---|---|---|---|---|---|
| REQ-01 | US-01 | `SessionStart` `compact` matcher | Must | changes/001-methodology-hooks/ | — |
| REQ-02 | US-02 | Archive alignment gate (PreToolUse deny) | Must | changes/001-methodology-hooks/ | — |
| REQ-03 | US-03 | Spec-not-TDD-ready nudge | Should | changes/001-methodology-hooks/ | — |
| REQ-04 | US-04 | `baseline.json` immutability guard | Should | changes/001-methodology-hooks/ | — |
| REQ-05 | US-05 | CLI → next-step directive | Should | changes/001-methodology-hooks/ | — |
| REQ-06 | US-06 | Idempotent keyed hook merge on upgrade | Must | changes/001-methodology-hooks/ | — |
| REQ-07 | US-01..06 | Ship/refresh wiring for new scripts | Must | changes/001-methodology-hooks/ | — |

---

## 15. Appendix

### Research & References
- Multi-agent design + adversarial review workflow (this session): grounded Claude Code hook
  capabilities, ranked 8 candidates, and produced the gap list REQ-02..REQ-06 derive from.
- `.specs/methodology.md` Key Rules 1–7; `.github/workflows/consistency.yml` (CI backstop).

### Open Questions
- [x] A-01: live-session JSON contract validated — PreToolUse `deny` blocks the tool call and surfaces
      the reason (tested with `rm .specs/baseline.json`); PostToolUse `additionalContext` fires live;
      SessionStart injection proven by the startup hook (`compact` reuses the same mechanism).
- [ ] Pre-existing landmine: `CHANGELOG.md [1.3.0]` mentions `CHG-001` in prose; once *any* spec is
      archived, `check-consistency`'s changelog cross-check will flag it as "in CHANGELOG but not in
      archive". Decide (reword the prose / add a real archived CHG-001 / accept) before archiving.

---

## Validation Checklist

- [x] All stakeholders identified
- [x] Methodology chosen and section(s) filled
- [x] Functional requirements documented with sources
- [x] Non-functional requirements defined with measurements
- [x] Constraints and assumptions listed
- [x] MoSCoW prioritization complete
- [x] Dependencies identified
- [x] Risks assessed with mitigations
- [x] Out of scope explicitly defined
- [x] Traceability matrix populated
- [ ] Stakeholders reviewed and approved
