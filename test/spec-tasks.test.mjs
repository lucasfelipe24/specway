// TEST-01..04 — scripts/spec-tasks.mjs: deterministic parse of a spec's `## Tasks` section and
// selection of the next dependency-actionable task (the surface the implement-spec loop consumes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks, nextActionable } from "../scripts/spec-tasks.mjs";

const SPEC = `# Spec

## Design

blah

## Tasks

- [x] T1 — do A _Boundary:_ \`src/a\` _Depends:_ —
- [ ] T2 — do B _Boundary:_ \`src/b\` _Depends:_ T1
- [ ] T3 — do C _Boundary:_ \`src/c\` _Depends:_ T2, T1

## Risks

none
`;

test("TEST-01: parses id, done, boundary and depends from the Tasks block", () => {
  const tasks = parseTasks(SPEC);
  assert.equal(tasks.length, 3);
  assert.deepEqual(
    tasks.map((t) => ({ id: t.id, done: t.done, depends: t.depends })),
    [
      { id: "T1", done: true, depends: [] },
      { id: "T2", done: false, depends: ["T1"] },
      { id: "T3", done: false, depends: ["T2", "T1"] },
    ]
  );
  assert.match(tasks[1].boundary, /src\/b/);
  assert.match(tasks[0].desc, /do A/);
});

test("TEST-02: next-actionable respects dependency order, not file order", () => {
  // T1 depends on T2; T2 has no deps -> T2 is the actionable one even though T1 is listed first.
  const tasks = parseTasks(`## Tasks
- [ ] T1 — a _Boundary:_ x _Depends:_ T2
- [ ] T2 — b _Boundary:_ y _Depends:_ —
`);
  assert.equal(nextActionable(tasks)?.id, "T2");
});

test("TEST-03: done detection — all done → null; mixed → the unblocked one", () => {
  const tasks = parseTasks(SPEC); // T1 done, T2/T3 open
  assert.equal(nextActionable(tasks)?.id, "T2"); // T2 unblocked (T1 done); T3 blocked (T2 open)

  const allDone = parseTasks(`## Tasks
- [x] T1 — a _Boundary:_ x _Depends:_ —
- [x] T2 — b _Boundary:_ y _Depends:_ T1
`);
  assert.equal(nextActionable(allDone), null);
});

test("TEST-04: bulletproof — no Tasks section or a malformed line never throws", () => {
  assert.deepEqual(parseTasks("# Spec\n\n## Context\n\nno tasks here\n"), []);
  assert.deepEqual(parseTasks(""), []);
  // a stray non-task bullet under Tasks is ignored, not parsed as a task
  const tasks = parseTasks("## Tasks\n\n- not a task line\n- [ ] T9 — real _Boundary:_ z _Depends:_ —\n");
  assert.deepEqual(tasks.map((t) => t.id), ["T9"]);
});
