#!/usr/bin/env node
// PreToolUse guard (Claude Code hook). Two high-signal, irreversible-moment gates for the
// spec-driven methodology:
//   1. Archive alignment gate (Rule 7): block moving/writing a requirements-backed spec into
//      .specs/archive/ until its alignment-review.md reads `Verdict: aligned`.
//   2. baseline.json immutability (Rule 7): block hand-editing/deleting the one-time forward-only
//      snapshot that only `specway upgrade` may write.
//
// Contract (mirrors session-context.mjs + methodology.md safety model): the whole body is wrapped so
// that on ANY internal error the guard exits 0 (ALLOW) — a guard must fail OPEN and deny ONLY on the
// exact intended violation, never wedge the agent. It is a Claude-Code-only accelerator: CI
// (check-consistency) + the review-alignment skill remain the harness-agnostic enforcement.
//
// stdin: PreToolUse JSON { tool_name, tool_input:{ file_path?, command? }, cwd }.
// stdout: nothing (allow) OR a permissionDecision "deny" JSON with a reason fed back to the agent.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";

const BASELINE = ".specs/baseline.json";

function allow() {
  process.exit(0); // silence = allow
}
function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

const baselineReason = () =>
  "`.specs/baseline.json` is a one-time, forward-only snapshot written ONLY by `specway upgrade` — " +
  "it must not be hand-edited or deleted (doing so silently defeats the traceability/alignment gate). " +
  "If grandfathering needs to change, do it through the CLI, not by editing this file.";

const archiveMissingReviewReason = (dir) =>
  `Cannot archive \`${dir}\`: it has a requirements doc but no \`alignment-review.md\`. Run the ` +
  "review-alignment skill first — check-consistency blocks archiving a requirements-backed spec until " +
  "its alignment review exists, covers every REQ, and reads `Verdict: aligned`.";

const archiveNotAlignedReason = (dir) =>
  `Cannot archive \`${dir}\`: its \`alignment-review.md\` verdict is not \`aligned\`. Re-run the ` +
  "review-alignment skill and fix the spec until the verdict is `aligned` before archiving.";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function relToRoot(root, p) {
  if (!p) return null;
  const abs = isAbsolute(p) ? p : resolve(root, p);
  const r = relative(root, abs).split("\\").join("/");
  return r.startsWith("..") ? null : r;
}

function dirsUnder(p) {
  try {
    return readdirSync(p).filter((d) => d !== ".gitkeep" && statSync(join(p, d)).isDirectory());
  } catch {
    return [];
  }
}

const numPrefix = (name) => (name.match(/^(\d+)-/) || [])[1] || null;

// Given a spec dir name (e.g. "007-x"), return a deny reason if archiving it must be blocked, else null.
function archiveGateVerdict(root, specDir) {
  const num = numPrefix(specDir);
  if (!num) return null;
  const hasRequirements = dirsUnder(join(root, ".specs", "requirements")).some((d) => numPrefix(d) === num);
  if (!hasRequirements) return null; // lightweight / no-requirements path — the gate does not apply

  // The alignment review lives with the spec; at PreToolUse the source (changes/) still exists.
  for (const base of ["changes", "archive"]) {
    const review = join(root, ".specs", base, specDir, "alignment-review.md");
    if (existsSync(review)) {
      const text = readFileSync(review, "utf8");
      return /\*\*Verdict:\*\*\s*aligned\b/i.test(text) ? null : archiveNotAlignedReason(specDir);
    }
  }
  return archiveMissingReviewReason(specDir);
}

// Extract the spec dir being archived from a shell command, if it is an archive move.
function archiveTargetDir(cmd) {
  if (!/\b(git\s+mv|mv)\b/.test(cmd) || !/\.specs\/archive\//.test(cmd)) return null;
  const fromChanges = cmd.match(/\.specs\/changes\/(\d+-[a-z0-9-]+)/);
  if (fromChanges) return fromChanges[1];
  const toArchive = cmd.match(/\.specs\/archive\/(\d+-[a-z0-9-]+)/);
  return toArchive ? toArchive[1] : null;
}

function baselineTouchedByBash(cmd) {
  return (
    /\.specs\/baseline\.json/.test(cmd) &&
    /(^|\s)(rm|mv|cp|truncate)\s|>\s*[^|]*\.specs\/baseline\.json|\btee\b|\bsed\s+-i/.test(cmd)
  );
}

try {
  if (process.stdin.isTTY) allow(); // manual run without piped input — do nothing
  const raw = readStdin();
  if (!raw.trim()) allow();
  const payload = JSON.parse(raw);
  const root = payload.cwd || process.cwd();
  const tool = payload.tool_name;
  const input = payload.tool_input || {};

  if (tool === "Edit" || tool === "Write" || tool === "MultiEdit") {
    const rp = relToRoot(root, input.file_path);
    if (rp === BASELINE) deny(baselineReason());
    const inArchive = rp && rp.match(/^\.specs\/archive\/(\d+-[a-z0-9-]+)\/spec\.md$/);
    if (inArchive) {
      const reason = archiveGateVerdict(root, inArchive[1]);
      if (reason) deny(reason);
    }
  }

  if (tool === "Bash") {
    const cmd = String(input.command || "");
    if (baselineTouchedByBash(cmd)) deny(baselineReason());
    const dir = archiveTargetDir(cmd);
    if (dir) {
      const reason = archiveGateVerdict(root, dir);
      if (reason) deny(reason);
    }
  }

  allow();
} catch {
  allow(); // fail open — never wedge the agent
}
