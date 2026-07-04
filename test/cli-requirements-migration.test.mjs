// `specway upgrade` on a project with a legacy `.specs/requirements/` tree co-locates it (CHG-005):
// each `<n>-<slug>/requirements.md` moves into its matching change folder (changes/ if the spec is
// active, archive/ if already archived), the spec's traceability link + the alignment review's pointer
// are rewritten to the sibling `requirements.md`, and the now-empty legacy tree is removed.
// Move-not-delete, idempotent (a no-op once `.specs/requirements/` is gone).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), "..", "bin", "specway.mjs");

function w(root, rel, content) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
function upgrade(root) {
  return spawnSync(process.execPath, [BIN, "upgrade"], { cwd: root, encoding: "utf8" });
}
function legacyProject() {
  const root = mkdtempSync(join(tmpdir(), "specway-mig-"));
  // Old methodology version so `upgrade` proceeds.
  w(root, ".specs/config.md", "# Config\n\n## Repository\n\n- **URL:** https://github.com/example/specway\n\n## Methodology Version\n\n- **Version:** 1.4.0\n");
  // Active requirements-backed spec (old-style ../../requirements/ link).
  w(root, ".specs/requirements/003-legacy/requirements.md", "REQ-01 the system must foo\n");
  w(root, ".specs/changes/003-legacy/spec.md", "# Spec\n\n## Requirements Traceability\n\n**Requirements:** [`requirements/003-legacy/requirements.md`](../../requirements/003-legacy/requirements.md)\n\nREQ-01\n");
  // Archived requirements-backed spec + its alignment review.
  w(root, ".specs/requirements/001-old/requirements.md", "REQ-01 the system must bar\n");
  w(root, ".specs/archive/001-old/spec.md", "# Spec\n**Requirements:** [x](../../requirements/001-old/requirements.md)\nREQ-01\n");
  w(root, ".specs/archive/001-old/alignment-review.md", "- **Reviewed-requirements:** ../../requirements/001-old/requirements.md\n- **Verdict:** aligned\n\nREQ-01\n");
  return root;
}

test("specway upgrade co-locates a legacy .specs/requirements/ tree and rewrites links", () => {
  const root = legacyProject();
  const res = upgrade(root);
  assert.equal(res.status, 0, res.stderr);

  // Requirements relocated into their co-located change folders.
  assert.ok(existsSync(join(root, ".specs/changes/003-legacy/requirements.md")), "active requirements co-located");
  assert.ok(existsSync(join(root, ".specs/archive/001-old/requirements.md")), "archived requirements co-located");
  // Legacy tree removed (move-not-leave-behind).
  assert.ok(!existsSync(join(root, ".specs/requirements")), ".specs/requirements/ removed once empty");

  // The active spec's traceability link now points at the sibling requirements.md.
  const spec = readFileSync(join(root, ".specs/changes/003-legacy/spec.md"), "utf8");
  assert.match(spec, /\]\(requirements\.md\)/, "traceability link points at sibling requirements.md");
  assert.doesNotMatch(spec, /\.\.\/\.\.\/requirements\//, "old relative link removed");
  // The archived alignment review's pointer is rewritten too.
  const review = readFileSync(join(root, ".specs/archive/001-old/alignment-review.md"), "utf8");
  assert.match(review, /\*\*Reviewed-requirements:\*\*\s*requirements\.md/, "alignment pointer rewritten");

  rmSync(root, { recursive: true, force: true });
});

test("re-running upgrade is a no-op for co-location (idempotent, no data loss)", () => {
  const root = legacyProject();
  assert.equal(upgrade(root).status, 0);
  const firstActive = readFileSync(join(root, ".specs/changes/003-legacy/requirements.md"), "utf8");
  // Bump the project back below the kit version so a second upgrade runs its full body again.
  const cfg = join(root, ".specs/config.md");
  writeFileSync(cfg, readFileSync(cfg, "utf8").replace(/(\*\*Version:\*\*\s*)[0-9.]+/, "$11.4.0"));
  assert.equal(upgrade(root).status, 0);
  assert.ok(!existsSync(join(root, ".specs/requirements")), "still no legacy tree after a second run");
  assert.equal(
    readFileSync(join(root, ".specs/changes/003-legacy/requirements.md"), "utf8"),
    firstActive,
    "co-located requirements untouched by the second run"
  );
  rmSync(root, { recursive: true, force: true });
});
