// TEST-01..07 — PreToolUse guard: archive alignment gate (REQ-02) + baseline immutability (REQ-04).
// Each test spins a throwaway repo fixture, pipes a hook stdin payload, and asserts on the guard's
// deny/allow decision. Allow = exit 0 with empty stdout; deny = exit 0 with a permissionDecision JSON.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = resolve(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "methodology-guard.mjs");

function runRaw(input) {
  const res = spawnSync(process.execPath, [GUARD], { input, encoding: "utf8" });
  return { status: res.status, out: (res.stdout || "").trim() };
}
function run(payload) {
  return runRaw(JSON.stringify(payload));
}
function parse(out) {
  return out ? JSON.parse(out) : null;
}
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "specway-guard-"));
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

test("TEST-01: denies archiving an unaligned requirements-backed spec", () => {
  const root = makeRepo();
  writeFile(root, ".specs/requirements/007-x/requirements.md", "REQ-01 the system must foo");
  writeFile(root, ".specs/changes/007-x/spec.md", "# Spec\nREQ-01");
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "git mv .specs/changes/007-x .specs/archive/007-x" },
    cwd: root,
  });
  assert.equal(status, 0);
  const j = parse(out);
  assert.equal(j.hookSpecificOutput.permissionDecision, "deny");
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /review-alignment/i);
  cleanup(root);
});

test("TEST-02: allows archiving an aligned spec", () => {
  const root = makeRepo();
  writeFile(root, ".specs/requirements/007-x/requirements.md", "REQ-01 the system must foo");
  writeFile(root, ".specs/changes/007-x/spec.md", "# Spec\nREQ-01");
  writeFile(root, ".specs/changes/007-x/alignment-review.md", "- **Verdict:** aligned\n");
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "git mv .specs/changes/007-x .specs/archive/007-x" },
    cwd: root,
  });
  assert.equal(status, 0);
  assert.equal(out, "");
  cleanup(root);
});

test("TEST-03: ignores archiving a spec with no matching requirements (lightweight path)", () => {
  const root = makeRepo();
  writeFile(root, ".specs/changes/012-fix/spec.md", "# Micro-spec\n## Context\nfix\n## Regression Test\n");
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "git mv .specs/changes/012-fix .specs/archive/012-fix" },
    cwd: root,
  });
  assert.equal(status, 0);
  assert.equal(out, "");
  cleanup(root);
});

test("TEST-04: denies editing .specs/baseline.json", () => {
  const root = makeRepo();
  writeFile(root, ".specs/baseline.json", "{}");
  const { status, out } = run({
    tool_name: "Edit",
    tool_input: { file_path: join(root, ".specs/baseline.json") },
    cwd: root,
  });
  assert.equal(status, 0);
  const j = parse(out);
  assert.equal(j.hookSpecificOutput.permissionDecision, "deny");
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /snapshot|specway upgrade/i);
  cleanup(root);
});

test("TEST-05: denies deleting .specs/baseline.json via Bash", () => {
  const root = makeRepo();
  writeFile(root, ".specs/baseline.json", "{}");
  const { status, out } = run({
    tool_name: "Bash",
    tool_input: { command: "rm .specs/baseline.json" },
    cwd: root,
  });
  assert.equal(status, 0);
  assert.equal(parse(out).hookSpecificOutput.permissionDecision, "deny");
  cleanup(root);
});

test("TEST-06: allows an unrelated edit", () => {
  const root = makeRepo();
  const { status, out } = run({
    tool_name: "Edit",
    tool_input: { file_path: join(root, "README.md") },
    cwd: root,
  });
  assert.equal(status, 0);
  assert.equal(out, "");
  cleanup(root);
});

test("TEST-07: fails open on malformed stdin (never wedges)", () => {
  const { status, out } = runRaw("not-json{");
  assert.equal(status, 0);
  assert.equal(out, "");
});
