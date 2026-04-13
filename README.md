# prompt-builder

A Claude Code plugin that wraps the **prompt-builder** skill — a Prompt Policy Engine that classifies, diagnoses, rewrites, and scores prompts calibrated to model tier and deployment context.

Designed to be callable by **agents, tools, and humans** through a shared input/output contract.

## What it does

Given a raw prompt, `prompt-builder` returns:

- A 6-Part-Stack optimized prompt (Role / Task / Constraints / Context / Output Format / Acceptance Criteria)
- A 5-dimension quality score (Accuracy / Clarity / Constraint Strength / Output Determinism / Completeness)
- Diagnosis of the top 3 issues in the original prompt
- Tagged assumptions (`[ASSUMED: ...]`) the caller should review
- A suggested runtime `TEMPERATURE_HINT`
- Regression detection when iterating from a prior version

Calibrates the rewrite to:

- **Model tier**: T1 (frontier) · T2 (mid) · T3 (small/fast)
- **Deployment**: interactive · backend · rag_pipeline · agent · plugin · eval_judge · personal_mobile

## Install

Standalone repo with symlink install (matches `bookmark`/`build-loop` pattern):

```bash
cd ~/.claude/plugins
ln -s ~/Desktop/git-folder/prompt-builder prompt-builder
```

Verify:

```bash
claude --print "List my installed plugins"
# should include prompt-builder
```

## Usage

### Slash commands (humans)

| Command | Purpose |
|---------|---------|
| `/prompt-builder:optimize [prompt or path]` | Optimize a prompt end-to-end |
| `/prompt-builder:score [prompt or path]` | Score-only; returns dimensional breakdown + diagnosis |
| `/prompt-builder:compare <a> <b>` | A/B two prompt versions with regression detection |
| `/prompt-builder:save <id>` | Persist the last optimized prompt to the library |
| `/prompt-builder:list [filter]` | Show saved prompts and their latest scores |

### Skill invocation (agents and tools)

Any caller can invoke the skill directly with labeled inputs. The skill returns a structured response per `skills/prompt-builder/references/caller-contract.md`.

Example invoking prompt (sent by an agent):

```
Use the `prompt-builder` skill.

raw_prompt: You are a helpful assistant. Analyze the CSV and tell me what's interesting.
model_tier: T2
deployment: plugin
output_consumer: human
risk_level: medium
```

Example response (abridged):

```
CONFIG: v1.0 | T2 | plugin | Instructional+Analytical | SCORE: 21/25 [A:4|C:5|Cs:4|D:4|Cp:4]

DIAGNOSIS:
- Ambiguity: "what's interesting" is not a deliverable
- Missing constraints: no null/type handling
- Missing context: no column descriptions, no audience

OPTIMIZED_PROMPT:
...

TEMPERATURE_HINT: 0.2
```

Full contract: [`skills/prompt-builder/references/caller-contract.md`](skills/prompt-builder/references/caller-contract.md)

## Library (project-local storage)

Saved prompts live under `.prompt-builder/prompts/<id>/` in the consuming project:

```
.prompt-builder/
├── prompts/
│   ├── summarizer/
│   │   ├── v1.md           # The optimized prompt (copy-ready)
│   │   ├── v1.meta.json    # tier, deployment, score, assumptions, timestamp
│   │   ├── v2.md
│   │   └── v2.meta.json
│   └── rag-reranker/
│       └── ...
└── memory/
    └── lessons.md          # Append-only cross-prompt insights (optional)
```

Versions are never overwritten — `/prompt-builder:save` always increments.

## Regression testing

The plugin ships with a zero-dependency eval runner:

```bash
cd ~/Desktop/git-folder/prompt-builder
node evals/run-evals.mjs              # run all cases
node evals/run-evals.mjs reranker-t3  # run one case
node evals/run-evals.mjs --dry        # preview invoking prompts without calling claude
```

The runner spawns `claude -p` per case, parses the CONFIG line, and asserts on `must_contain`, `must_not_contain`, `required_sections`, and `min_score`. Exit code is non-zero on any failure.

## When to use this plugin

- You're hand-authoring a system prompt for a product and want it scored before ship
- An agent framework (build-loop, research agents, custom orchestration) needs a sub-prompt for a downstream LLM call and wants to delegate the prompt work
- You're comparing two prompt versions and want a regression guard
- You're building a RAG pipeline, agent, or plugin and need deployment-aware optimization

## When NOT to use this plugin

- The task is purely creative and you want stylistic looseness
- You need one-shot creative writing with no reusability — just write the prompt
- You want to execute the prompt (this plugin optimizes prompts; executing them is the caller's job)

## Architecture

- **1 skill** (`prompt-builder`) — the engine. Progressive disclosure via 4 reference files + 5 worked examples.
- **5 slash commands** — thin wrappers. Humans use these; agents invoke the skill directly.
- **No agents, no hooks, no MCP server** — the skill is a stateless transform. Callers get better results invoking it directly than orchestrating sub-agents.
- **Zero runtime dependencies** — plain Markdown + JSON + Node's built-in stdlib.

## License

MIT
