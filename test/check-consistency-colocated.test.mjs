// Guards against the "green-but-blind" regression (CHG-005): once requirements live co-located inside
// the change folder, check-consistency's traceability + alignment gate must ACTIVELY validate ≥1 pair
// — not silently skip because they can no longer find a separate `.specs/requirements/` tree. If the
// co-located resolution ever breaks back to a skip, these counts drop and the test fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = join(ROOT, "scripts", "check-consistency.mjs");
const res = spawnSync(process.execPath, [CHECK], { cwd: ROOT, encoding: "utf8" });
const OUT = (res.stdout || "") + (res.stderr || "");

test("check-consistency passes on the co-located layout", () => {
  assert.equal(res.status, 0, OUT);
});

test("traceability actively validates co-located requirements↔spec pairs (not skipped)", () => {
  assert.match(
    OUT,
    /traceability: [1-9]\d* requirements↔spec pair\(s\) linked, no dangling REQ ids/,
    "traceability must actively check ≥1 co-located pair (and run its no-dangling-REQ check), not skip"
  );
});

test("alignment gate actively validates co-located archived requirements (not skipped)", () => {
  assert.match(
    OUT,
    /alignment gate: [1-9]\d* archived spec\(s\) reviewed and aligned/,
    "alignment gate must actively check ≥1 co-located archived spec, not skip"
  );
});
