# Changelog

All notable changes to this project are documented here.
Generated automatically from `.specs/archive/` via the `update-changelog` skill.

---

## [Unreleased]

### Added
- **cc-sdd-inspired enhancements (CHG-003).** `--dry-run` on the `specway` CLI (`init`/`scan`/`upgrade`)
  previews what would be copied, merged, and stamped — writing nothing. **EARS** added as a requirements
  methodology (`gather-requirements` + template): precise `SHALL` requirements whose acceptance criteria
  map 1:1 to tests. The feature-spec template gains a **`## Tasks`** (boundary/deps) and
  **`## File Structure Plan`** section for boundary-first work (consumed by `run-tdd`, one task at a time).

### Changed

### Fixed

### Removed

---

## [1.4.0] - 2026-07-02

### Added
- **Methodology-enforcing Claude Code hooks (CHG-002)** — methodology version bumped to 1.4.0. A `PreToolUse` guard
  (`scripts/methodology-guard.mjs`) blocks archiving a requirements-backed spec until its
  `alignment-review.md` reads `aligned`, and blocks hand-edits/deletes of `.specs/baseline.json`.
  A `PostToolUse` nudge (`scripts/methodology-nudge.mjs`) flags a `changes/**/spec.md` written with
  no `## Tests` section and turns a `specway upgrade|scan|init` run into a next-step directive. The
  `SessionStart` hook now also re-injects the resume summary after `compact`. Hooks are a
  Claude-Code-only accelerator — CI + skills remain the harness-agnostic enforcement.
- **Idempotent keyed hook-merge** (`scripts/merge-hooks.mjs`): `specway scan`/`upgrade` deliver new
  kit hook wiring into an existing (frozen) `.claude/settings.json` — add-only, keyed by
  `matcher`+`command`, never clobbering the project's own hooks.
- **`node --test` suite** (`test/`, 17 tests) for the kit scripts; `npm test` runs it.

### Changed
- **Memory scaffold separated from kit's working memory.** CLI now copies
  memory scaffold files from `.specs/templates/memory/` (new) into the
  target project's `.specs/memory/`, so the kit's own `.specs/memory/` can
  accumulate log entries, TRBs, and catalog items without leaking into
  new projects.
- CLI command `adopt` renamed to `scan` (removed, not aliased).

---

## [1.3.0] - 2026-07-02

### Changed
- Project renamed from `spec-driven-tdd-kit` to `@lucasfelipe23/specway` (package) and `specway` (CLI).
- CLI binary renamed from `spec-kit` to `specway` (`bin/specway.mjs`).
- Skill `adopt-project` renamed to `scan-project`.

### Removed
- `.agents/skills/` mirror — implemented then reverted; the kit only copies skills to `.claude/skills/`.

---

## [1.2.0] - 2026-06-26

### Added
- **`spec-kit` CLI** (`bin/spec-kit.mjs`, run via `npx github:lucasfelipe24/sdd-kit <cmd>`): the
  deterministic "hands" of the methodology — `init` / `scan` / `upgrade` / `check`. It copies files
  from its own npx-fetched location (no separate clone), resets identity files, refreshes tooling,
  regenerates the skills index, and stamps the version; the agent skills still do the judgment parts.
  Solves the bootstrap chicken-egg (no manual clone) and makes the mechanical file ops reliable.
- **`reconcile-upgrade` skill** — the judgment phase after an upgrade: migrates `AGENTS.md` to the
  methodology split, adapts existing project files to new conventions (e.g. gives a `troubleshooting.md`
  `TRB-NN` ids), records the upgrade in `log.md`, and ends on a green check. `spec-kit upgrade` and
  `upgrade-methodology` hand off to it.

### Changed
- **AGENTS.md ↔ methodology split.** Kit-owned methodology rules (Key Rules, change path, skills,
  memory/consistency model) moved out of `AGENTS.md` into `.specs/methodology.md`, imported via
  `@.specs/methodology.md`. `AGENTS.md` is now purely project-owned (stack, commands, architecture,
  conventions, testing values), so a methodology upgrade replaces one kit-owned file and **never
  touches `AGENTS.md`** — no per-upgrade diff or clobber risk. `reconcile-upgrade` migrates existing
  projects to the split. (From real-world usage feedback.)
- **Provenance + grandfathering clarity:** `reconcile-upgrade` and `run-tdd` now feed
  `.specs/memory/log.md` (the upgrade record and end-of-cycle entry); `baseline.json` carries a note
  that it is a one-time snapshot that does not grow; `methodology.md` Rule 7 states no grandfathering
  past the baseline.
- **Troubleshooting schema is now bilingual and groupable.** `check-consistency` accepts the required
  fields in English **or** Portuguese (`Sintoma`/`Causa`/`Solução`) and validates entries whether flat
  (`## TRB-NN`) or grouped by area (`## <Area>` + `### TRB-NN`). Previously a pt-BR or area-grouped
  troubleshooting file passed silently (zero entries recognised) instead of being validated.
  (Surfaced by a real pt-BR project's troubleshooting.md.)

### Fixed
- **Forward-only baseline** for the 1.1.0 traceability + alignment-gate checks: upgrading a mature
  repo no longer fails CI on specs archived before those rules existed. `upgrade` (and the
  `upgrade-methodology` skill) snapshot the existing archive into `.specs/baseline.json` when crossing
  into 1.1.0, and `check-consistency` grandfathers those legacy specs. Specs archived afterward comply.
  (Surfaced by upgrading a real 16-spec project.)

### Removed

---

## [1.1.0] - 2026-06-26

> Methodology version 1.1.0. See `METHODOLOGY.md## Methodology Versions` for the structure changelog.

### Added
- **Memory as an LLM-Wiki** (inspired by Karpathy's LLM-Wiki): `.specs/memory/troubleshooting.md`
  (topical error/fix memory, `TRB-NN`) with the `record-troubleshooting` skill, and an append-only
  `.specs/memory/log.md` working journal.
- **Two-tier consistency:** the `review-alignment` skill — an adversarial LLM check that a spec
  faithfully covers its requirements — producing a stamped `alignment-review.md` verdict.
- **Methodology versioning** (`.specs/config.md## Methodology Version`) and the `upgrade-methodology`
  skill, which brings an existing methodology project up to the kit's latest version non-destructively.
- **Generated skills index** (`.claude/skills/INDEX.md` via `scripts/update-skills-index.mjs`): the
  single source for the skills catalog, compiled from each `SKILL.md`. `AGENTS.md`/`README` reference
  it instead of hand-maintaining the list; `check-consistency` + CI enforce it stays in sync.
- **Session continuity** ("where you left off"): `scripts/session-context.mjs` summarizes the latest
  `log.md` entry, specs in flight (with alignment-gate state), and requirements without a spec. Wired
  as a Claude Code `SessionStart` hook (`.claude/settings.json`) and runnable via the `resume-session`
  skill (`"onde paramos"`) — harness-agnostic, silent when there's nothing to resume.

### Changed
- `check-consistency.mjs` gained four checks: troubleshooting-entry schema, requirements↔spec
  traceability integrity, no-dangling-`REQ`, and a **blocking alignment gate** on archived specs.
- `feature-spec.md` traceability now uses a portable relative Markdown link (GitHub + Obsidian); the
  canonical join key is the `REQ` id, not the link syntax.
- `run-change`, `run-tdd`, and `gather-requirements` now route through `review-alignment` at the
  requirements→spec transition and gate archiving on an `aligned` verdict.

### Fixed
- Projects bootstrapped from the kit no longer inherit the kit's own `CHANGELOG.md`. A clean
  `.specs/templates/changelog-template.md` is shipped, and `init-project`/`create-project` reset the
  project's `CHANGELOG.md` (plus `package.json` identity and `README.md`) from it; `scan-project`
  creates a clean one only when the project has none.

### Removed

---

## [0.1.0] - 2026-06-02

### Added
- Initial release of the spec-driven + TDD starter kit.
