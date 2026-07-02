// A fresh `init` must materialize the project's working memory at .specs/memory/, but must NOT
// duplicate the kit-internal memory scaffold into .specs/templates/memory/ (the scaffold source is
// kit-only — a project has no use for a second copy of it).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), "..", "bin", "specway.mjs");

test("init creates .specs/memory/ but not a redundant .specs/templates/memory/", () => {
  const dir = mkdtempSync(join(tmpdir(), "specway-scaffold-"));
  spawnSync(process.execPath, [BIN, "init"], { cwd: dir, encoding: "utf8" });
  assert.ok(existsSync(join(dir, ".specs/memory/log.md")), "the project's working memory must be created");
  assert.ok(existsSync(join(dir, ".specs/templates/feature-spec.md")), "spec templates must be copied");
  assert.ok(
    !existsSync(join(dir, ".specs/templates/memory")),
    "the kit-internal memory scaffold must not be duplicated into the project"
  );
  rmSync(dir, { recursive: true, force: true });
});
