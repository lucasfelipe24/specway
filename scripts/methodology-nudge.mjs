#!/usr/bin/env node
// PostToolUse nudge (Claude Code hook). Two precisely-timed self-questions for the spec-driven
// methodology — context injection only, NEVER blocks:
//   1. Spec-not-TDD-ready (Rules 1/2/3): after writing a .specs/changes/**/spec.md that has a body
//      but no `## Tests` / `## Regression Test` section, remind that it is not TDD-ready.
//   2. CLI next-step (Rules 4/6/7): after a `specway upgrade|scan|init` run, turn the CLI's printed
//      "Next: run X skill" hint into an actionable directive (and, for upgrade, the log.md record).
//
// Contract (mirrors session-context.mjs): whole body wrapped; on ANY internal error print nothing and
// exit 0. Stdlib only, no network, reads nothing outside the repo, mutates no files. Claude-Code-only
// accelerator — the harness-agnostic backstops (run-tdd, reconcile-upgrade, AGENTS.md, CI) still hold.
//
// stdin: PostToolUse JSON { tool_name, tool_input:{ file_path?, command? }, tool_output|tool_response, cwd }.
//   (the CLI directive requires the command AND the output to agree on the subcommand — see below.)
// stdout: nothing (silent) OR an additionalContext JSON.

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";

function silent() {
  process.exit(0);
}
function inject(additionalContext) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext } })
  );
  process.exit(0);
}

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

// A written spec.md that has real content but no Tests section is not TDD-ready.
function specNeedsTests(text) {
  const hasTests = /(^|\n)##\s+(Tests|Regression Test)\b/i.test(text);
  if (hasTests) return false;
  const hasBody = /(^|\n)##\s+(Context|Requirements|Scope|Design)\b/i.test(text);
  const nonEmpty = text.split("\n").filter((l) => l.trim()).length;
  return hasBody || nonEmpty >= 15;
}

const specTestsNudge = (rp) =>
  `\`${rp}\` was written without a \`## Tests\` (or \`## Regression Test\`) section, so it is not ` +
  "TDD-ready. Before run-tdd (Rule 2), add the failing test cases the spec must drive; a bugfix spec " +
  "(Rule 3) needs a `## Regression Test` that reproduces the bug. check-consistency does not validate " +
  "this — it is on you to make the spec Red-able first.";

// The CLI next-step directive requires TWO independent signals to AGREE, because each alone
// false-fires: (a) the command textually invokes `specway <sub>` — but a commit message or grep
// pattern can contain those words; (b) the tool output carries the CLI's own signature — but a
// grep/cat of files that contain that text reproduces it. Only when BOTH point at the same
// subcommand did the CLI actually run.
function specwaySubcommand(cmd) {
  const m = cmd.match(/\bspecway(?:\.mjs)?(?:@[^\s]+)?\s+(upgrade|scan|init)\b/);
  return m ? m[1] : null;
}
function specwayRanFromOutput(out) {
  if (/\bUpgrading methodology\b/.test(out) || /stamped .*Methodology Version/i.test(out)) return "upgrade";
  if (/overlaid\s+\d+\s+methodology paths/i.test(out)) return "scan";
  if (/scaffolded\s+\d+\s+methodology paths/i.test(out)) return "init";
  return null;
}

function cliNextStepDirective(sub) {
  if (sub === "upgrade")
    return (
      "`specway upgrade` ran (the mechanical copy/refresh is done). Now run the reconcile-upgrade " +
      "skill for the judgment phase: migrate AGENTS.md sections, adapt project files to new " +
      "conventions, and keyed-merge any new kit hooks. Then record the `from→to` methodology upgrade " +
      "in `.specs/memory/log.md` (Rule 6). Finally run `node scripts/check-consistency.mjs`."
    );
  if (sub === "scan")
    return (
      "`specway scan` ran. Now run the scan-project skill: detect the stack, merge the methodology " +
      "sections into AGENTS.md, draft the memory docs from the real code, and set the forward-only " +
      "TDD/baseline. Do not re-run init on this existing project."
    );
  return (
    "`specway init` ran. Now run the init-project skill: answer the stack questions, fill AGENTS.md, " +
    "narrow conventions, record ADR-003 (stack), and create the bootstrap requirements + spec."
  );
}

try {
  if (process.stdin.isTTY) silent();
  const raw = readStdin();
  if (!raw.trim()) silent();
  const payload = JSON.parse(raw);
  const root = payload.cwd || process.cwd();
  const tool = payload.tool_name;
  const input = payload.tool_input || {};

  if (tool === "Edit" || tool === "Write" || tool === "MultiEdit") {
    const rp = relToRoot(root, input.file_path);
    if (rp && /^\.specs\/changes\/\d+-[a-z0-9-]+\/spec\.md$/.test(rp)) {
      const abs = join(root, rp);
      const text = existsSync(abs) ? readFileSync(abs, "utf8") : "";
      if (text && specNeedsTests(text)) inject(specTestsNudge(rp));
    }
  }

  if (tool === "Bash") {
    const out = payload.tool_output ?? payload.tool_response ?? "";
    const sub = specwayRanFromOutput(typeof out === "string" ? out : JSON.stringify(out));
    if (sub && specwaySubcommand(String(input.command || "")) === sub) inject(cliNextStepDirective(sub));
  }

  silent();
} catch {
  silent();
}
