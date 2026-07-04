---
name: create-project
description: >-
  One-shot bootstrap of a brand-new project from specway: fetch the kit, scaffold the clean
  template (no kit dev history), then run the full init-project flow. Use when the user says "create new project",
  "criar novo projeto", "start from scratch" or "começar do zero". Delegates stack configuration
  to the init-project skill — it does NOT duplicate those steps.
metadata:
  version: 1.2.0
---

# Create Project from specway

## Purpose

One-shot skill that bootstraps a completely new project from specway. Clones the repository
from GitHub, cleans the git history, and runs the interactive `init-project` flow to configure the
technology stack and methodology. The developer gets a ready-to-use project directory with AGENTS.md
filled, conventions set, ADR-003 recorded, and the first specs in place.

## Prerequisites

- `git` installed and available in PATH
- Network access to specway repository (URL in `.specs/config.md## Repository`)
- The `init-project` skill (this skill delegates to it)

## Instructions

### Step 1: Detect Context

Check whether we are already inside a specway directory:
- Read `AGENTS.md` (if it exists).
- If `AGENTS.md` contains unfilled `{PLACEHOLDERS}` (e.g., `{PROJECT_NAME}`), we are inside an
  uninitialized specway → **skip to Step 4** (run init-project in place).
- If `AGENTS.md` does not exist or has already been filled, we need a fresh copy → **Step 2**.

### Step 2: Gather Project Info

Ask the user:
1. **Project name** — kebab-case recommended (e.g., `my-app`, `api-gateway`).
2. **Target directory** — absolute path. Default: `<cwd>/<project-name>`.

Confirm the directory. If it exists and is non-empty, warn and ask for confirmation before
overwriting.

### Step 3: Fetch & Scaffold the Clean Template

A `git clone` brings the kit's **whole dev tree** — its own `.specs/archive/` + `.specs/changes/`, its
`.specs/memory/` journal, `test/`. That must never bleed into a new project. So do **not** build the
project *from* the clone. Instead: clone to a **throwaway dir**, then let `specway init` scaffold the
**clean template** into the target — `init` copies only the product (skills, scripts, templates, `bin/`,
config, methodology) and leaves `.specs/changes/` + `.specs/archive/` empty with a blank `.specs/memory/`
scaffold. Nothing dev-side is ever pulled, so **there is nothing to purge**. Use the repository URL from
`.specs/config.md## Repository`. Run ONE block:

**POSIX (bash/zsh):**
```bash
SRC="$(mktemp -d)"                                    # throwaway source clone
git clone <REPO_URL> "$SRC"
mkdir -p "<target-directory>"
( cd "<target-directory>" && node "$SRC/bin/specway.mjs" init )   # scaffolds the CLEAN template
rm -rf "$SRC"                                          # discard the dev tree
git -C "<target-directory>" init                       # the project's own fresh history
```

**Windows (PowerShell):**
```powershell
$SRC = Join-Path $env:TEMP ("specway-" + [guid]::NewGuid())
git clone <REPO_URL> "$SRC"
New-Item -ItemType Directory -Force "<target-directory>" | Out-Null
Push-Location "<target-directory>"; node "$SRC/bin/specway.mjs" init; Pop-Location
Remove-Item -Recurse -Force "$SRC"
git -C "<target-directory>" init
```

If the clone or `init` fails (no network, repo moved), report the error and stop. The target now holds
the **clean template only** — empty `.specs/changes/` + `.specs/archive/`, a blank `.specs/memory/`
scaffold, no `test/`, no kit spec history. All subsequent work happens inside `<target-directory>`.

### Step 4: Run init-project (delegate)

Change the working context to `<target-directory>` and **execute the `init-project` skill in full**,
with one override: skip the project-name question (reuse the name from Step 2).

Do not re-list init-project's individual steps here — it owns stack configuration, AGENTS.md,
conventions, ADR-003, and the bootstrap requirements + spec. This delegation keeps the two skills
from drifting apart.

### Step 5: Final Report

Summarize what was done: scaffolded the clean template (via `specway init` from a throwaway clone), ran
init-project, files created, target location, and next steps (fill remaining placeholders, scaffold
source code, review/approve REQ-001 and CHG-001, start first feature with `gather-requirements`).

## Output

A complete, initialized project directory ready for development, containing:
- `AGENTS.md` — filled with the chosen technology stack
- `.specs/memory/conventions.md` — narrowed to the chosen stack
- `.specs/memory/architecture.md` — with ADR-003 appended
- `.specs/changes/001-init/requirements.md` and `.specs/changes/001-init/spec.md`
- A clean `CHANGELOG.md` (blank scaffold — not the kit's history) and `package.json`/`README.md` set to
  the project's own identity (handled by init-project Step 6)
- Clean git history (fresh `git init`)
- **The clean template only:** `.specs/changes/` + `.specs/archive/` start empty and `.specs/memory/` is
  the blank scaffold — the kit's own dev artifacts are never pulled in (Step 3 scaffolds via `specway init`)

## Examples

### Example 1: React + Node project

**User says:** "criar novo projeto"

**Agent should:**
1. Detect we are NOT in a specway → proceed to clone.
2. Ask project name → "my-web-app"; ask/confirm target directory.
3. Clone (URL from config.md) → clean `.git` → `git init`.
4. Run init-project in full (WEB, REACT, NODE, POSTGRES, en, VITEST, 80, pnpm).
5. Report summary with full path.

### Example 2: Already inside a specway directory

**User says:** "create new project"

**Agent should:**
1. Read AGENTS.md → detects `{PROJECT_NAME}` placeholder → uninitialized specway.
2. Skip clone/clean.
3. Run init-project normally (all 9 questions).
4. Report summary.

## References

- `.specs/config.md` — repository URL and stack options (do not hardcode them)
- `.claude/skills/init-project/SKILL.md` — the skill this wraps
- `AGENTS.md` — template to fill
- `METHODOLOGY.md` — full methodology guide
