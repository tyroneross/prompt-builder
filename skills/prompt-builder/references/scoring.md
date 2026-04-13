# Scoring, Iteration & Version Tracking

This reference covers prompt quality scoring, version comparison, iteration contracts,
and regression protection. Read this when comparing prompt versions or when the user
asks to improve an existing prompt.

---

## Quality Scoring Rubric

Score each optimized prompt on 5 dimensions. Each dimension is 1-5.

### Dimension 1: Accuracy Robustness (1-5)

How well does the prompt prevent hallucination and ensure source fidelity?

| Score | Criteria |
|-------|----------|
| 1 | No grounding. No refusal conditions. Open to fabrication. |
| 2 | Mentions accuracy but no enforceable mechanism. |
| 3 | Has anti-hallucination constraints but missing refusal protocol or [INFERRED] tagging. |
| 4 | Source grounding + refusal conditions + uncertainty tagging. Minor gap (e.g., no conflict handling). |
| 5 | Full grounding: source citations, refusal protocol, [INFERRED] tags, conflict handling, and tier-appropriate depth. |

### Dimension 2: Clarity (1-5)

Could someone unfamiliar with the project execute this prompt correctly?

| Score | Criteria |
|-------|----------|
| 1 | Ambiguous task. Multiple valid interpretations. No deliverable specified. |
| 2 | Task is stated but vague. Deliverable unclear. |
| 3 | Clear task + deliverable. Some ambiguity in constraints or context. |
| 4 | Unambiguous task, explicit deliverable, clear constraints. Minor implicit assumptions. |
| 5 | Zero ambiguity. Every term defined. Every assumption stated. A stranger could execute perfectly. |

### Dimension 3: Constraint Strength (1-5)

Are constraints testable, complete, and tier-appropriate?

| Score | Criteria |
|-------|----------|
| 1 | No constraints. |
| 2 | 1-2 vague constraints (e.g., "be accurate"). |
| 3 | Reasonable constraints but not testable. Missing edge cases. |
| 4 | Testable constraints with domain edge cases. Appropriate for tier. |
| 5 | Every constraint is pass/fail testable. Edge cases covered. Anti-hallucination tier-matched. Type-specific constraints applied. |

### Dimension 4: Output Determinism (1-5)

Would two runs produce structurally similar outputs?

| Score | Criteria |
|-------|----------|
| 1 | No format specified. Completely free-form. |
| 2 | Format mentioned but not enforced (e.g., "maybe use a table"). |
| 3 | Format specified but missing schema or example. |
| 4 | Schema/template provided. One example. Minor format ambiguity. |
| 5 | Exact schema + examples + error handling. Two runs would produce structurally identical outputs. |

### Dimension 5: Completeness (1-5)

Does the prompt include all necessary components for its type and deployment?

| Score | Criteria |
|-------|----------|
| 1 | Missing most of the 6-Part Stack. No acceptance criteria. |
| 2 | Has role + task. Missing constraints, context, format, or criteria. |
| 3 | Has 4-5 of 6 parts. Missing deployment integration or type-specific rules. |
| 4 | All 6 parts present. Deployment module applied. Minor gap in enhancements. |
| 5 | All 6 parts + deployment module + type rules + tier calibration + enhancements where needed. |

---

## Scoring Rules

- **Total**: Sum of 5 dimensions. Range: 5-25.
- **Blocker rule**: Any dimension ≤ 2 is a blocker. Fix before delivery.
- **The dimensional breakdown is more actionable than the total.**
  A prompt scoring 20 (4,4,4,4,4) is more reliable than one scoring 20 (5,5,5,3,2)
  because the latter has a blocker in completeness.

**Score reporting format**:
```
SCORE: 21/25 [Accuracy:5 | Clarity:4 | Constraints:4 | Determinism:4 | Completeness:4]
```

---

## Version Tracking

When iterating on a prompt, track versions with this schema:

```json
{
  "prompt_id": "string (stable across versions)",
  "version": "string (semver: 1.0, 1.1, 2.0)",
  "model_tier": "T1 | T2 | T3",
  "deployment": "string",
  "type": "string (classified function)",
  "score": {
    "total": 21,
    "accuracy": 5,
    "clarity": 4,
    "constraints": 4,
    "determinism": 4,
    "completeness": 4
  },
  "changes_from_previous": ["string: brief description of each change"],
  "regressions_from_previous": ["string: any dimension that decreased, or empty"],
  "timestamp": "ISO 8601"
}
```

For lightweight use (no JSON tracking system), include version + score in the
prompt's configuration header:
```
# CONFIG: v1.2 | T2 | backend | Instructional | SCORE: 21/25 [5|4|4|4|4]
```

---

## Iteration Protocol

### When the user provides a previous version:

1. **Diff**: Identify structural and content changes between versions.
   - What was added?
   - What was removed?
   - What was restructured?

2. **Score both**: Apply the 5-dimension rubric to both old and new.

3. **Preserve wins**: List improvements from the current version.
   These must not regress in the next iteration.

4. **Flag regressions**: Any dimension that dropped by ≥ 1 point.
   Any dimension that dropped by ≥ 2 points is a **hard regression** —
   do not deliver the new version without explicit user approval.

5. **Targeted fix**: Address only the identified issues.
   Do not rewrite sections that are already working well.
   This matches the iterative refinement pattern (not wholesale rewrites).

6. **Re-score**: Confirm the fix improved the flagged dimension
   without degrading others.

### When the user asks to "make this better" without specifics:

1. Score the current prompt.
2. Identify the lowest-scoring dimension.
3. Apply targeted improvements to that dimension only.
4. Re-score. Report what changed and by how much.

---

## Regression Protection

**Rule**: If any optimization step causes a dimensional score to drop by ≥ 2 points
compared to the previous version, this is a **hard regression**.

**Response**:
1. Flag the regression explicitly: "Warning: [Dimension] dropped from [X] to [Y]."
2. Explain what caused it: "Removing the edge case table reduced Constraint Strength."
3. Offer alternatives: "To fix: restore the edge case table, or replace with equivalent rules."
4. Do not deliver the regressed version without user acknowledgment.

**Soft regressions** (1 point drop): Note them but deliver. They may be acceptable
tradeoffs (e.g., dropping 1 point on Completeness to gain 2 on Clarity via compression).

---

## A/B Comparison Protocol

When comparing two prompt versions for the same task:

1. **Run both** on the same input (or the same 3-5 test inputs if available).
2. **Score both** on the 5-dimension rubric.
3. **Compare outputs** on:
   - Accuracy: Are claims correct and sourced?
   - Consistency: Do repeated runs produce similar results?
   - Efficiency: Token count of the prompt itself + expected output tokens.
4. **Report**: Dimensional score comparison + output quality comparison + recommendation.

```
VERSION COMPARISON
                  v1.2        v1.3
Accuracy:          4    →      5     (+1)
Clarity:           4    →      4     (=)
Constraints:       3    →      4     (+1)
Determinism:       4    →      4     (=)
Completeness:      4    →      3     (-1) ← soft regression
Total:            19          20     (+1)
Prompt tokens:   ~320        ~290    (-30, -9%)

Recommendation: v1.3 is net positive. Completeness drop is acceptable —
caused by removing redundant context that was already implied by the role.
```

---

## When NOT to Score

Scoring is most useful for prompts that will be reused or deployed in production.
Skip scoring for:
- One-off interactive prompts (just optimize and deliver)
- Creative/generative prompts where output variance is desired
- Prompts the user explicitly says they want quick-and-dirty

When in doubt: if the user asked to "improve" or "optimize" a prompt, score it.
If the user asked to "write" a prompt, optimize but skip scoring unless they ask.
