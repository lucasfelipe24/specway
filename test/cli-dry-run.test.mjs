// TEST-01..03 — `specway --dry-run`: init/upgrade preview what they WOULD do and write nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), "..", "bin", "specway.mjs");

function cli(cwd, ...args) {
  const res = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });
  return { status: res.status, out: (res.stdout || "") + (res.stderr || "") };
}
function tmp(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}
const cleanup = (d) => rmSync(d, { recursive: true, force: true });

test("TEST-01: `init --dry-run` previews and writes nothing", () => {
  const dir = tmp("specway-dry-init-");
  const { status, out } = cli(dir, "init", "--dry-run");
  assert.equal(status, 0);
  assert.match(out, /dry run/i);
  assert.deepEqual(readdirSync(dir), [], "the target dir must stay empty under --dry-run");
  cleanup(dir);
});

test("TEST-02: `upgrade --dry-run` mutates no file", () => {
  const dir = tmp("specway-dry-upgrade-");
  mkdirSync(join(dir, ".specs"), { recursive: true });
  mkdirSync(join(dir, ".claude"), { recursive: true });
  const configBody = "## Repository\n\n- **URL:** `x`\n\n## Methodology Version\n\n- **Version:** 1.1.0\n";
  const settingsBody = JSON.stringify(
    {
      hooks: {
        SessionStart: [
          { matcher: "startup|resume", hooks: [{ type: "command", command: "node scripts/session-context.mjs" }] },
        ],
      },
    },
    null,
    2
  );
  writeFileSync(join(dir, ".specs/config.md"), configBody);
  writeFileSync(join(dir, ".claude/settings.json"), settingsBody);

  const { status, out } = cli(dir, "upgrade", "--dry-run");
  assert.equal(status, 0);
  assert.match(out, /dry run/i);
  // nothing on disk changed
  assert.equal(readFileSync(join(dir, ".claude/settings.json"), "utf8"), settingsBody);
  assert.equal(readFileSync(join(dir, ".specs/config.md"), "utf8"), configBody);
  cleanup(dir);
});

test("TEST-03: control — `init` without the flag DOES write files", () => {
  const dir = tmp("specway-real-init-");
  const { status } = cli(dir, "init");
  assert.equal(status, 0);
  assert.ok(readdirSync(dir).length > 0, "a real init must scaffold files");
  cleanup(dir);
});
