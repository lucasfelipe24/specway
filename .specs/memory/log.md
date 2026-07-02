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

_No entries yet. The first work session appends the first block above._

## 2026-07-02 — `.agents/` feature implemented and reverted (CHG-001)

- **Did:** Implemented `copyScaffoldSkillsTo()` helper in `bin/specway.mjs` — mirrored `.claude/skills/` to `.agents/skills/` during `init`, `adopt`, `upgrade`. Created integration test.
- **Reverted:** User decided not to pursue the `.agents/` approach. Removed all code and test file. Spec CHG-001 marked as reverted.
- **Learned:** The changelog script requires `CHG-`/`FIX-`/`MIG-` IDs in the spec body; added `CHG-001` so the generator picks it up.
- **Next:** Publish `@lucasfelipe23/specway` to NPM.
- **Refs:** CHG-001

## 2026-07-02 — Project renamed, CHG-001 reverted, changelog updated

- **Did:** `scaffoldSkillsTo()` removed, `.agents/` spec removed from archive, CHANGELOG cleaned up.
  CLI renamed `spec-kit` → `specway`, binary file renamed. Skill `adopt-project` → `scan-project`.
  CHANGELOG updated with all changes.
- **Learned:** Reverted specs should be removed from archive so the changelog generator stays in sync.
- **Next:** Publish `@lucasfelipe23/specway` to NPM.
- **Refs:**

## 2026-07-02 — CLI command `adopt` fully removed in favor of `scan`

- **Did:** Removed `cmdAdopt()` → renamed to `cmdScan()` in `bin/specway.mjs`. Removed `case "adopt"` alias entirely (no deprecation, no backward compat). Updated all references in `README.md`, `METHODOLOGY.md`, `CHANGELOG.md`, scan-project SKILL.md, upgrade-methodology SKILL.md. Replaced descriptive uses of "adopt" with "scan" throughout.
- **Learned:** n/a
- **Next:** Publish `@lucasfelipe23/specway` to NPM.
- **Refs:**
