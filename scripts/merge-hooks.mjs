// Pure, dependency-free merge of kit-owned Claude Code hooks into a project's settings.json.
// Used by bin/specway.mjs during `scan`/`upgrade` to deliver new/updated hook wiring to projects
// whose .claude/settings.json already exists (ADDITIVE_FILES is copy-if-absent, so it is frozen
// after first setup — this is the only channel that reaches the installed base). It is a pure
// function (no I/O) so it is unit-testable; the CLI wraps it with the read/write.
//
// Contract: ADD-ONLY and idempotent. It never removes or rewrites a user's own hooks; it only
//   (a) appends a kit entry when no project entry shares its command, and
//   (b) unions a matcher when the project already runs the same command under a narrower matcher
//       (e.g. SessionStart "startup|resume" gains "compact").
// Keying is by command string, which is stable across kit versions; matcher is reconciled by union.

/** Command strings declared by a hook entry ({matcher, hooks:[{command}]}). */
function commandsOf(entry) {
  return Array.isArray(entry?.hooks) ? entry.hooks.map((h) => h && h.command).filter(Boolean) : [];
}

/** Union two "a|b|c" matcher alternations, preserving the base order and appending new tokens. */
function unionMatcher(base, add) {
  const seen = new Set();
  const out = [];
  for (const tok of `${base ?? ""}`.split("|").concat(`${add ?? ""}`.split("|"))) {
    const t = tok.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.join("|");
}

const clone = (v) => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

/**
 * Merge kit.hooks into project.hooks. Returns { settings, changed }.
 * `project` may be null/undefined (treated as empty).
 */
export function mergeHookSettings(kit, project) {
  const isObj = project && typeof project === "object";
  const result = isObj ? clone(project) : {};
  if (!result.hooks || typeof result.hooks !== "object") result.hooks = {};
  let changed = !isObj;

  const kitHooks = (kit && kit.hooks) || {};
  for (const [event, kitEntries] of Object.entries(kitHooks)) {
    if (!Array.isArray(kitEntries)) continue;
    if (!Array.isArray(result.hooks[event])) result.hooks[event] = [];
    const projEntries = result.hooks[event];

    for (const kitEntry of kitEntries) {
      const kitCmds = commandsOf(kitEntry);
      // (b) A project entry already runs one of the kit commands → reconcile the matcher only.
      const shared = projEntries.find((e) => commandsOf(e).some((c) => kitCmds.includes(c)));
      if (shared) {
        const merged = unionMatcher(shared.matcher, kitEntry.matcher);
        if (merged !== shared.matcher) {
          shared.matcher = merged;
          changed = true;
        }
        continue;
      }
      // (a) No project entry with the same command → append the kit entry verbatim.
      projEntries.push(clone(kitEntry));
      changed = true;
    }
  }
  return { settings: result, changed };
}
