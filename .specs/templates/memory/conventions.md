# Code Conventions

## Frontend

### Styling
- {STYLING_APPROACH: CSS, SCSS, Tailwind, CSS-in-JS, SwiftUI, Qt/QML, System-native}
- Pattern: {HOW_STYLES_ARE_DEFINED}

### Components
- {UI_LIBRARY_OR_NATIVE}
- {COMPONENT_PATTERN: functional with hooks, class-based, composition API}
- One component per file (default export)
- Files named {PascalCase | kebab-case | snake_case}

### State Management
- {STATE_APPROACH: React Context, Redux, Zustand, Vuex, Pinia, Svelte stores, Solid signals, MobX}
- Local state via {STATE_HOOK: useState, ref, createSignal, $state}

### Forms
- {FORM_PATTERN: modal overlay, inline form, drawer}

### Filtering / Search
- Use {MEMO_HOOK: useMemo, computed, createMemo, $derived} for client-side filtering
- Pattern:
  ```pseudocode
  search = state("")
  filtered = computed(() => {
    if empty(search) return items
    term = lowercase(search)
    return items.filter(item => contains(lowercase(item.field), term))
  })
  ```

### Data Fetching
- {API_CALL_METHOD: fetch, axios, tRPC, GraphQL, gRPC, native bridge}
- Always handle loading, error, and empty states

### Types / Interfaces
- All type definitions in `types/` (or co-located)
- Naming follows {NAMING_CONVENTION: snake_case, camelCase, PascalCase}
- IDs: {UUID_v4 | number | autoincrement | ULID}

---

## Backend

### Architecture

Three distinct layers with clear boundaries:

| Layer | Folder | Purpose | Example |
|---|---|---|---|
| **Repository** | `db/repository/` | Data access (CRUD) — one per database entity | `UserRepository`, `OrderRepository` |
| **Adapter** | `adapters/` | External service integration — one per external API/service | `StripeAdapter`, `S3Adapter`, `SendGridAdapter` |
| **Service** | `business/` or `services/` | Business logic orchestration — coordinates repositories and adapters | `PaymentService`, `CheckoutService` |

**Data flow:**
```
Handler → Service → Repository (local data)
                 → Adapter  (external service)
```

- **Repository**: Abstrai coleção de dados. Métodos: `findById()`, `save()`, `delete()`. Retorna objetos de domínio.
- **Adapter**: Traduz entre o sistema e uma API externa. Métodos semânticos: `charge()`, `upload()`, `send()`. Retorna DTOs ou status codes.
- **Service**: Orquestra lógica de negócio. Chama repositories e adapters — nunca diretamente do handler.
- **{HANDLER_PATTERN}**: thin wrappers calling services. Zero business logic in handlers.
- Entry point registers all {HANDLERS: commands, routes, controllers}

### Models
- {MODEL_PATTERN}

### Naming
- Tables and columns: {snake_case | camelCase | PascalCase}
- Structs/Classes: {PascalCase | camelCase}
- IDs: {TYPE}

### Database
- {DB_ENGINE: SQLite, PostgreSQL, MySQL, MongoDB, SurrealDB, DynamoDB}
- Migrations via {DIESEL | PRISMA | KNEX | ALEMBIC | GOLANG_MIGRATE | FLYWAY | EF_CORE | ECTO}
- Connection pooling via {R2D2 | PG_POOL | BUILT_IN}

---

## Testing

### Framework
- {TEST_FRAMEWORK: Vitest, Jest, Mocha, Pytest, Cargo test, Go test, JUnit, xUnit, ExUnit}
- {COMPONENT_TEST_LIB: React Testing Library, Vue Test Utils, Svelte Testing Library, Angular TestBed, NONE}
- {E2E_FRAMEWORK: Playwright, Cypress, Appium, XCTest, Espresso, NONE}

### Test File Convention
- **Location:** {co-located (`File.test.{EXT}`) | `__tests__/` directory}
- **Naming:** `<FileUnderTest>.test.{EXT}` or `<FileUnderTest>.spec.{EXT}`
- **Pattern:** one test file per source file

### Coverage
- **Threshold:** {COVERAGE_THRESHOLD}% (minimum)
- **Measured by:** {COVERAGE_TOOL: istanbul, c8, tarpaulin, coverage.py, gcov, JaCoCo, Coverlet}
- Coverage reports generated on: `{TEST_COMMAND} {COVERAGE_FLAG}`

### Test Types
| Type | Scope | Framework | Location |
|---|---|---|---|
| **Unit** | Single function/component | {UNIT_FRAMEWORK} | Co-located |
| **Integration** | Module/API interaction | {INTEGRATION_FRAMEWORK} | `tests/integration/` |
| **E2E** | Full user flows | {E2E_FRAMEWORK} | `tests/e2e/` |

### TDD Workflow (Mandatory)
1. **Read spec** → understand requirements and `## Tests` section
2. **Red** → write a failing test that validates the requirement
3. **Green** → write minimum code to make the test pass
4. **Refactor** → clean up code, ensure all tests still pass
5. **Repeat** → next test case until all spec requirements are covered

### Test Standards
- Tests must be **deterministic** (no flaky tests)
- Tests must be **independent** (no shared mutable state)
- Tests must have **descriptive names** following the pattern: `should <expected behavior> when <condition>`
- Mock external dependencies; never mock the unit under test
- Each bugfix MUST include a regression test

---

## Spec Files

- All spec documents in `.specs/`
- Templates in `.specs/templates/`
- Active specs in `.specs/changes/<nnn>-<slug>/`
- Completed specs moved to `.specs/archive/`
- Knowledge in `.specs/memory/`
- Reference docs in `.specs/shared/`
