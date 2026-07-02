#!/usr/bin/env node
// Deterministic parser for a spec's `## Tasks` section — the surface the autonomous implement-spec
// loop (CHG-004) consumes. Parses each `- [ ] T1 — <desc> _Boundary:_ <...> _Depends:_ <...>` line
// into { id, done, desc, boundary, depends[] } and selects the next dependency-actionable task.
// Bulletproof by design: any parse issue yields an empty list, never a throw (mirrors the kit's
// "never disrupt a session" contract).
//
// As a library: import { parseTasks, nextActionable }.
// As a CLI:     node scripts/spec-tasks.mjs <spec.md> [--next]
//                 (no flag) → JSON array of tasks;  --next → JSON of the next actionable task or null.

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Slice the body of the `## Tasks` section (up to the next `## ` heading), or null if absent. */
function tasksSection(text) {
  const t = String(text ?? "").replace(/\r\n/g, "\n");
  const m = t.match(/^##\s+Tasks\s*$/m);
  if (!m) return null;
  const after = t.slice(m.index + m[0].length);
  const next = after.search(/\n##\s+/);
  return next === -1 ? after : after.slice(0, next);
}

/** Parse the `## Tasks` block into task objects. Returns [] when there is no valid Tasks section. */
export function parseTasks(text) {
  try {
    const section = tasksSection(text);
    if (section === null) return [];
    const tasks = [];
    for (const line of section.split("\n")) {
      const m = line.match(/^\s*-\s*\[([ xX])\]\s*(T\d+)\b\s*[—:-]*\s*(.*)$/);
      if (!m) continue;
      const [, box, id, rest] = m;
      // Annotations sit at the END of the line, ordered `_Boundary:_ … _Depends:_`, so match the
      // RIGHTMOST occurrences — a task whose prose mentions the literal markers (e.g. this kit's own
      // meta-spec describing the parser) must not fool it.
      const depIdx = rest.lastIndexOf("_Depends:_");
      const boundIdx = rest.lastIndexOf("_Boundary:_", depIdx === -1 ? rest.length : depIdx);
      const depends = depIdx === -1 ? [] : [...rest.slice(depIdx).matchAll(/T\d+/g)].map((d) => d[0]);
      const boundary =
        boundIdx === -1
          ? ""
          : rest.slice(boundIdx + "_Boundary:_".length, depIdx === -1 ? undefined : depIdx).trim();
      const desc = (boundIdx === -1 ? rest : rest.slice(0, boundIdx)).trim();
      tasks.push({ id, done: box.toLowerCase() === "x", desc, boundary, depends });
    }
    return tasks;
  } catch {
    return [];
  }
}

/** First task that is not done and whose every dependency is done, in dependency (not file) order. */
export function nextActionable(tasks) {
  const done = new Map((tasks || []).map((t) => [t.id, t.done]));
  for (const t of tasks || []) {
    if (t.done) continue;
    if ((t.depends || []).every((d) => done.get(d) === true)) return t;
  }
  return null;
}

// --- CLI (only when run directly, never on import) ---
const isMain = (() => {
  try {
    return process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  try {
    const file = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
    if (!file) {
      process.stderr.write("usage: node scripts/spec-tasks.mjs <spec.md> [--next]\n");
      process.exit(1);
    }
    const tasks = parseTasks(readFileSync(file, "utf8"));
    const out = process.argv.includes("--next") ? nextActionable(tasks) : tasks;
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`spec-tasks: ${e.message}\n`);
    process.exit(1);
  }
}
