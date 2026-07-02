// Regression guard for what the published npm tarball contains — kit-internal working files must not
// leak, and everything the CLI copies into a project must ship.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function packedFiles() {
  const res = spawnSync("npm", ["pack", "--dry-run", "--json"], { cwd: ROOT, encoding: "utf8" });
  return JSON.parse(res.stdout)[0].files.map((f) => f.path.replace(/\\/g, "/"));
}

test("the npm package does not leak kit-internal working files", () => {
  const files = packedFiles();
  // .specs/memory/ is the KIT's own working memory (log.md history, TRBs, catalog); requirements/
  // changes/archive are the kit's own specs — none belong in a consumer's package.
  const leaks = files.filter((p) => /^\.specs\/(memory|requirements|changes|archive)\//.test(p));
  assert.deepEqual(leaks, [], `kit-internal paths must not ship: ${leaks.join(", ")}`);
  assert.ok(!files.some((p) => p.startsWith("test/")), "dev tests must not ship");
});

test("the npm package ships everything the CLI copies into a project", () => {
  const files = packedFiles();
  const need = [
    ".specs/config.md",
    ".specs/methodology.md",
    ".specs/templates/feature-spec.md",
    ".specs/templates/memory/log.md", // the CLEAN scaffold source that seeds a project's .specs/memory/
    ".specs/shared/entity-map.md",
    "scripts/spec-tasks.mjs",
    ".github/workflows/consistency.yml", // downstream CI must ship
  ];
  for (const f of need) assert.ok(files.includes(f), `missing from the package: ${f}`);
  assert.ok(files.some((p) => p.startsWith(".claude/skills/")), "skills must ship");
});
