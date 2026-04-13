# Deployment Modules

Read this file when DEPLOYMENT ≠ interactive. Each module specifies requirements
that override general optimization rules (Rule Priority P1).

---

## Backend Prompt Improvement (DEPLOYMENT = backend)

The engine improves a user's raw prompt before it reaches the execution model.

**Input**: Raw user prompt + target model tier + task context
**Output**: Optimized prompt ready for execution model (no meta-commentary)

**Rules**:
- Preserve user intent exactly. Do not change the task.
- Add structure, constraints, and format the user omitted.
- If ambiguous: select most likely interpretation, tag `[ASSUMED: interpretation]`.
- Match depth to target model tier:
  - T1 target → light touch (add constraints, format)
  - T2 target → moderate (add role, constraints, format, edge cases)
  - T3 target → full rewrite (all 6 parts, examples, explicit steps)
- Never add domain knowledge the user didn't provide or imply.

**Task spec must include**: (a) input prompt format, (b) what the improved prompt achieves,
(c) what the downstream model does with it.

**Context must include**: downstream model's tier, task type, known failure modes.

---

## RAG Pipeline (DEPLOYMENT = rag_pipeline)

Builds prompts for three pipeline stages. Each stage has its own format requirement.

### Stage 1: Query Expansion
- **Purpose**: Rewrite user query for embedding similarity
- **Output format**: Plain text (no formatting tokens — they pollute embeddings)
- **Rules**: Expand with synonyms and related concepts. Do not change intent.

### Stage 2: Reranker
- **Purpose**: Score retrieved passages against query intent
- **Output format**: JSON `[{id, score, rationale}]`
- **Rules**:
  - Extract query intent BEFORE scoring (explicit step)
  - Score each passage independently (position-blind)
  - Include calibration anchors (scored examples at 2, 5, 8 on 0-10 scale)
  - T3: Add explicit error handling: "If no passages score above 4, return `{no_relevant_results: true}`"

### Stage 3: Synthesis
- **Purpose**: Generate answer from top-ranked passages
- **Output format**: Per consumer (plain text for human, JSON for next stage)
- **Rules**:
  - Cite passage IDs for every claim
  - Flag conflicts between passages
  - Refuse to answer beyond source content

**Tier calibration for all stages**:
- T1: Single prompt per stage. Model handles edge cases.
- T2: Prompt per stage + 1 example per stage.
- T3: Prompt per stage + 2-3 examples per stage + explicit error handling per stage.

---

## Agent / Multi-Step (DEPLOYMENT = agent)

Builds prompts with state management and tool orchestration.

**Required components**:

| Component | Description |
|-----------|-------------|
| STATE SCHEMA | JSON schema of tracked variables |
| TOOL REGISTRY | Name, description, input/output schema per tool |
| TRANSITION RULES | "When [condition], use [tool] with [parameters]" |
| TERMINATION | "Stop when [condition]. Return [final output schema]." |
| FAILURE HANDLING | "If [tool] fails: retry once → still fails → [escalation]" |

**Tier calibration**:
- T1: Describe tools and goals. Model plans execution.
- T2: Tool registry + transition rules. Model handles sequencing.
- T3: Full state machine with numbered transitions:
  "Step N: Check [condition]. If true → call [tool]([params]).
  Store result in [state.field]. Proceed to Step N+1."

---

## Plugin / Data Analysis (DEPLOYMENT = plugin)

Builds prompts for embedded data transformation and analysis.

**Required components**:

| Component | Description |
|-----------|-------------|
| INPUT SCHEMA | Field names, types, nullable, expected ranges |
| TRANSFORMATION SPEC | Operation per field or record |
| OUTPUT SCHEMA | Expected structure post-transformation |
| EDGE CASE TABLE | See below |

**Edge case handling**:

| Condition | Options |
|-----------|---------|
| Null value | skip · default:X · flag |
| Out of range | clamp:min,max · flag · reject |
| Type mismatch | coerce:type · flag · reject |
| Duplicate key | keep:first · keep:last · merge:rule |

**Tier calibration**:
- T1: Describe transformation logic + schema.
- T2: Schema + edge case table + 1 worked example.
- T3: Schema + edge case table + 2-3 examples + explicit per-row step sequence.

---

## Eval Judge (DEPLOYMENT = eval_judge)

Builds prompts for scoring or comparing LLM outputs. These are external evaluation
prompts — not embedded in the production prompt being evaluated.

**Required components**:
- Scoring rubric with criteria definitions
- Calibration examples (scored + rationale at each rubric level)
- Output schema: JSON with per-criterion scores
- Handling for edge cases: ties, partial credit, missing fields

**Tier calibration**:
- T1: Describe criteria and scale. Model applies consistently.
- T2: Criteria + 3-point calibration examples (low/mid/high).
- T3: Criteria + 5-point calibration + scored example per level + explicit tiebreaker rules.

**Key constraint**: Judge prompts must evaluate outputs independently.
Do not allow comparison-by-position (first vs. second = bias).

---

## Personal Mobile (DEPLOYMENT = personal_mobile)

Builds prompts for on-device, voice-first, privacy-sensitive use on iOS/Android.

**Non-negotiable principles**:
- **Privacy**: Never infer or store personal identifiers (names, exact locations,
  health data) unless explicitly provided and necessary.
- **Battery-aware**: Favor simple single-pass prompts. No complex chaining.
- **Voice-friendly**: Short sentences (<20 words). No jargon. Clear cadence.
- **Platform-native**: Output works in Notes, Calendar, Reminders, Shortcuts
  without extra parsing.

**Step 0 override**: Before classification, set personal context:
- Location (user-provided or system-injected)
- Time (current, auto-filled)
- Family/household context (if relevant and explicitly provided)
- Privacy level (default: high)
State all inferences for user correction.

**Output format hierarchy for personal_mobile**:
1. Plain text (default — covers ~80% of mobile use, works with voice)
2. Light Markdown (Notes app — use `##` headers and `-` bullets only)
3. JSON (only if output feeds a Shortcuts action or another agent)

**Role calibration**: Warm, concise, specific to user's context.
Avoid formal titles. "You are a helpful assistant who knows [location]
and [relevant domain]."

**Constraints always include**:
- Current time/day context (system-injected)
- Privacy guard for sensitive personal data
- Travel/distance limits if location-based
- Safety requirements for physical activities
- Cost inclusion if relevant

**Validation adds**:
- Voice test: Would Siri read this naturally?
- Notes test: Fits in a glance without scrolling?
- Action test: Can user immediately act on it?
- Privacy test: No unnecessary data inference?

**Enhancement rules**:
- Never add CoT — slows voice response and adds cognitive load.
- One example max, only if task is ambiguous.
- One safety reminder for physical activities.
