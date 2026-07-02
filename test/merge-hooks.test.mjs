// TEST-12..14 — pure hook-merge for settings.json (REQ-06): adds kit entries, extends the
// SessionStart matcher, preserves user hooks, and is idempotent on re-run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeHookSettings } from "../scripts/merge-hooks.mjs";

const KIT = {
  hooks: {
    SessionStart: [
      { matcher: "startup|resume|compact", hooks: [{ type: "command", command: "node scripts/session-context.mjs" }] },
    ],
    PreToolUse: [
      { matcher: "Edit|Write|Bash", hooks: [{ type: "command", command: "node scripts/methodology-guard.mjs" }] },
    ],
    PostToolUse: [
      { matcher: "Write|Edit|Bash", hooks: [{ type: "command", command: "node scripts/methodology-nudge.mjs" }] },
    ],
  },
};

function project() {
  return {
    hooks: {
      SessionStart: [
        { matcher: "startup|resume", hooks: [{ type: "command", command: "node scripts/session-context.mjs" }] },
      ],
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: "./my-hook.sh" }] },
      ],
    },
  };
}

const commands = (entries) => entries.flatMap((e) => e.hooks.map((h) => h.command));

test("TEST-12: merge extends the SessionStart matcher and adds the new entries", () => {
  const { settings, changed } = mergeHookSettings(KIT, project());
  assert.equal(changed, true);
  assert.equal(settings.hooks.SessionStart[0].matcher, "startup|resume|compact");
  assert.ok(commands(settings.hooks.PreToolUse).includes("node scripts/methodology-guard.mjs"));
  assert.ok(commands(settings.hooks.PostToolUse).includes("node scripts/methodology-nudge.mjs"));
});

test("TEST-13: merge is idempotent (second run makes no change)", () => {
  const first = mergeHookSettings(KIT, project()).settings;
  const second = mergeHookSettings(KIT, first);
  assert.equal(second.changed, false);
  assert.deepEqual(second.settings, first);
});

test("TEST-14: merge preserves a user's own foreign hook", () => {
  const { settings } = mergeHookSettings(KIT, project());
  assert.ok(commands(settings.hooks.PreToolUse).includes("./my-hook.sh"));
  // both the user hook and the kit guard live under PreToolUse
  assert.equal(settings.hooks.PreToolUse.length, 2);
});
