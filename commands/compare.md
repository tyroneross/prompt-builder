---
description: "A/B compare two versions of a prompt with dimensional scoring and regression detection"
argument-hint: "<version-a> <version-b>  (prompt text, file paths, or saved ids)"
---

Invoke the `prompt-builder` skill to compare two prompt versions.

**User arguments**: {{ARGUMENTS}}

**Behavior**:

1. Parse two inputs from `{{ARGUMENTS}}`. Each input can be:
   - Inline prompt text
   - A file path
   - A saved library id (look in `.prompt-builder/prompts/<id>/` — pick the highest `v*.md` unless a version is specified as `<id>@v2`)

   If fewer than two inputs, ask the user to provide both.

2. Load the `prompt-builder` skill. For each version:
   - Classify and score per Step 6
   - Record dimensional breakdown

3. Produce an A/B comparison report per `references/scoring.md` A/B Comparison Protocol:

```
VERSION COMPARISON
                   vA          vB
Accuracy:          n/5    →    n/5     (±n)
Clarity:           n/5    →    n/5     (±n)
Constraints:       n/5    →    n/5     (±n)
Determinism:       n/5    →    n/5     (±n)
Completeness:      n/5    →    n/5     (±n)
Total:             n/25        n/25    (±n)
Prompt tokens:     ~n          ~n      (diff%)

Recommendation: <which version and why>
```

4. Flag **hard regressions** (any dimension dropped ≥ 2) explicitly with a warning and require user acknowledgment before declaring a winner.

5. If the comparison is between saved library versions, offer to promote the winner to `current` via `/prompt-builder:save`.
