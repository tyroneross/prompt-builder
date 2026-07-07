# Caller Contract

This file defines the input/output contract for agents, tools, and slash commands that
invoke the `prompt-builder` skill programmatically. Read this when the caller is not
a human (or when a human explicitly asks for a machine-parseable response).

Humans invoking the skill in chat do not need this contract — they get the same
optimization work, just presented conversationally.

---

## When to Apply the Strict Contract

Apply the strict contract when:

- The skill is invoked from another agent (build-loop phase, research agent, custom agent)
- The skill is invoked from a slash command that will forward output to tooling
- The caller explicitly asks for "machine output", "structured result", or "callable format"
- The caller provides inputs as labeled key/value pairs (`raw_prompt: ...`, `model_tier: ...`)

Otherwise, present the same information conversationally.

---

## Input Schema

Callers provide inputs as labeled lines in the invoking prompt. Unknown fields are ignored.
Missing fields fall back to defaults.

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `raw_prompt` | string | **required** | The prompt to optimize. Can be a file path; if so, read the file. |
| `model_tier` | `T1` \| `T2` \| `T3` | `T2` | Capability of the model that will execute the optimized prompt. |
| `reasoning_mode` | `reasoning` \| `standard` | `standard` | Is the target a reasoning-native model (o3/o4, GPT-5, Claude extended-thinking, DeepSeek-R1)? When `reasoning`, Step 4 suppresses CoT + few-shot and recommends controlling depth via the reasoning-effort / thinking-budget parameter. |
| `deployment` | `interactive` \| `backend` \| `rag_pipeline` \| `agent` \| `plugin` \| `eval_judge` \| `personal_mobile` | `interactive` | Where the optimized prompt runs. |
| `output_consumer` | `human` \| `llm` \| `api` \| `pipeline_stage` | inferred from deployment | Who/what reads the output of the optimized prompt. |
| `risk_level` | `low` \| `medium` \| `high` | `medium` | How costly a bad output is. Raises scoring thresholds and enhancements when `high`. |
| `prior_version` | string | none | Previous prompt text (or path) to iterate from. Triggers Step 7. |
| `prior_score` | string | none | Previous score in the form `20/25 [A:4|C:4|Cs:4|D:4|Cp:4]`. Used for regression checks. |
| `feedback` | string | none | What went wrong with the prior version. Focuses the iteration. |
| `source_material` | string | none | Grounding material for RAG/data tasks. Can be a file path. |
| `mode` | `personal` \| `production` \| `hybrid` | inferred from deployment | Operating mode override. |
| `skip_scoring` | boolean | `false` | If true, return optimized prompt only (no score block). Used for rapid drafts. |
| `target_api_supports_structured_outputs` | boolean | `false` | If true, the runtime supports constrained decoding (OpenAI `json_schema` strict, Anthropic tool-use, Pydantic/Zod, or GBNF). The prompt then describes fields but omits inline "return only JSON" (prompt-schema is the fallback only when this is false). See Step 2.5. |

---

## Output Schema

Return these sections in this order. Use the exact labels — downstream parsers rely on them.

```
CONFIG: v{n} | {tier} | {deployment} | {type} | SCORE: {total}/25 [A:n|C:n|Cs:n|D:n|Cp:n]

DIAGNOSIS:
- Issue 1
- Issue 2
- Issue 3
(omit this section when no prior_version is provided)

OPTIMIZED_PROMPT:
<copy-ready block in the consumer-appropriate format>

ASSUMPTIONS:
- [ASSUMED: ...]
(or "none")

RISK_NOTES:
- Limitation / integration risk / ambiguity warning
(or "none")

TEMPERATURE_HINT: {number}
(single line: 0.0 for data extraction, 0.1 for RAG/data pipelines, 0.3 for general, 0.5-0.7 for creative, 0.7+ for brainstorming)

KEY_CHANGES:
- Bullet describing what changed from prior version
(omit when no prior_version)

REGRESSION_NOTES:
- Dimension X dropped from Y to Z
(omit when no regression or no prior_version)
```

**Format rules**:
- Section labels are uppercase with a colon. No markdown headers.
- `OPTIMIZED_PROMPT:` content follows the consumer-appropriate format from SKILL.md (XML for Claude, JSON/Markdown for APIs, plain text for voice).
- Never wrap the whole output in a code fence. Individual sections may contain fenced blocks.
- Omit optional sections rather than writing `(not applicable)`.

---

## Invocation Examples

### Example 1: Build-loop phase calling the skill

**Caller's invoking prompt**:
```
Use the prompt-builder skill.

raw_prompt: You are a helpful assistant. Analyze the uploaded CSV and tell me what's interesting.
model_tier: T2
deployment: plugin
output_consumer: human
risk_level: medium
```

**Expected skill response** (abridged):
```
CONFIG: v1.0 | T2 | plugin | Instructional+Analytical | SCORE: 21/25 [A:4|C:5|Cs:4|D:4|Cp:4]

DIAGNOSIS:
- Ambiguity: "what's interesting" is not a deliverable
- Missing constraints: no null/type handling, no output schema
- Missing context: no column descriptions, no audience

OPTIMIZED_PROMPT:
...

ASSUMPTIONS:
- [ASSUMED: audience is non-technical based on "tell me"]

RISK_NOTES:
- Caller should provide CSV column descriptions at runtime; without them, the assistant will refuse non-obvious inferences.

TEMPERATURE_HINT: 0.2
```

### Example 2: Iteration with regression protection

**Caller's invoking prompt**:
```
Use the prompt-builder skill.

raw_prompt: <new draft>
prior_version: <old draft>
prior_score: 22/25 [A:5|C:4|Cs:5|D:4|Cp:4]
feedback: users complained the output was too long
model_tier: T1
deployment: interactive
```

**Expected skill response**:
- CONFIG with incremented version
- DIAGNOSIS of the new draft
- OPTIMIZED_PROMPT
- KEY_CHANGES bulleted
- REGRESSION_NOTES if any dimension dropped ≥2 — and the skill refuses to deliver without asking for acknowledgment

### Example 3: Slash command

The `/prompt-builder:optimize` command parses user arguments into the contract
and invokes the skill. The command file is a thin wrapper; the skill does all the work.

---

## Error Conditions

If the input cannot be processed, return a CONFIG line with `SCORE: 0/25 [ERROR]` followed by
`RISK_NOTES:` explaining the blocker. Examples:

- `raw_prompt` missing → `RISK_NOTES: - No raw_prompt provided. Cannot optimize.`
- `prior_version` provided but unreadable → `RISK_NOTES: - prior_version path not readable. Skipping iteration step; treating as new optimization.`
- Conflicting inputs (e.g., `deployment: personal_mobile` + `target_api_supports_structured_outputs: true`) → `RISK_NOTES: - personal_mobile does not use structured outputs; ignoring flag.`

Always deliver what you can. Never silently drop sections — explicitly note omissions.

---

## Integration Patterns

### Pattern A: Agent calls the skill mid-workflow
The agent is working on a larger task, needs to produce a sub-prompt for a downstream LLM call,
and delegates that work to this skill. The agent parses the `OPTIMIZED_PROMPT` block out of the
response and uses it verbatim.

### Pattern B: CI/eval pipeline regression-tests prompts
The eval runner (`evals/run-evals.mjs`) invokes the skill via `claude -p` for each case,
parses CONFIG to extract the score, and asserts thresholds. Failures block a release.

### Pattern C: Slash command for human authoring
A human invokes `/prompt-builder:optimize`. The command collects inputs interactively,
runs the skill, and shows the full output. If the user is satisfied, they run
`/prompt-builder:save <id>` to persist the result to `.prompt-builder/prompts/<id>/`.

### Pattern D: Product layer wrapping the skill
A product (e.g., Atomize, FloDoro) wraps the skill behind a service endpoint. The endpoint
parses user inputs into the contract, invokes Claude Code with the skill loaded, and returns
the parsed response as JSON. This makes the skill a reusable microservice without having to
reimplement the prompt engine.

---

## Versioning

The skill version is reflected in CONFIG's `v{n}`. When iterating (Step 7) the caller should:

1. Keep the `prompt_id` stable across versions (the optimized prompt's identity).
2. Increment the `v{n}` on each meaningful change.
3. Persist the CONFIG + OPTIMIZED_PROMPT + meta to the library (e.g., `.prompt-builder/prompts/<id>/v2.md`).
4. Replay the meta on the next iteration via `prior_version` + `prior_score`.

This gives callers a deterministic iteration loop without the skill needing to maintain state.
