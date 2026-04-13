# Type-Specific Optimization Rules

Apply these rules during STEP 3 (OPTIMIZE) based on the function type classified in STEP 1.
These operate at Rule Priority P2 — they govern reasoning and domain constraints but
yield to deployment module requirements (P1) on format and schema.

---

## A. Instructional (write, code, analyze)

**Core rule**: Every instructional prompt needs a concrete deliverable and audience.

- Replace vague verbs with specific ones:
  - "Explain X" → "Summarize X in 2 sentences for a non-technical executive"
  - "Help with Y" → "Write a Python function that does Y, with docstring and type hints"
- Add explicit deliverable: "3 bullet points", "table with columns X, Y, Z", "200-word summary"
- Add audience: "for a board of directors", "for a junior developer", "for a parent with young kids"

**T3 addition**: Include the exact output template. Do not rely on the model to infer
appropriate formatting from an audience description.

---

## B. Transformational (rewrite, summarize, extract)

**Core rule**: Prevent silent information injection — the #1 failure mode.

- Always include: "Do not add new information not present in the source."
- Always include: "Preserve original meaning."
- For summarization: specify compression target
  - Word count: "Summarize in 50-75 words"
  - Ratio: "Compress to ~20% of original length"
  - Key points: "Extract the 3 most important claims"
- For extraction: specify exact fields to extract and format

**T3 addition**: Include a before/after example showing correct transformation
without information addition.

---

## C. Analytical (reason, compare, evaluate)

**Core rule**: Structure the reasoning framework before the analysis.

- Require MECE breakdown: "Organize analysis into mutually exclusive categories"
- Require explicit decision criteria before comparison: "Evaluate on: cost, time-to-implement, risk"
- Require assumption declaration: "State all assumptions before analysis begins"
- For comparisons: mandate a consistent evaluation framework across all options

**T2/T3 addition**: Provide the MECE categories or evaluation criteria in the prompt
rather than asking the model to derive them.

---

## D. RAG (use provided sources)

**Core rule**: Source grounding is non-negotiable. Every claim must be traceable.

- Enforce citation format: "Cite [Source ID] after each claim"
- Include refusal protocol: "If not in provided sources, say 'not found in sources'"
- For rerankers specifically:
  - Include 3-point calibration anchors (high/medium/low relevance examples)
  - Require query-intent extraction as an explicit first step
  - Require position-independence: "Score does not depend on order of passages"

**Conflict handling**: "If two sources contradict, present both with source IDs
and note the conflict. Do not resolve conflicts by choosing one source."

**T3 addition**: Include a complete scored example showing a query, 3 passages,
and correct scores with rationale.

---

## E. Agent/Tooling (multi-step + tool use)

**Core rule**: State management and failure handling are required, not optional.

- Include state tracking variables: what the agent remembers between steps
- Include tool usage rules: when to use each tool, with what parameters
- Include failure handling: "If [tool] fails, retry once, then return error state with context"
- Include termination conditions: when to stop and what to return

**T3 requirement**: Provide a full state machine or transition table.
Each transition: "Step N: Check [condition]. If true → call [tool]([params]).
Store result in [state.field]. If false → go to Step M."

---

## F. Evaluation/Judge (score or compare outputs)

**Core rule**: Scoring rubrics must be calibrated with examples, not just described.

- Attach rubric with criteria definitions (not just names)
- Include calibration examples: scored outputs with rationale at each rubric level
- Specify output schema: JSON with per-criterion scores
- Handle ties: explicit tiebreaker rule
- Handle partial credit: when does a 3 vs 4 apply?

**T3 requirement**: Include a fully scored example with written rationale for
each criterion score. This is the anchor the model uses to calibrate.

**Bias prevention**: "Evaluate each output independently. Do not let the order
of presentation influence scores. Do not let length correlate with quality
unless length is a stated criterion."

---

## G. Data Pipeline (transform, clean, aggregate)

**Core rule**: Data integrity constraints must be explicit. Silent data loss is the top risk.

- Include input schema: field names, types, nullable, expected ranges
- Include output schema: expected structure after transformation
- Include null handling: what to do with missing values (skip, default, flag)
- Include type coercion policy: what to do with wrong types
- Include row count check: "Output row count must equal input row count minus [exclusion rules]"
- Include logging: format for recording what was changed and why

**T3 requirement**: Include per-row step sequence.
"For each row: (1) validate types, (2) apply null rules, (3) transform fields,
(4) validate output schema, (5) log any changes."

---

## H. Reranker (score relevance of retrieved items)

**Core rule**: Calibration and position-independence are the two non-negotiable properties.

- Require query-intent extraction as Step 1: "Before scoring, state what the query
  is actually asking for in one sentence."
- Include scoring anchors — calibrated examples at specific scale points:
  - Score 2: "Mentions a keyword but addresses a different topic entirely"
  - Score 5: "Relevant to the topic but doesn't directly answer the query"
  - Score 8: "Directly answers the query with specific, accurate information"
- Require position-independence: "Score each passage as if it were the only one.
  List position must not influence the score."
- Require rationale per item: "For each score, provide a 5-10 word rationale."

**Output format** (enforced — P1 when in rag_pipeline deployment):
```json
{
  "query_intent": "string",
  "scores": [
    {"id": "string", "score": "number (0-10)", "rationale": "string (5-10 words)"}
  ]
}
```

**T3 requirement**: Include 3 fully scored examples with different score distributions
(all low, mixed, all high) so the model sees the full range.
