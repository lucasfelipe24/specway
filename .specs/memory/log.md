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

## 2026-07-02 — npm packaging leaks fixed (1.5.2)

- **Did:** Removed `.specs/memory/` from `package.json` `files[]` — the kit's own working memory
  (`log.md` history, troubleshooting, catalog) was shipping to consumers. Nothing reads the kit's
  `.specs/memory/` (the CLI seeds a project from the separate `.specs/templates/memory/` scaffold,
  still shipped). Also stopped `init`/`scan`/`upgrade` from duplicating that scaffold into the target's
  `.specs/templates/memory/` (a `skip` arg on `copyChildrenIfAbsent`), and added
  `.github/workflows/consistency.yml` to the package so npx-bootstrapped projects get the CI. Regression
  tests: `test/npm-package.test.mjs` (asserts pack contents) + `test/cli-scaffold.test.mjs`. Suite 27.
- **Learned:** `files[]` is a whitelist, but it whitelisted the wrong `.specs/` subdir — the scaffold
  *source* (`templates/memory/`) is what ships, not the kit's *live* memory. Surfaced by the user
  inspecting the published tarball. Package: 60 → 54 files.
- **Next:** goes out as 1.5.2 (1.5.1 was already published *with* the leak — npm versions are
  immutable, so the fix ships forward). Ready to publish clean.
- **Refs:** 1.5.2, package.json files[].

## 2026-07-04 — Requirements co-located inside the change folder (CHG-005 / dir 004)

- **Did:** Moved the requirements doc into its change folder — `.specs/changes/<nnn>-<slug>/requirements.md`,
  travelling into `.specs/archive/` with the spec — and removed the separate `.specs/requirements/` tree.
  Reworked `check-consistency` (traceability 6a/6b + alignment gate) to resolve requirements co-located
  (dropped `REQUIREMENTS_DIR`); updated `session-context`, `methodology-guard` (+ its test), the
  `feature-spec` template, 7 skills, and `METHODOLOGY.md`. Added an automatic migration to `specway upgrade`
  (`migrateRequirementsColocation`: move-not-delete, presence-based/idempotent, rewrites the traceability
  link + alignment pointer) + a `reconcile-upgrade` note. Migrated this repo's own layout (001/003 → archive,
  004 → changes). New tests: `check-consistency-colocated` (anti green-but-blind) + `cli-requirements-migration`.
  Suite 27 → 32; check + skills index green. Dogfooded the full flow (requirements → spec → review-alignment
  `aligned` → implementation).
- **Learned:** the migration must *reactivate* the gates, not just pass — after moving requirements the old
  script went **green-but-blind** (traceability/alignment silently "skipped"), so the regression test asserts
  the counts are ≥1, not merely that check exits 0. Presence-based migration (run whenever `.specs/requirements/`
  exists) is more robust + idempotent than a version threshold. `check-consistency` never cross-checks versions
  (only `cut-release` does), so co-location doesn't disturb the package↔methodology lockstep.
- **Next:** review CHG-005, then **archive 004** and **cut the release as 1.6.0** (`cut-release` bumps package
  + methodology together and rolls `[Unreleased]`). Migration is presence-based, so it fires for any project
  crossing into ≥1.6.0.
- **Methodology upgrade:** 1.5.2 → **1.6.0** (lands at the next release) — requirements co-location. Recorded in
  `METHODOLOGY.md## Methodology Versions`.
- **Refs:** CHG-005, changes/004-requirements-in-changes, `migrateRequirementsColocation`.

## 2026-07-04 — create-project delivers the clean template (no kit dev history)

- **Did:** After the maintainer flagged it ("era pra ser só template"), fixed `create-project` at the root
  instead of band-aiding. It used to build the project *from* a full `git clone` of the kit (dragging in the
  kit's `.specs/archive|changes`, `.specs/memory/` journal, `test/`) and only clean git history — a leak. Now
  it clones to a **throwaway dir** and scaffolds the **clean template** into the target via `specway init`
  (which already copies only the product, never dev artifacts), then discards the clone. Nothing dev-side is
  ever pulled → **nothing to purge**. Updated `init-project` Step 6 to create identity files
  (`package.json`/`README.md`) when absent (the clean channel ships none). create-project → 1.2.0.
- **Learned:** the leak's real fix is *distribution*, not cleanup — the npm package already excludes the
  kit's dev artifacts (`test/npm-package.test.mjs`) and `specway init` produces exactly that clean template;
  create-project just wasn't using it. A first attempt (purge-after-clone) was the wrong shape — you don't
  purge a template, you don't pull the dev artifacts in the first place. Reverted it.
- **Next:** decide git-clone-to-temp vs. `npx @scope/specway init` as the source (repo HEAD vs. npm publish).
  Repo-as-pure-template (removing the kit's own dogfooding from the repo) stays a separate maintainer call.
- **Refs:** create-project 1.2.0, init-project Step 6, test/npm-package.test.mjs.

## 2026-07-04 — Safeguards: scan-project wires AGENTS.md + unifies CLAUDE.md (adopt path)

- **Did:** Fixed two adopt-path gaps the maintainer flagged. (1) `scan-project` on a repo that already had
  its own `AGENTS.md` could leave it without the `@.specs/methodology.md` import, so the methodology was
  inert — rewrote Step 4 to merge the `## Methodology` import (per the 1.2.0 split, not inline rules) and
  verify it. (2) When a repo had **both** its own `CLAUDE.md` and `AGENTS.md`, the old Step 4 just "ensured
  the import," risking lost/duplicated content — Step 4 now **reads both, folds CLAUDE.md into AGENTS.md**
  (single source, deduped) and reduces CLAUDE.md to the `@AGENTS.md` importer. Backed both with deterministic
  guards in `check-consistency`: Check 8 *methodology wiring* (AGENTS.md imports `@.specs/methodology.md`)
  and Check 9 *CLAUDE.md wiring* (CLAUDE.md imports `@AGENTS.md`). scan-project → 1.1.0.
- **Learned:** the imports are the load-bearing part of adoption; the old Step 4 (pre-split wording, no
  verification) could silently omit the one thing that matters. The real safeguard is deterministic, not
  skill prose — scan-project/init/reconcile all run `check-consistency` at the end, so they now cannot finish
  green with a CLAUDE.md/AGENTS.md left un-wired. The chain enforced: CLAUDE.md → @AGENTS.md → @.specs/methodology.md.
- **Next:** (unchanged) push / release 1.6.0 / archive-004 pending; Direction 2 still the maintainer's call.
- **Refs:** check-consistency Check 8 + 9, scan-project 1.1.0.
