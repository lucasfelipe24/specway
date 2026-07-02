// TEST-08..17 — PostToolUse nudge: spec-no-Tests (REQ-03) + CLI next-step directive (REQ-05).
// The CLI directive requires BOTH signals: the command must invoke `specway <sub>` AND the tool
// output must carry that CLI's signature. Either alone false-fires — command-only on a commit that
// merely mentions the words (TEST-15); output-only on a grep/cat of files that contain the signature
// text (TEST-16). Nudge = exit 0 + additionalContext JSON; silent = exit 0 + empty stdout.
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

test("TEST-10: fires when the command invokes specway AND the output has the signature (npx upgrade)", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "npx @lucasfelipe23/specway upgrade" },
    tool_response: "Upgrading methodology 1.2.0 → 1.4.0\n✓ added 5 new paths, refreshed 9 tooling files",
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

test("TEST-15: silent when a command only MENTIONS `specway upgrade` (e.g. a commit) — no CLI output", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: 'git commit -m "so specway upgrade actually delivers the hooks"' },
    tool_response: "[main 70b80a9] so specway upgrade actually delivers the hooks",
  });
  assert.equal(status, 0);
  assert.equal(out, "");
});

test("TEST-16: silent when output CONTAINS the signature but the command is not a specway run (grep/cat)", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: 'grep -rn "Upgrading methodology" test/' },
    tool_response: 'test/methodology-nudge.test.mjs:65:  tool_response: "Upgrading methodology 1.2.0 → 1.4.0"',
  });
  assert.equal(status, 0);
  assert.equal(out, "");
});

test("TEST-17: fires on a real `node bin/specway.mjs scan` with the scan output signature (object output)", () => {
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "node bin/specway.mjs scan" },
    tool_output: { stdout: "✓ overlaid 12 methodology paths (existing project files untouched)", stderr: "" },
  });
  assert.equal(status, 0);
  assert.match(ctx(out), /scan-project/i);
});
