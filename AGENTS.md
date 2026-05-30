# AGENTS.md — prompt-builder

Universal AI agent guidance for Claude Code, Codex, Cursor, Copilot, Gemini CLI, and any other AI coding agent working in this repository.

---

## What This Plugin Is

`prompt-builder` (v0.1.2, Apache-2.0) is a Prompt Policy Engine that classifies, diagnoses, rewrites, and scores prompts calibrated to model tier and deployment context. It ships as a single stateless skill invokable by humans (slash commands) or machines (labeled key/value inputs). No MCP server, no runtime dependencies — the skill is pure Markdown executed by the host coding agent's LLM.

---

## Commands

Six slash commands are thin wrappers over the skill. Humans use these; agents invoke the skill directly.

| Command | Purpose |
|---------|---------|
| `/prompt-builder:optimize [prompt or path]` | Full end-to-end optimization — diagnosis, rewrite, score |
| `/prompt-builder:score [prompt or path]` | Score-only; returns dimensional breakdown and diagnosis |
| `/prompt-builder:compare <a> <b>` | A/B two prompt versions with regression detection |
| `/prompt-builder:save <id>` | Persist the last optimized prompt to the project library |
| `/prompt-builder:list [filter]` | List saved prompts and their latest scores |
| `/prompt-builder:route` | Router — dispatches to the right subcommand based on intent |

---

## Programmatic Use (Codex / Agent Integration)

Agents invoke the skill directly using labeled key/value inputs. The skill detects the structured invocation and returns a machine-parseable response. Full contract: `skills/prompt-builder/references/caller-contract.md`.

### Input Fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `raw_prompt` | string | **required** | Prompt text or a file path to read |
| `model_tier` | `T1` \| `T2` \| `T3` | `T2` | T1 = frontier, T2 = mid, T3 = small/fast |
| `deployment` | `interactive` \| `backend` \| `rag_pipeline` \| `agent` \| `plugin` \| `eval_judge` \| `personal_mobile` | `interactive` | Where the optimized prompt runs |
| `output_consumer` | `human` \| `llm` \| `api` \| `pipeline_stage` | inferred from deployment | Who reads the prompt's output |
| `risk_level` | `low` \| `medium` \| `high` | `medium` | Raises thresholds and guardrails at `high` |
| `prior_version` | string | none | Previous prompt text or path — triggers regression detection |
| `prior_score` | string | none | Previous score e.g. `20/25 [A:4\|C:4\|Cs:4\|D:4\|Cp:4]` |
| `feedback` | string | none | What went wrong with the prior version |
| `source_material` | string | none | Grounding text or path for RAG/data tasks |
| `mode` | `personal` \| `production` \| `hybrid` | inferred | Operating mode override |
| `skip_scoring` | boolean | `false` | Return prompt only, no score block |
| `target_api_supports_structured_outputs` | boolean | `false` | Omit inline schema instructions when API enforces them |

### Output Section Labels

The skill returns sections in this fixed order. Parse by label — labels are uppercase with a colon, no Markdown headers.

| Label | Present when | Content |
|-------|-------------|---------|
| `CONFIG:` | always | `v{n} \| {tier} \| {deployment} \| {type} \| SCORE: {total}/25 [A:n\|C:n\|Cs:n\|D:n\|Cp:n]` |
| `DIAGNOSIS:` | always | Top 3 issues in the original prompt |
| `OPTIMIZED_PROMPT:` | always | Copy-ready rewrite in the consumer-appropriate format |
| `ASSUMPTIONS:` | always | `[ASSUMED: ...]` items or `"none"` |
| `RISK_NOTES:` | always | Integration risks, limitations, ambiguity warnings, or `"none"` |
| `TEMPERATURE_HINT:` | always | Single float — 0.0–0.1 extraction/RAG, 0.3 general, 0.5–0.7 creative |
| `KEY_CHANGES:` | only when `prior_version` provided | What changed from prior version |
| `REGRESSION_NOTES:` | only when a dimension dropped with `prior_version` | Which dimension dropped and by how much |

On error: `CONFIG:` with `SCORE: 0/25 [ERROR]` and `RISK_NOTES:` explaining the blocker.

### Minimal Invocation Example

```
Use the prompt-builder skill.

raw_prompt: You are a helpful assistant. Analyze the CSV and tell me what's interesting.
model_tier: T2
deployment: plugin
output_consumer: human
risk_level: medium
```

### Parsing the Response

Extract `OPTIMIZED_PROMPT:` content between that label and the next section label. Extract the score from the `CONFIG:` line using the pattern `SCORE: (\d+)/25`. The contract is versioned — `v{n}` in `CONFIG:` tracks the skill version; callers should store it alongside persisted prompts.

### Library Storage

Saved prompts accumulate in `.prompt-builder/prompts/<id>/` in the consuming project (`v1.md` + `v1.meta.json`, never overwritten). Agents may write here directly using the `/prompt-builder:save` command.

---

## Skill Identity

- **Skill name / invocation key:** `prompt-builder`
- **Plugin name:** `prompt-builder`
- **Version:** `0.1.2`
- **Plugin manifest:** `.claude-plugin/plugin.json`
- **Skill engine:** `skills/prompt-builder/SKILL.md`
- **Caller contract:** `skills/prompt-builder/references/caller-contract.md`
