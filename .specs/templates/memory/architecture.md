# Architectural Decision Records

## ADR-001: Spec-Driven Development

- **Date:** {YYYY-MM-DD}
- **Status:** Accepted

**Context:** Without structured planning, scope creep and inconsistent implementation are risks. Complex projects need traceable decisions.

**Decision:** All changes (features, migrations, bugfixes) must go through a spec document in `.specs/changes/` before implementation. Specs follow templates in `.specs/templates/`. Completed specs are archived.

**Consequences:**
- Slightly slower start for small changes
- Better traceability and documentation
- Architectural decisions captured here
- Entity mapping stays current in `shared/`

---

## ADR-002: Test-Driven Development

- **Date:** {YYYY-MM-DD}
- **Status:** Accepted

**Context:** Without tests written first, implementations drift from requirements. Bugs are discovered late. Refactoring becomes risky without a safety net.

**Decision:** All code changes follow TDD: tests are written BEFORE implementation, using the spec's requirements as the source of truth for test cases. The TDD cycle (Red → Green → Refactor) is integrated into the spec workflow: Spec → Write Tests → Implement → Refactor → Validate → Archive.

**Consequences:**
- Slightly longer initial development time (offset by fewer regressions)
- Every spec must include a `## Tests` section defining test cases
- Bugfix specs must include a regression test that reproduces the bug first
- Code without tests is considered incomplete
- Refactoring is safer with comprehensive test coverage
- Agents following this project MUST write tests before implementation code

---

## ADR-003: {DECISION_NAME}

- **Date:** {YYYY-MM-DD}
- **Status:** {Accepted | Proposed | Deprecated}

**Context:** {Situation that calls for a decision.}

**Decision:** {What was decided and why.}

**Consequences:** {Trade-offs and impact.}
