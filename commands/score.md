---
description: "Score an existing prompt on the 5-dimension rubric without rewriting it"
argument-hint: "[prompt text or path to file]"
---

Invoke the `prompt-optimizer` skill in score-only mode.

**User arguments**: {{ARGUMENTS}}

**Behavior**:

1. If `{{ARGUMENTS}}` is empty, ask the user for the prompt text (or file path) and optionally the target `model_tier` and `deployment`.

2. If arguments look like a file path, read it as the prompt to score.

3. Load the `prompt-optimizer` skill. Skip Steps 1–4 (classify → enhance). Go directly to:
   - Classify the prompt's function, context dependency, output constraint
   - Run Step 5 VALIDATE
   - Run Step 6 SCORE per `references/scoring.md`

4. Return **only**:
   - `CONFIG:` line with full dimensional breakdown
   - `DIAGNOSIS:` — top 3 issues found
   - `RISK_NOTES:` — what would need to change to raise any dimension ≤ 3
   - Do NOT produce an `OPTIMIZED_PROMPT:` block. The user only asked for a score.

5. If any dimension is ≤ 2, flag it as a **blocker** and recommend running `/pretty-prompts:optimize` to fix.
