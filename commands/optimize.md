---
description: "Optimize a raw prompt for a target model tier and deployment context"
argument-hint: "[raw prompt or path to file]"
---

Invoke the `prompt-builder` skill to optimize a prompt.

**User arguments**: {{ARGUMENTS}}

**Behavior**:

1. If `{{ARGUMENTS}}` is empty, ask the user for:
   - The raw prompt text (or a file path)
   - Target `model_tier` (T1 / T2 / T3) — default T2 if unsure
   - `deployment` type (interactive / backend / rag_pipeline / agent / plugin / eval_judge / personal_mobile) — default interactive
   - Any prior version they want to iterate from (optional)

2. If arguments look like a file path (starts with `/`, `~`, `./`, or ends in `.md`/`.txt`/`.prompt`), read the file as `raw_prompt`.

3. Load the `prompt-builder` skill and run its full process with the collected inputs per `references/caller-contract.md`.

4. Present the full skill output (CONFIG, DIAGNOSIS if applicable, OPTIMIZED_PROMPT, ASSUMPTIONS, RISK_NOTES, TEMPERATURE_HINT, and KEY_CHANGES/REGRESSION_NOTES if iterating).

5. Offer next actions:
   - `/prompt-builder:save <id>` — persist this version to `.prompt-builder/prompts/<id>/`
   - Ask for an A/B comparison against a saved version — the `prompt-builder` skill handles it via `references/scoring.md`
   - Edit and re-run if the user wants adjustments
