# AGENTS.md — {PROJECT_NAME}

> Primary instruction source for AI agents. **This file is project-owned** — stack, commands,
> architecture, and conventions live here. The kit-owned methodology rules are imported under
> `## Methodology`, so a methodology upgrade never touches this file. Keep it updated as the project evolves.

## Overview

| Layer | Tech |
|---|---|
| Shell / Platform | {TAURI or ELECTRON or WAILS or WEB or CLI or MOBILE or LIBRARY} |
| Frontend | {REACT or VUE or SVELTE or ANGULAR or SOLID or HTMX or VANILLA or NONE} |
| Backend | {RUST or NODE or PYTHON or GO or CSHARP or JAVA or ELIXIR or NONE} |
| Database | {SQLITE or POSTGRES or MYSQL or MONGODB or SURREALDB or NONE} |
| Auth | {LOGIN_METHOD} |
| Language | {LANGUAGE} |

---

## Commands

| Command | Where | Description |
|---|---|---|
| `{DEV_COMMAND}` | root | Start dev server |
| `{BUILD_COMMAND}` | root | Build for production |
| `{TEST_COMMAND}` | root | Run tests |
| `{LINT_COMMAND}` | root | Lint code |

---

## Architecture

```
{FRONTEND_COMPONENT}
  → {API_CALL}({endpoint}, {args})
    → {BACKEND_HANDLER}
      → {SERVICE}
        → {REPOSITORY} (local data)
        → {ADAPTER}    (external API)
```

- **Routing:** {ROUTING_STRATEGY}
- **Auth:** {AUTH_MECHANISM}

---

## Project Conventions

Full conventions in `.specs/memory/conventions.md`. Summary:

- **Frontend:** {STYLING_APPROACH}, {UI_LIBRARY}, state via {STATE_MANAGEMENT}
- **Backend:** Repository (data), Adapter (external API), Service (business logic), {HANDLER_PATTERN}, naming: {NAMING_CONVENTION}
- **New endpoint pattern:** model → repository → service → handler → register → add type definition
- **New adapter pattern:** for external services, create adapter → inject into service → test with mock
- **Client-side filtering:** memoized/computed filter from input state
- **IDs:** {ID_STRATEGY}
- **Clean Code:** SOLID principles in `.specs/memory/clean-code.md`

---

## Testing

| | |
|---|---|
| **Framework** | {TEST_FRAMEWORK} |
| **Coverage** | {COVERAGE_TOOL} (threshold: {COVERAGE_THRESHOLD}%) |
| **Run tests** | `{TEST_COMMAND}` |
| **Watch mode** | `{TEST_WATCH_COMMAND}` |
| **Coverage report** | `{TEST_COVERAGE_COMMAND}` |

Full testing conventions in `.specs/memory/conventions.md## Testing`. **TDD is mandatory** (tests
before implementation) — see the methodology rules below.

---

## Methodology

This project follows the spec-driven + TDD methodology. Its operational rules — Key Rules, the change
path, skills, and the memory/consistency model — are **kit-owned** and imported here, so methodology
upgrades replace one file and never touch this one. **Read and follow them**; the import inlines the
content for harnesses that support it (Claude Code), and names the file for those that don't:

@.specs/methodology.md
