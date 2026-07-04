# Spec: Methodology-enforcing Claude Code hooks

| Field | Value |
|---|---|
| **ID** | CHG-002 |
| **Status** | draft |
| **Author** | Specway maintainer |
| **Created** | 2026-07-02 |
| **Approved** | — |

> **Id note:** `CHG-001` was used and reverted in `CHANGELOG.md [1.3.0]` (the `.agents/skills/`
> mirror). This spec takes `CHG-002` to avoid reusing that id. The requirements/changes dir number
> (`001`) is independent — the consistency checker joins requirements↔spec by the dir-number prefix,
> not by the `CHG` id.

## Context

The methodology is enforced by harness-agnostic text, CI/`specway check`, and skills — but between
session start and CI the agent must *remember* each lifecycle obligation, and only one Claude Code
hook exists (`SessionStart → session-context.mjs`, `startup|resume`). This change adds a small,
high-signal set of hooks that nudge/gate at the exact trigger points, plus the delivery mechanism
that lets new hook wiring reach already-initialized projects (whose `settings.json` is frozen). A
multi-agent adversarial review shaped the scope: it kept the zero-cost and irreversible-moment hooks
and **rejected** the noisy ones (a `UserPromptSubmit` keyword router, per-edit test runs, a turn-end
whole-repo `check-consistency`, an "update AGENTS.md?" watcher, any auto-commit/archive/tag).

## Scope

- **Tier 0 (done in this change):** extend the existing `SessionStart` matcher to `startup|resume|compact`.
- **PreToolUse guard** (`scripts/methodology-guard.mjs`): block archiving an unaligned
  requirements-backed spec (REQ-02); block manual edits/deletes of `.specs/baseline.json` (REQ-04).
- **PostToolUse nudge** (`scripts/methodology-nudge.mjs`): flag a `changes/**/spec.md` with no Tests
  section (REQ-03); turn a `specway upgrade|scan|init` run into a next-step directive (REQ-05).
- **Delivery** (`scripts/merge-hooks.mjs` + `bin/specway.mjs` + skills): idempotent keyed merge of
  kit-owned hook entries into an existing `settings.json` on `scan`/`upgrade` (REQ-06).
- **Wiring** (`package.json`, `TOOLING`, skill script lists): ship + refresh the new scripts (REQ-07).

### Out of Scope

- Stack-specific TDD source guard; `SessionEnd` log breadcrumb; the rejected hooks (see Context).
- Archiving this spec + regenerating `CHANGELOG.md` (deferred; keeps clear of the `CHG-001` prose
  landmine — see requirements `## 15`). A hand-written `[Unreleased]` note is added instead.

## Requirements

### Functional

- [ ] REQ-01: `SessionStart` matches `startup|resume|compact` (reuse `session-context.mjs`; no `clear`).
- [ ] REQ-02: PreToolUse denies archiving a requirements-backed spec whose `alignment-review.md` is missing or not `aligned`; reason points to `review-alignment`; applies only when a matching requirements doc exists; fails open on error.
- [ ] REQ-03: PostToolUse injects a non-blocking nudge when a written `changes/**/spec.md` has a substantive body but no `## Tests`/`## Regression Test`; silent otherwise.
- [ ] REQ-04: PreToolUse denies manual Edit/Write/Bash-delete of `.specs/baseline.json` with the "one-time, CLI-only snapshot" reason; silent for other paths; fails open.
- [ ] REQ-05: PostToolUse turns a completed `specway upgrade|scan|init` Bash run into the matching next-skill directive (upgrade also → record `from→to` in `log.md`); silent for other subcommands.
- [ ] REQ-06: `scan`/`upgrade` merge kit hook entries into an existing `settings.json` idempotently, keyed by `matcher`+`command`, never clobbering user hooks; extend `SessionStart` matcher to add `compact` when applicable.
- [ ] REQ-07: New shipped scripts are added to `package.json files[]`, `TOOLING`, a `scripts` alias, and the `scan-project`/`upgrade-methodology` script lists.

### Non-Functional

- [ ] NFR-01: Every hook names a harness-agnostic backstop (CI/skill/text); opencode losing the hook breaks nothing.
- [ ] NFR-02: Bulletproof contract — try/catch → exit 0 on internal error; guards fail **open** on error, **closed** only on the exact violation; stdlib-only; no network; no reads outside the repo.
- [ ] NFR-03: No silent mutation of tracked files.
- [ ] NFR-04: No firing on the lightweight path or a normally-dirty tree (BDD no-fire cases pass).

### Technical

> The "project" here is the kit itself (LIBRARY/CLI). Layers map to hook script / CLI / config.

| Layer | File / Component | Change Description |
|---|---|---|
| Config | `.claude/settings.json` | Add `compact` to SessionStart; add PreToolUse (`methodology-guard.mjs`) + PostToolUse (`methodology-nudge.mjs`) entries |
| Hook (guard) | `scripts/methodology-guard.mjs` | NEW — PreToolUse: archive alignment gate (REQ-02) + baseline immutability (REQ-04); deny via `permissionDecision` |
| Hook (nudge) | `scripts/methodology-nudge.mjs` | NEW — PostToolUse: spec-no-Tests nudge (REQ-03) + CLI next-step directive (REQ-05); inject via `additionalContext` |
| CLI helper | `scripts/merge-hooks.mjs` | NEW — pure `mergeHookSettings(kit, project)` → merged settings + `changed` flag (REQ-06) |
| CLI | `bin/specway.mjs` | Import + call the merge in `cmdScan`/`cmdUpgrade`; add the two hook scripts to `TOOLING` |
| Packaging | `package.json` | `files[]` += 3 scripts; `scripts` += `test`, `guard`/`nudge` aliases |
| Skill | `upgrade-methodology`, `reconcile-upgrade`, `scan-project` SKILL.md | Document the keyed merge + list the new scripts |

## Design

### Hook fire / no-fire behavior

| Hook | Fires when | Stays silent / allows when |
|---|---|---|
| guard: archive gate | Bash `mv`/`git mv` a `changes/<n>-x` into `.specs/archive/`, or Write a spec into `archive/`, AND a `requirements/<n>-*` exists AND `alignment-review.md` missing/not `aligned` | No matching requirements (lightweight); already `aligned`; any internal error (fail open) |
| guard: baseline | Edit/Write to `.specs/baseline.json`, or Bash `rm`/`mv`/`>` targeting it | Any other path; internal error (fail open) |
| nudge: spec-no-Tests | Write/Edit `.specs/changes/<n>-x/spec.md` with a body (≥ ~15 non-empty lines or a `## Context`/`## Requirements` heading) and no `## Tests`/`## Regression Test` | Tests section present; tiny stub; non-spec file |
| nudge: CLI next-step | Bash command invoking `specway`/`npx …specway` with `upgrade`/`scan`/`init` | `check`/`help`/other; non-specway Bash |

### Deny / inject mechanism

- **Guard (PreToolUse):** exit 0 with
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}`.
  The reason is fed back to Claude so it self-corrects (run `review-alignment`, or route the baseline
  change through the CLI). All other paths and every internal error → exit 0 with no output (allow).
- **Nudge (PostToolUse):** exit 0 with
  `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"…"}}`; never blocks.

### Edge Cases

- Compound Bash (`git add -A && git mv …`) — command parsed by substring/regex, not shell semantics.
- Archive move where only the destination path is present — derive the number from the dest dir.
- `settings.json` merge re-run — must be a no-op (idempotent); user's own hooks preserved verbatim.
- Missing/broken `check-consistency.mjs` when evaluating the archive gate — fail open (allow).
- Kit repo itself — the guarded operations (archive a spec, edit baseline) behave identically, so no
  special-casing is needed; the CLI next-step nudge may rarely fire during kit CLI testing (harmless).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Guard false-fires and wedges edits | Med | High | Fail-open on error; deny only on the exact violation; BDD no-fire tests |
| Merge clobbers a user's hooks | Med | Med | Add-only + matcher/command key; idempotency test |
| Nudge noise | Low | Med | High-signal moments only; silent by default |

## Dependencies

- `scripts/session-context.mjs` (REQ-01 reuse), `scripts/check-consistency.mjs` (REQ-02 verdict),
  `bin/specway.mjs` copy/upgrade model (REQ-06), CI `consistency.yml` (NFR-01 backstop).

## Requirements Traceability

**Requirements:** [`requirements.md`](requirements.md)

| REQ ID | Requirement Summary | Priority | Acceptance Criteria |
|---|---|---|---|
| REQ-01 | SessionStart `compact` matcher | Must | Matcher is `startup\|resume\|compact`; reuses `session-context.mjs`; no `clear` |
| REQ-02 | Archive alignment gate (deny) | Must | Unaligned requirements-backed archive move denied with `review-alignment` reason; fails open |
| REQ-03 | Spec-no-Tests nudge | Should | Spec body without a Tests section triggers a non-blocking nudge; silent when present |
| REQ-04 | `baseline.json` immutability guard | Should | Edit/Write/delete of `baseline.json` denied; silent elsewhere; fails open |
| REQ-05 | CLI → next-step directive | Should | `specway upgrade\|scan\|init` run injects the matching directive; silent for `check`/`help` |
| REQ-06 | Idempotent keyed hook merge | Must | Merge adds kit entries + extends SessionStart matcher; preserves user hooks; re-run is a no-op |
| REQ-07 | Ship/refresh wiring | Must | New scripts in `files[]` + `TOOLING` + `scripts` alias + skill lists |

> **Semantic gate:** before `run-tdd` and before archiving, run the `review-alignment` skill. It
> judges whether this spec covers each `REQ-NN` and writes `alignment-review.md`. `check-consistency`
> blocks archiving until that review exists, covers every requirement, and reads `Verdict: aligned`.

## Tests

> **TDD:** written BEFORE implementation. Each script is exercised as a black box — pipe a hook
> stdin JSON, assert on exit code + stdout JSON. The merge is tested as a pure function.

### Test Cases

| ID | Test | Type | Description |
|---|---|---|---|
| TEST-01 | guard denies unaligned archive | integration | `git mv changes/007-x archive/` with a requirements doc + no aligned review → `permissionDecision:deny`, reason names `review-alignment` (REQ-02) |
| TEST-02 | guard allows aligned archive | integration | Same move with `alignment-review.md` = `Verdict: aligned` → no output, exit 0 (REQ-02) |
| TEST-03 | guard ignores requirement-less archive | integration | Archive a spec with no matching requirements → allow (REQ-02, lightweight path) |
| TEST-04 | guard denies baseline edit | integration | Edit/Write `.specs/baseline.json` → deny with CLI-only reason (REQ-04) |
| TEST-05 | guard denies baseline delete | integration | Bash `rm .specs/baseline.json` → deny (REQ-04) |
| TEST-06 | guard allows unrelated edit | integration | Edit `src/foo.ts` / `README.md` → allow, no output (REQ-04, no-fire) |
| TEST-07 | guard fails open on internal error | integration | Malformed stdin / missing checker → exit 0, no deny (NFR-02) |
| TEST-08 | nudge flags spec without Tests | integration | Write `changes/009-y/spec.md` (body, no `## Tests`) → `additionalContext` mentions Tests (REQ-03) |
| TEST-09 | nudge silent when Tests present | integration | Same spec with `## Tests` → no output (REQ-03, no-fire) |
| TEST-10 | nudge directive on upgrade | integration | Bash `npx @lucasfelipe23/specway upgrade` → `additionalContext` says run `reconcile-upgrade` + log `from→to` (REQ-05) |
| TEST-11 | nudge silent on `specway check` | integration | Bash `specway check` → no output (REQ-05, no-fire) |
| TEST-12 | merge adds entries + extends matcher | unit | Project with SessionStart `startup\|resume` + a user hook → merged has `compact`, the two new entries, and the user hook intact (REQ-06) |
| TEST-13 | merge is idempotent | unit | Running the merge twice → second run reports `changed:false`, output unchanged (REQ-06) |
| TEST-14 | merge preserves foreign hooks | unit | A user `PreToolUse` hook with a different command is kept alongside the kit entry (REQ-06) |

### Test Files

| File | What It Covers |
|---|---|
| `test/methodology-guard.test.mjs` | TEST-01..07 |
| `test/methodology-nudge.test.mjs` | TEST-08..11 |
| `test/merge-hooks.test.mjs` | TEST-12..14 |

---

## Validation Checklist

- [x] Tests written BEFORE implementation (Red phase)
- [x] All tests passing (Green phase — 14/14)
- [x] Code refactored without breaking tests (Refactor phase)
- [x] Coverage meets threshold (90%) — behavior coverage of the fire/no-fire matrix (kit has no coverage tool wired)
- [x] Requirements met (REQ-01..07)
- [x] States handled (fire / no-fire / fail-open for each hook)
- [x] Edge cases tested
- [x] No regression: `node scripts/check-consistency.mjs` green; existing scripts unaffected
- [x] Code follows conventions (bulletproof contract mirrors `session-context.mjs`)
- [ ] Archived + `update-changelog` — DEFERRED (kept in `changes/`; see Notes + requirements §15)

## Notes

- Consolidated 4 candidate hooks into 2 shipped scripts to cut the per-script distribution tax
  (each new script must touch `files[]` + `TOOLING` + `scripts` + two skill lists).
- `merge-hooks.mjs` ships in `files[]` (the CLI imports it at `npx` time) but is a CLI-only helper —
  it does not need to be force-copied into downstream `scripts/`.
- Deferred: archive + `update-changelog`; and the `CHG-001`-in-changelog-prose landmine that will
  surface for `check-consistency` the first time *any* spec is archived (flagged in requirements §15).
- Post-archive refinement (same session, dogfooded): the CLI next-step nudge (REQ-05) detects the run
  from the CLI **output signature** (`tool_output`/`tool_response`), not the command string — after a
  command that merely *mentioned* "specway upgrade" (this spec's own commit message) false-fired the
  directive. Regression tests TEST-15 (no false-fire on a mention) and TEST-16 (output-only detection,
  object output) added, plus TEST-17 (require command+output to agree, killing the grep/cat
  output-only false-positive); suite is now 17 tests.
