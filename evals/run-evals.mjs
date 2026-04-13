#!/usr/bin/env node
/**
 * Zero-dependency eval runner for the pretty-prompts plugin.
 *
 * For each eval case in evals.json:
 *   1. Build an invoking prompt that loads the `prompt-optimizer` skill and
 *      supplies the case's inputs per the caller contract.
 *   2. Invoke `claude -p` (Claude Code headless) with that prompt.
 *   3. Parse the response. Assert on required sections, must_contain strings,
 *      must_not_contain strings, and min_score.
 *   4. Print a pass/fail table. Exit non-zero if any case failed.
 *
 * Usage:
 *   node evals/run-evals.mjs                 # run all cases
 *   node evals/run-evals.mjs <case-id>       # run one case
 *   node evals/run-evals.mjs --dry           # print invoking prompts, don't call claude
 *
 * Requires: `claude` CLI on PATH.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVALS_PATH = resolve(__dirname, "evals.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
const filterId = args.find((a) => !a.startsWith("--"));

const data = JSON.parse(readFileSync(EVALS_PATH, "utf8"));
const cases = filterId
  ? data.evals.filter((c) => c.id === filterId)
  : data.evals;

if (cases.length === 0) {
  console.error(`No eval cases matched ${filterId ? `id '${filterId}'` : ""}`);
  process.exit(1);
}

/** Build the invoking prompt a caller would send. */
function buildInvokingPrompt(caseObj) {
  const inputs = caseObj.inputs;
  const lines = [
    "Use the `prompt-optimizer` skill from the `pretty-prompts` plugin.",
    "Follow `references/caller-contract.md` — return the strict machine output (CONFIG / DIAGNOSIS / OPTIMIZED_PROMPT / ASSUMPTIONS / RISK_NOTES / TEMPERATURE_HINT / KEY_CHANGES / REGRESSION_NOTES).",
    "",
    "Inputs:",
  ];
  for (const [k, v] of Object.entries(inputs)) {
    if (typeof v === "string" && v.includes("\n")) {
      lines.push(`${k}: |`);
      for (const ln of v.split("\n")) lines.push(`  ${ln}`);
    } else {
      lines.push(`${k}: ${JSON.stringify(v).replace(/^"|"$/g, "")}`);
    }
  }
  return lines.join("\n");
}

/** Run `claude -p <prompt>`, return stdout. */
function invokeClaude(prompt) {
  const r = spawnSync("claude", ["-p", prompt], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.error) {
    return { ok: false, error: r.error.message, stdout: "", stderr: "" };
  }
  if (r.status !== 0) {
    return {
      ok: false,
      error: `claude exited with code ${r.status}`,
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
    };
  }
  return { ok: true, stdout: r.stdout, stderr: r.stderr };
}

/** Extract SCORE total from a CONFIG line. */
function extractScore(output) {
  const m = output.match(/SCORE:\s*(\d+)\s*\/\s*25/);
  return m ? Number(m[1]) : null;
}

/** Assert helpers. Return [passed, message]. */
function checkRequiredSections(output, required) {
  const missing = required.filter((s) => !output.includes(s));
  return missing.length === 0
    ? [true, null]
    : [false, `missing sections: ${missing.join(", ")}`];
}

function checkMustContain(output, needles, caseInsensitive = false) {
  const hay = caseInsensitive ? output.toLowerCase() : output;
  const missing = (needles || []).filter((n) => {
    const needle = caseInsensitive ? n.toLowerCase() : n;
    return !hay.includes(needle);
  });
  return missing.length === 0
    ? [true, null]
    : [false, `missing: ${missing.join(", ")}`];
}

function checkMustNotContain(output, needles, caseInsensitive = false) {
  const hay = caseInsensitive ? output.toLowerCase() : output;
  const found = (needles || []).filter((n) => {
    const needle = caseInsensitive ? n.toLowerCase() : n;
    return hay.includes(needle);
  });
  return found.length === 0
    ? [true, null]
    : [false, `should not contain: ${found.join(", ")}`];
}

function checkMinScore(output, minScore) {
  const score = extractScore(output);
  if (score == null) return [false, "no SCORE found in CONFIG line"];
  return score >= minScore
    ? [true, null]
    : [false, `score ${score} < min ${minScore}`];
}

function checkTypeSubstring(output, substring) {
  if (!substring) return [true, null];
  const m = output.match(/CONFIG:[^\n]*/);
  if (!m) return [false, "no CONFIG line found"];
  return m[0].toLowerCase().includes(substring.toLowerCase())
    ? [true, null]
    : [false, `CONFIG type does not contain '${substring}'`];
}

/** Run one case, return result row. */
function runCase(caseObj) {
  const prompt = buildInvokingPrompt(caseObj);

  if (DRY_RUN) {
    console.log(`\n=== DRY: ${caseObj.id} ===`);
    console.log(prompt);
    return {
      id: caseObj.id,
      status: "DRY",
      score: null,
      failures: [],
    };
  }

  const res = invokeClaude(prompt);
  if (!res.ok) {
    return {
      id: caseObj.id,
      status: "ERROR",
      score: null,
      failures: [res.error],
    };
  }

  const output = res.stdout;
  const failures = [];
  const checks = [
    checkRequiredSections(output, caseObj.required_sections || []),
    checkMustContain(output, caseObj.must_contain, false),
    checkMustContain(output, caseObj.must_contain_case_insensitive, true),
    checkMustNotContain(output, caseObj.must_not_contain, false),
    checkMustNotContain(
      output,
      caseObj.must_not_contain_case_insensitive,
      true
    ),
    checkTypeSubstring(output, caseObj.expected_type_substring),
  ];
  if (caseObj.min_score != null) {
    checks.push(checkMinScore(output, caseObj.min_score));
  }
  for (const [ok, msg] of checks) {
    if (!ok && msg) failures.push(msg);
  }

  return {
    id: caseObj.id,
    status: failures.length === 0 ? "PASS" : "FAIL",
    score: extractScore(output),
    failures,
    output,
  };
}

// Check claude availability (unless dry-run)
if (!DRY_RUN) {
  const check = spawnSync("claude", ["--version"], { encoding: "utf8" });
  if (check.error || check.status !== 0) {
    console.error(
      "Error: `claude` CLI not found on PATH. Install Claude Code or run with --dry."
    );
    process.exit(2);
  }
}

// Run cases
const results = [];
for (const caseObj of cases) {
  process.stdout.write(`Running ${caseObj.id}... `);
  const r = runCase(caseObj);
  results.push(r);
  if (r.status === "PASS") {
    process.stdout.write(`PASS (score ${r.score ?? "-"})\n`);
  } else if (r.status === "DRY") {
    process.stdout.write("DRY\n");
  } else {
    process.stdout.write(`${r.status}\n`);
    for (const f of r.failures) process.stdout.write(`    - ${f}\n`);
  }
}

// Summary
console.log("\n--- Summary ---");
const cols = ["id", "status", "score"];
const widths = cols.map((c) =>
  Math.max(c.length, ...results.map((r) => String(r[c] ?? "-").length))
);
const row = (vals) =>
  vals.map((v, i) => String(v ?? "-").padEnd(widths[i])).join("  ");
console.log(row(cols));
console.log(widths.map((w) => "-".repeat(w)).join("  "));
for (const r of results) console.log(row(cols.map((c) => r[c])));

const failed = results.filter((r) => r.status === "FAIL" || r.status === "ERROR");
console.log(
  `\n${results.length - failed.length}/${results.length} passed${
    DRY_RUN ? " (dry-run)" : ""
  }`
);
process.exit(failed.length === 0 ? 0 : 1);
