---
description: "Persist an optimized prompt to the project-local prompt library"
argument-hint: "<id>  (stable identifier, e.g. 'summarizer' or 'rag-reranker')"
---

Save the last-optimized prompt (or one the user provides) to `.prompt-builder/prompts/<id>/`.

**User arguments**: {{ARGUMENTS}}

**Behavior**:

1. Treat `{{ARGUMENTS}}` as the `<id>`. If empty, ask the user for a short stable identifier (kebab-case).

2. Determine what to save:
   - If the user just ran `/prompt-builder:optimize` or `/prompt-builder:compare` in this conversation, use that output.
   - Otherwise, ask the user to paste the optimized prompt + its CONFIG line.

3. Read any existing `.prompt-builder/prompts/<id>/` to find the highest version number. The new version is `v{n+1}`. If the directory doesn't exist, create it and use `v1`.

4. Write two files:
   - `.prompt-builder/prompts/<id>/v{n}.md` — the OPTIMIZED_PROMPT block (just the prompt content, copy-ready)
   - `.prompt-builder/prompts/<id>/v{n}.meta.json` — structured metadata:
     ```json
     {
       "prompt_id": "<id>",
       "version": "v{n}",
       "model_tier": "T2",
       "deployment": "backend",
       "type": "Instructional",
       "score": {
         "total": 21,
         "accuracy": 5,
         "clarity": 4,
         "constraints": 4,
         "determinism": 4,
         "completeness": 4
       },
       "assumptions": ["..."],
       "risk_notes": ["..."],
       "temperature_hint": 0.3,
       "changes_from_previous": ["..."],
       "regressions_from_previous": [],
       "timestamp": "ISO-8601"
     }
     ```

5. Before writing, use the Read tool to check if the file exists. Never overwrite an existing version — always increment. If the user wants to replace, they must explicitly delete the old version file.

6. Report the saved path and confirm with a short summary:
   - `Saved: .prompt-builder/prompts/<id>/v{n}.md (score 21/25)`
   - `Previous: v{n-1} scored 19/25 (+2)` if applicable
