# CLAUDE.md — pretty-prompts plugin notes

Instructions for Claude Code when working *on* this plugin (editing the skill, adding examples, extending commands, running evals).

## Repo structure

```
pretty-prompts/
├── .claude-plugin/plugin.json          # Plugin manifest (name: pretty-prompts)
├── skills/prompt-optimizer/            # The single skill. Do not rename — callers depend on this name.
│   ├── SKILL.md                         # Core engine. Keep ≤~400 lines; push detail to references/.
│   ├── references/                      # Progressive disclosure. Load only when relevant.
│   │   ├── caller-contract.md          # Input/output schema for agent/tool callers
│   │   ├── deployment-modules.md       # Per-deployment rules
│   │   ├── tier-calibration.md         # T1/T2/T3 tables per 6-Part
│   │   ├── type-rules.md               # Rules A–H per function type
│   │   └── scoring.md                  # 5-dim rubric, iteration, regression rules
│   └── examples/                        # Worked examples. Add one per new deployment type.
├── commands/                            # Thin slash-command wrappers (/pretty-prompts:*)
├── evals/
│   ├── evals.json                      # Regression cases
│   └── run-evals.mjs                   # Zero-dep runner (spawns `claude -p`)
├── README.md                            # User-facing
└── CLAUDE.md                            # This file
```

## Key invariants

1. **The skill name is `prompt-optimizer`**. The plugin name is `pretty-prompts`. Callers (agents, tools) invoke `Skill: prompt-optimizer`. Slash commands use the plugin prefix `/pretty-prompts:<cmd>`.

2. **Caller contract is a versioned API**. Section labels (`CONFIG:`, `DIAGNOSIS:`, `OPTIMIZED_PROMPT:`, `ASSUMPTIONS:`, `RISK_NOTES:`, `TEMPERATURE_HINT:`, `KEY_CHANGES:`, `REGRESSION_NOTES:`) are uppercase + colon. Downstream parsers (eval runner, agent integrations) match on these literals. Never change a section label without bumping the skill version and updating all examples + evals.

3. **Rule priority is load-bearing**. P1 Safety > P2 Deployment > P3 Type > P4 Format > P5 General > P6 Compression. When in doubt, surface the conflict in `RISK_NOTES`.

4. **No LLM API calls from scripts**. Per user preference: Claude Code *is* the LLM. `run-evals.mjs` spawns `claude -p`; it does not call `anthropic` / `openai` libraries. Keep it that way.

5. **Zero runtime dependencies**. The plugin is pure Markdown + JSON + Node stdlib. Do not add `package.json` with deps.

## When editing SKILL.md

- Keep it scannable. Detail goes in `references/`.
- Any change to output section labels → update **every** example and eval case.
- Bump the version in the Changelog and in example CONFIG lines.
- Run evals in dry mode first to verify the invoking prompts still look right:
  ```bash
  node evals/run-evals.mjs --dry
  ```

## When adding a new deployment type

1. Add a section to `references/deployment-modules.md`.
2. Add a line to the deployment table in `SKILL.md` Step 0.
3. Add a worked example under `examples/<deployment>-<tier>.md`.
4. Add at least one eval case covering it.
5. Update `README.md` deployment list.

## When adding an eval case

Required fields per case:
- `id` (kebab-case, unique)
- `description`
- `inputs` (caller-contract-style key/value)
- At least one assertion: `required_sections`, `must_contain`, `must_contain_case_insensitive`, `must_not_contain`, `must_not_contain_case_insensitive`, `min_score`, or `expected_type_substring`

Prefer case-insensitive matches for phrases that could appear in multiple styles. Prefer `required_sections` over exact-case `must_contain` for structural checks.

## Running evals

```bash
# Dry-run (prints invoking prompts, no LLM calls)
node evals/run-evals.mjs --dry

# Full run — requires `claude` CLI on PATH
node evals/run-evals.mjs

# Single case
node evals/run-evals.mjs reranker-t3
```

Target: ≥ 8/10 passing on first run after any skill edit. Iterate until ≥ 9/10. If a case is persistently flaky, revise the assertion list — the skill output is non-deterministic, so assertions should match on structural signals, not exact prose.

## Integration with other plugins

- **build-loop**: Can invoke `prompt-optimizer` inside its Phase 4 (code-gen) to optimize sub-prompts used for specialist agents. Memory note flagged: "Do not wire in yet" until user confirms.
- **bookmark**: No integration needed. `.pretty-prompts/` library is independent of `.bookmark/`.
- **ibr**: No integration. IBR is for UI validation; pretty-prompts is for prompt authoring.

## Known limitations

- The skill scores *itself*. There is no external ground truth for "this prompt would score 23/25". The rubric is rubric-consistent but not empirically calibrated — two different calls may score the same prompt 1–2 points apart on any dimension. Eval `min_score` thresholds are set conservatively to absorb this variance.
- `claude -p` output is sensitive to Claude Code session state. Running evals in a fresh session is recommended for reproducibility.
- The library (`.pretty-prompts/`) has no built-in garbage collection. Old versions accumulate — prune manually.

## Future work (deferred)

- `/pretty-prompts:diff <id> <v1> <v2>` — textual diff of saved versions
- A `memory/lessons.md` auto-extraction pattern (when users repeatedly fix the same class of issue)
- A `--json` output mode on the eval runner for CI integrations
- Integration with build-loop once user greenlights
