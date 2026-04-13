---
description: "List all prompts saved in the project-local library with their latest scores"
argument-hint: "[filter keyword]"
---

List saved prompts in `.prompt-builder/prompts/`.

**User arguments**: {{ARGUMENTS}} (optional filter; matches against prompt_id substring)

**Behavior**:

1. Check if `.prompt-builder/prompts/` exists in the current working directory. If not, report: `No prompt library in this project. Run /prompt-builder:save <id> to start one.`

2. For each subdirectory under `.prompt-builder/prompts/`:
   - Read the highest-numbered `v*.meta.json` file.
   - Extract: `prompt_id`, `version`, `model_tier`, `deployment`, `type`, `score.total`, `score` dimensional, `timestamp`.

3. If `{{ARGUMENTS}}` is provided, filter entries where `prompt_id` contains the argument as a substring.

4. Present a compact table:

```
ID                  VER    TIER   DEPLOYMENT       TYPE                 SCORE   DIMENSIONS        UPDATED
summarizer          v3     T2     backend          Transformational     22/25   [5|4|5|4|4]      2026-04-13
rag-reranker        v2     T3     rag_pipeline     Reranker             23/25   [5|4|5|5|4]      2026-04-10
family-activities   v1     T3     personal_mobile  Instructional        21/25   [4|5|4|4|4]      2026-04-08
```

5. If any entry has a dimension ≤ 2, flag it with a ⚠ marker and note that a re-optimization is recommended.

6. Offer next actions:
   - `/prompt-builder:compare <id-a> <id-b>` — compare any two
   - Read a specific saved prompt: `cat .prompt-builder/prompts/<id>/v{n}.md`
