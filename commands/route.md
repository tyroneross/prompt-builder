---
name: route
description: Main prompt-builder entry. Dispatches to a subcommand based on your request, or lists options if unclear. Use `prompt-builder:<subcommand>` to target a specific action directly.
argument-hint: "[what you want to do]"
---

# /prompt-builder:route — Router

Route this request to the appropriate prompt-builder subcommand or skill based on the user's intent.

**Raw user input**: $ARGUMENTS

## Routing logic

1. If `$ARGUMENTS` is empty or only whitespace: list the available subcommands below and ask the user what they want to do.
2. Otherwise: match the user's natural-language request against the subcommand intents below and invoke the best match.
3. If the request doesn't match a subcommand — including score-only, A/B compare, or list-saved-prompts intents — load the `prompt-builder` skill directly (listed in your available skills) and follow its guidance; the skill's core engine and `references/scoring.md` cover scoring, comparison, and iteration without a dedicated subcommand.
4. If nothing fits, say so and list the subcommands. Do NOT guess.

## Available subcommands

- **`/prompt-builder:optimize`** — Optimize a raw prompt for a target model tier and deployment context
- **`/prompt-builder:save`** — Persist an optimized prompt to the project-local prompt library

Score-only and A/B-compare requests are handled by the `prompt-builder` skill directly (no dedicated subcommand) — describe the request in natural language instead of a slash command.

## Examples

- User types `/prompt-builder` alone → list subcommands, ask for direction
- User types `/prompt-builder <free-form request>` → match intent, invoke subcommand
- User types `/prompt-builder:<specific>` → bypass this router entirely (direct invocation)

## Rules

- Prefer the most specific subcommand match. If two could fit, ask which.
- Never invent a new subcommand. Only route to ones listed above.
- If the user is describing a workflow that spans multiple subcommands, outline the sequence and ask whether to proceed.
