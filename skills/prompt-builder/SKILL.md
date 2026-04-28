---
name: prompt-builder
description: Use to create, rewrite, score, or A/B compare prompts calibrated to model tier (frontier/mid/small) and deployment (RAG, agent, eval judge). Triggers on "optimize this prompt", "system prompt". Callable by other agents.
---

# Prompt Optimization Engine v3.1

Transform input prompts into production-grade prompts calibrated for the target model tier
and deployment context. Preserve original intent. Maximize accuracy and reliability.
Minimize token cost after correctness is confirmed.

This is a **prompt runtime system** — it optimizes, scores, and iterates on prompts,
not just compiles them once. It is designed to be invoked by humans (via slash commands)
and by other agents/tools (via the caller contract).

## When to read reference files

| Situation | Read |
|-----------|------|
| Another agent/tool is invoking this skill programmatically | `references/caller-contract.md` |
| Any deployment other than `interactive` | `references/deployment-modules.md` |
| Need detailed tier calibration tables | `references/tier-calibration.md` |
| Need type-specific optimization rules | `references/type-rules.md` |
| Scoring, comparing, or iterating on prompts | `references/scoring.md` |

For most interactive requests, the core process below is sufficient. Reference files add depth
for specialized deployments, iteration workflows, and programmatic integration.

---

## Rule Priority

When instructions conflict, resolve by priority (highest wins):

```
P1: SAFETY/PRIVACY/SYSTEM LIMITS
P2: DEPLOYMENT MODULE requirements (format, schema, pipeline integration)
P3: TYPE-SPECIFIC rules (reasoning approach, domain constraints)
P4: OUTPUT FORMAT selection (Step 2.5)
P5: GENERAL optimization rules (6-Part Stack defaults)
P6: COMPRESSION / token reduction

Resolution:
- P1 beats everything. Never compromise on privacy or safety to save tokens.
- P2 overrides P3–P6 (pipeline contracts are non-negotiable)
- P3 overrides P4–P6 (domain accuracy beats formatting preference)
- P4 overrides P5–P6 (explicit format choice beats default)
- P5 overrides P6 (correctness before compression)
- Within same priority: most specific rule wins
```

This resolves the case where a deployment module specifies JSON output but Step 2.5
would default to plain text — the deployment module wins. And where compression
would remove a useful constraint — correctness wins.

---

## Operating Modes

Three modes. The policy pack shifts defaults but the same engine runs all three.

| Mode | When to use | Defaults |
|------|-------------|----------|
| **personal** | Voice, reminders, family/hobby planning, lightweight writing | Plain text, short, privacy-first, no heavy self-check |
| **production** | App prompts, retrieval, agents, tools, codegen, eval, data pipelines | Structured outputs, schema enforcement, versioning, explicit ambiguity handling |
| **hybrid** | Personal-facing UX with production backend (family planner app, coaching app) | Personal UX on front end, production controls on back end |

The deployment type (Step 0) usually determines the mode: `personal_mobile` → personal;
`backend`/`rag_pipeline`/`agent`/`plugin`/`eval_judge` → production; a product feature
that wraps production infra in consumer UX → hybrid.

---

## Process

### STEP 0: DETECT CONFIGURATION

Two parameters govern optimization. Read from caller input; infer if absent.

**MODEL_TIER** — capability of the model that will *execute* the optimized prompt:
- **T1**: Frontier (Opus, GPT-4o+, Gemini Ultra) — handles abstraction, minimal scaffolding
- **T2**: Mid-tier (Sonnet, GPT-4o-mini, Gemini Flash) — needs structured guidance
- **T3**: Small/Fast (Haiku, GPT-3.5, local <13B) — needs rigid pipeline, explicit examples
- Default: T2

**DEPLOYMENT** — where the optimized prompt runs:
- **interactive**: Human-facing chat (Claude.ai, ChatGPT, etc.)
- **backend**: Prompt improvement layer before query execution
- **rag_pipeline**: Retrieval → reranking → synthesis chain
- **agent**: Multi-step tool use with state tracking
- **plugin**: Embedded in product (data analysis, editing, search)
- **eval_judge**: Scoring or comparing outputs (external tooling)
- **personal_mobile**: On-device, voice-first, privacy-sensitive (iOS/Android agents)
- Default: interactive

State inferences explicitly: `Inferred MODEL_TIER: T2, DEPLOYMENT: interactive. Correct me if wrong.`

If `DEPLOYMENT ≠ interactive`, read `references/deployment-modules.md` for that module's
specific requirements before proceeding.

If invoked programmatically, read `references/caller-contract.md` for the full input/output
schema.

---

### STEP 1: CLASSIFY

Identify along three axes. Pick one primary function; note secondary if hybrid.

**By Function**

| Type | Risk |
|------|------|
| Instructional (write, code, analyze) | Vague output, hallucination |
| Transformational (rewrite, summarize, extract) | Adds new info silently |
| Analytical (reason, compare, evaluate) | Logical gaps, weak structure |
| Generative (create novel content) | Off-tone, generic |
| RAG (use provided sources) | Fabrication, source drift |
| Agent/Tooling (multi-step + tool use) | State loss, incorrect actions |
| Evaluation/Judge (score or compare) | Inconsistent scoring |
| Data Pipeline (transform, clean, aggregate) | Schema drift, silent data loss |
| Reranker (score relevance of retrieved items) | Calibration drift, position bias |

**By Context Dependency**: Closed | Open | Grounded | Interactive
**By Output Constraint**: Free-form | Structured | Strict (schema-enforced)

---

### STEP 2: DIAGNOSE

Rank top 3 issues by severity:

- Ambiguity (unclear task/intent)
- Missing constraints (no length, tone, behavior limits)
- Missing context (insufficient background)
- Format issues (no explicit output structure)
- Hallucination risk (open-ended + no grounding)
- Tier mismatch (prompt complexity exceeds model capability)
- Pipeline integration gap (output doesn't connect to downstream consumer)
- Privacy risk (personal_mobile: data exposure, location inference)

---

### STEP 2.5: SELECT OUTPUT FORMAT

**Default**: plain text (works for human reading, voice, notes).

**Override hierarchy** (aligns with Rule Priority):
1. If DEPLOYMENT module specifies format for this stage → use that (P2)
2. If output feeds another LLM, agent, or API → JSON with schema (P2)
3. If human consumption benefits from scannability → Markdown
4. If voice-first or simple command → plain text

For pipeline deployments (rag_pipeline, agent, plugin, backend): the deployment module's
format requirement is authoritative. Do not default to plain text when a downstream
stage needs JSON.

**Note on structured outputs at the API level**: When a caller will use structured-output
features of the target model's API (OpenAI JSON mode, Anthropic tool-use schemas, etc.),
the schema enforcement happens at the API boundary, not inside the prompt. In that case,
the prompt should *describe* the desired fields clearly but does not need to restate
"return only JSON" — the API rejects non-conforming output. Surface this in `RISK_NOTES`
when the caller's downstream model supports it.

---

### STEP 3: OPTIMIZE

Build using the **6-Part Stack**. For detailed tier calibration per part,
see `references/tier-calibration.md`. Summary below.

#### PART 1: ROLE
- T1: Concise (1-2 sentences). Trust model to derive expertise.
- T2: Role + domain + one lens. State what model IS and IS NOT.
- T3: Explicit persona with boundaries and 2-3 behavioral anchors.
- For pipeline deployments: role includes system position ("You are the reranking stage...").

#### PART 2: TASK
- All tiers: Single objective. Action verb + specific deliverable.
- T1: State goal. Model decomposes.
- T2: Goal + 2-3 sub-steps.
- T3: Numbered sequential steps. One action per step.
- See `references/deployment-modules.md` for deployment-specific task requirements.

#### PART 3: CONSTRAINTS
- T1: 3-5 high-impact. Model generalizes.
- T2: 5-8 with domain edge cases.
- T3: Exhaustive. Every rule is "If X, then Y." Every constraint testable.

**Universal constraints** (always apply by type):
- Transformational: "Do not add information not present in the source."
- RAG: "If not in sources, say 'not found in sources.' Do not fabricate."
- Data Pipeline: "Do not silently drop rows or coerce types without logging."
- Reranker: "Score each item independently. Position in list must not influence score."

**Anti-hallucination by tier**:
- T1: "Flag uncertain claims as [INFERRED]. Prefer omission over fabrication."
- T2: "State uncertainty explicitly. Do not present inferences as facts. Tag [INFERRED]."
- T3: "ONLY state facts from provided sources. Cite source for EVERY claim. If no source: 'No source found.' Never guess."

#### PART 4: CONTEXT
- T1: Essential only. Note non-obvious assumptions.
- T2: Essential + domain definitions. State assumptions explicitly.
- T3: Full context. Define every term. State ALL assumptions.

#### PART 5: OUTPUT FORMAT
- Determined by Step 2.5 (respecting override hierarchy).
- T1: Describe structure.
- T2: Template or schema + one correct example.
- T3: Exact schema + 2-3 correct examples + 1 error example with correction.
- For JSON outputs (when API-level schema enforcement is NOT available):
  "Return ONLY valid JSON. No preamble, no fences, no text outside structure."

#### PART 6: ACCEPTANCE CRITERIA
The contract the output must meet. Tier-specific strictness:

| Type | T1 | T2 | T3 |
|------|----|----|-----|
| Factual | Source-supported or [INFERRED] | All claims traceable | Every claim explicitly sourced; zero fabrication |
| Structured | Matches schema | Schema exact + valid format | Schema exact + example-validated |
| Strategy | Rec first, MECE, assumptions stated | + actionable next steps | + explicit owners per step |
| Transformational | Meaning preserved | + no added info verified | + length in specified range |
| RAG | Claims traceable to passages | + conflicts noted | + gaps flagged with coverage % |
| Data Pipeline | Schema match, row count preserved | + type coercion logged | + delta report on any changes |
| Reranker | Calibrated scores | + position-independent | + rationale per item |

---

### STEP 4: ENHANCE

Add only when beneficial. Read `references/type-rules.md` for type-specific rules.

| Enhancement | T1 | T2 | T3 |
|-------------|----|----|-----|
| Few-shot examples | If ambiguous | 1-2 (often needed) | 2-3 (required) |
| Edge cases | Only non-obvious | Domain-specific | Exhaustive + error handling |
| Refusal conditions | Brief | Explicit with fallback | Scripted exact responses |
| Chain-of-thought | Only if analytical + non-reasoning model | Short worked example | Do not use. Replace with numbered steps. |
| Scoring anchors | For eval/reranker | Required with 3-point scale | Required with 5-point + examples |
| State tracking | For agent tasks | Required + state schema | Required + state machine |

**CoT note**: Optimal CoT length decreases with model size. Reasoning-class models
(o3/o4, extended thinking) gain <3% from CoT with 20-80% time overhead. T3 models
degrade with long reasoning chains. For T3: explicit stepwise instructions, not CoT.

---

### STEP 5: VALIDATE

| Check | Pass Criteria |
|-------|--------------|
| Unambiguous task | Someone unfamiliar with the project could execute correctly |
| Hallucination minimized | Grounding + constraints + refusal conditions present |
| Output structure explicit | No interpretation needed |
| Low variance | Two model instances produce structurally similar outputs |
| Tier-appropriate | Complexity matches MODEL_TIER |
| Pipeline integrated | Output format matches downstream consumer's input |
| Type rules applied | Per `references/type-rules.md` |
| Format matches consumer | Per Step 2.5 + override hierarchy |
| Token-efficient | No redundancy after correctness confirmed |

**Tier-specific validation behavior:**
- T1/T2: Model runs self-check internally before output.
- T3: Self-check is for the deploying engineer to verify at design time,
  not for the model to execute at runtime. Omit self-check from T3 prompts.

---

### STEP 6: SCORE

Read `references/scoring.md` for the full rubric and iteration contracts.

Score the optimized prompt on 5 dimensions (1-5 each):

| Dimension | What it measures |
|-----------|-----------------|
| **Accuracy Robustness** | Anti-hallucination strength, source grounding, refusal conditions |
| **Clarity** | Unambiguous task, explicit deliverable, no interpretation needed |
| **Constraint Strength** | Testable constraints, edge cases covered, tier-appropriate depth |
| **Output Determinism** | Schema/format enforced, low variance between runs |
| **Completeness** | All 6 parts present, deployment integration, acceptance criteria defined |

**Score: [total]/25** — the dimensional breakdown matters more than the total.
Any dimension at 2 or below is a blocker that must be fixed before delivery.

Include the score in the configuration header of the output:
`# CONFIG: v1.0 | T2 | backend | Instructional | SCORE: 21/25 [A:5|C:4|Cs:4|D:4|Cp:4]`

**When to skip scoring**: one-off interactive prompts where the user just wants the
optimized text. Always score when iterating, when deploying to production, or when
invoked by another agent/tool (the caller contract requires a score).

---

### STEP 7: ITERATE

If a previous version of this prompt exists (user or caller provides it):

1. **Diff**: Identify what changed between versions.
2. **Preserve wins**: List improvements from the previous version that must not regress.
3. **Fix regressions**: If the current version lost something the previous had, restore it.
4. **Score both**: Apply Step 6 to both versions. Report dimensional comparison.
5. **Version tag**: Increment version in the configuration header.

**Regression protection rule**: If the new version scores lower on ANY dimension
by ≥2 points, flag it as a hard regression. Do not deliver without explicit user
(or caller) acknowledgment.

For full iteration contracts, version tracking schema, and A/B comparison protocol,
read `references/scoring.md`.

---

## Output Contract

Deliver the optimized prompt as a single copy-ready block. When invoked programmatically,
follow `references/caller-contract.md` strictly.

**Required sections in the output** (order matters):

1. **CONFIG header**: `v{n} | {tier} | {deployment} | {type} | SCORE: {total}/25 [A:n|C:n|Cs:n|D:n|Cp:n]`
2. **DIAGNOSIS**: top 3 issues (only when optimizing an existing prompt)
3. **OPTIMIZED_PROMPT**: copy-ready block in consumer-appropriate format (see table below)
4. **ASSUMPTIONS**: `[ASSUMED: ...]` tags the caller should review (or empty)
5. **RISK_NOTES**: limitations the caller must surface (or empty)
6. **TEMPERATURE_HINT**: suggested runtime temperature (single line, e.g. `0.1` for data tasks, `0.3` for general, `0.7` for creative)
7. **KEY_CHANGES**: bullets (only when iterating from a prior version)
8. **REGRESSION_NOTES**: if any dim dropped ≥2 (only when iterating)

**Format of OPTIMIZED_PROMPT by target**:

| Target | Format |
|--------|--------|
| Interactive / human-facing | Markdown with section headers |
| Claude system prompt | XML tags (`<role>`, `<task>`, `<constraints>`, `<context>`, `<output_format>`, `<criteria>`) |
| OpenAI / GPT API | Markdown with clear sections, or JSON if API-level structured output is used |
| Pipeline stage | Plain text (embedding) or JSON (structured) |
| Personal mobile | Plain text (voice-friendly) or light Markdown (Notes app) |

**[T3 only]** Include a worked examples section inside OPTIMIZED_PROMPT.

---

## Limitation Awareness

Surface these honestly in `RISK_NOTES` when relevant:

- You cannot verify facts without sources or tools.
- You cannot fully recover missing user intent from a vague prompt — tag `[ASSUMED: ...]`.
- You cannot guarantee the new prompt is better without downstream evaluation.
- Over-compression can increase ambiguity — stop compressing when correctness is at risk.
- Simplify for weaker models instead of forcing full complexity through.
- Heavy self-checking inside T3 prompts degrades output; push validation to external tooling.

---

## References

| File | Contents |
|------|----------|
| `references/caller-contract.md` | Input/output schema and integration patterns for agents/tools |
| `references/deployment-modules.md` | Backend, RAG, agent, plugin, personal_mobile, eval_judge modules |
| `references/tier-calibration.md` | Detailed T1/T2/T3 tables for each part of the 6-Part Stack |
| `references/type-rules.md` | Rules A-H for each classified function type |
| `references/scoring.md` | Quality rubric, iteration contracts, version tracking, A/B protocol |

## Examples

Worked examples (read when a user asks for a prompt matching one of these shapes):

- `examples/rag-reranker-t3.md`
- `examples/personal-mobile-t3.md`
- `examples/backend-improver-t2.md`
- `examples/agent-tooling-t2.md`
- `examples/eval-judge-t2.md`

## Changelog

- v3.1 — Caller contract for agent/tool invocation. TEMPERATURE_HINT output field.
  Hybrid operating mode. Note on API-level structured outputs. Safety elevated to P1.
- v3.0 — Rule priority system. Iteration + scoring steps. Regression protection.
  Output format override hierarchy. Personal mobile deployment module.
  Self-check tiered by model capability. Progressive disclosure via references.
- v2.1 — MECE classification + tier/deployment framework merge.
- v2.0 — Model-tier adaptation, deployment modules, CoT calibration.
- v1.0 — Original 5-step process with 6-Part Stack.
