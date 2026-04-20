---
name: prompt-builder
description: Main prompt-builder entry. Dispatches to a subcommand based on your request, or lists options if unclear. Use `prompt-builder:<subcommand>` to target a specific action directly.
argument-hint: "[what you want to do]"
---

# /prompt-builder — Router

Route this request to the appropriate prompt-builder subcommand or skill based on the user's intent.

**Raw user input**: $ARGUMENTS

## Routing logic

1. If `$ARGUMENTS` is empty or only whitespace: list the available subcommands below and ask the user what they want to do.
2. Otherwise: match the user's natural-language request against the subcommand intents below and invoke the best match.
3. If the request clearly doesn't fit any subcommand but matches a `prompt-builder` skill (listed in your available skills), load the skill and follow its guidance instead.
4. If nothing fits, say so and list the subcommands. Do NOT guess.

## Available subcommands

- **`/prompt-builder:compare`** — A/B compare two versions of a prompt with dimensional scoring and regression det
- **`/prompt-builder:list`** — List all prompts saved in the project-local library with their latest scores
- **`/prompt-builder:optimize`** — Optimize a raw prompt for a target model tier and deployment context
- **`/prompt-builder:save`** — Persist an optimized prompt to the project-local prompt library
- **`/prompt-builder:score`** — Score an existing prompt on the 5-dimension rubric without rewriting it


## Examples

- User types `/prompt-builder` alone → list subcommands, ask for direction
- User types `/prompt-builder <free-form request>` → match intent, invoke subcommand
- User types `/prompt-builder:<specific>` → bypass this router entirely (direct invocation)

## Rules

- Prefer the most specific subcommand match. If two could fit, ask which.
- Never invent a new subcommand. Only route to ones listed above.
- If the user is describing a workflow that spans multiple subcommands, outline the sequence and ask whether to proceed.
