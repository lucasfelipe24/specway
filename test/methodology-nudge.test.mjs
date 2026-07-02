// TEST-08..16 — PostToolUse nudge: spec-no-Tests (REQ-03) + CLI next-step directive (REQ-05).
// The CLI directive is detected from the tool OUTPUT signature, not the command string, so a command
// that merely mentions "specway upgrade" (a commit message, an echo) does NOT false-fire (TEST-15).
// Nudge = exit 0 with an additionalContext JSON; silent = exit 0 with empty stdout. Never blocks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NUDGE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "methodology-nudge.mjs");

function run(payload) {
  const res = spawnSync(process.execPath, [NUDGE], { input: JSON.stringify(payload), encoding: "utf8" });
  return { status: res.status, out: (res.stdout || "").trim() };
}
function ctx(out) {
  return out ? JSON.parse(out).hookSpecificOutput.additionalContext : "";
}
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "specway-nudge-"));
  mkdirSync(join(root, ".specs"), { recursive: true });
  return root;
}
function writeFile(root, rel, content) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}
const cleanup = (root) => rmSync(root, { recursive: true, force: true });

test("TEST-08: nudges a spec written without a Tests section", () => {
  const root = makeRepo();
  const specPath = writeFile(
    root,
    ".specs/changes/009-y/spec.md",
    "# Spec\n\n## Context\n\nDo a thing.\n\n## Requirements\n\n- REQ-01: foo\n"
  );
  const { status, out } = run({ tool_name: "Write", tool_input: { file_path: specPath }, cwd: root });
  assert.equal(status, 0);
  assert.match(ctx(out), /tests/i);
  cleanup(root);
});

test("TEST-09: silent when the spec already has a Tests section", () => {
  const root = makeRepo();
  const specPath = writeFile(
    root,
    ".specs/changes/009-y/spec.md",
    "# Spec\n\n## Context\n\nDo a thing.\n\n## Tests\n\n| ID | Test |\n"
  );
  const { status, out } = run({ tool_name: "Write", tool_input: { file_path: specPath }, cwd: root });
  assert.equal(status, 0);
  assert.equal(out, "");
  cleanup(root);
});

test("TEST-10: turns a real `specway upgrade` run (by its output) into a next-step directive", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "npx @lucasfelipe23/specway upgrade" },
    tool_response: "Upgrading methodology 1.2.0 → 1.3.0\n✓ added 5 new paths, refreshed 9 tooling files",
  });
  assert.equal(status, 0);
  assert.match(ctx(out), /reconcile-upgrade/i);
  assert.match(ctx(out), /log/i);
});

test("TEST-11: silent on `specway check`", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "specway check" },
    tool_response: "All checks passed.",
  });
  assert.equal(status, 0);
  assert.equal(out, "");
});

test("TEST-15: does NOT false-fire when a command merely mentions `specway upgrade` (e.g. a commit)", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: 'git commit -m "so specway upgrade actually delivers the hooks"' },
    tool_response: "[feat/methodology-hooks 70b80a9] so specway upgrade actually delivers the hooks",
  });
  assert.equal(status, 0);
  assert.equal(out, "");
});

test("TEST-16: detects a scan by its output signature even when the command has no signature (object output)", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "bash ./run-scan.sh" },
    tool_output: { stdout: "✓ overlaid 12 methodology paths (existing project files untouched)", stderr: "" },
  });
  assert.equal(status, 0);
  assert.match(ctx(out), /scan-project/i);
});
