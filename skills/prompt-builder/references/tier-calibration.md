# Tier Calibration Reference

Detailed calibration tables for each part of the 6-Part Stack, organized by model tier.
Use when the summary in SKILL.md needs more specificity.

---

## Model Tier Definitions

| Tier | Models | Capability Profile |
|------|--------|--------------------|
| T1 | Opus, GPT-4o+, Gemini Ultra, o3/o4 | Handles abstraction. Routes internally. Follows implicit constraints. Minimal scaffolding needed. |
| T2 | Sonnet, GPT-4o-mini, Gemini Flash | Follows structured guidance reliably. Needs explicit constraints. Selective CoT helps. May drop rules under long context. |
| T3 | Haiku, GPT-3.5, local <13B | Needs rigid sequential pipeline. Cannot reliably self-route. Fails on multi-axis conditional logic. Requires explicit examples for every non-trivial pattern. |

**Orthogonal axis — `REASONING_MODE`** (Step 0). Reasoning-native models (o3/o4, GPT-5,
Claude extended-thinking, DeepSeek-R1) sit at the T1 capability tier but change *technique
selection*, not calibration depth: on them, suppress chain-of-thought and few-shot and
control depth via the reasoning-effort / thinking-budget parameter (see the CoT calibration
and technique-gating tables below). A T1-capable model in `standard` mode still uses the
T1 columns in this file normally.

---

## Part 1: ROLE — Detailed Calibration

**T1 — Minimal**
```
You are a senior data analyst specializing in supply chain optimization.
```
One sentence. The model derives adjacent expertise (statistics, SQL, visualization)
from the domain specification. Adding "who also knows statistics" is redundant tokens.

**T2 — Scoped**
```
You are a senior data analyst specializing in supply chain optimization.
Your lens is cost-to-serve analysis for contract manufacturing.
You are NOT a financial advisor — do not make investment recommendations.
```
Role + primary domain + one lens + one exclusion boundary.

**T3 — Bounded**
```
You are a supply chain data analyst. Your job is to analyze manufacturing
cost data and produce structured reports.
You are NOT a financial advisor. You do NOT make predictions about future costs.
You do NOT access external data sources.
Behavioral anchors:
- Always state your data source before any claim.
- If asked about something outside supply chain costs, say: "That's outside my scope."
- When uncertain, say: "I cannot confirm this from the provided data."
```
Full persona with explicit exclusions and scripted fallback behaviors.

---

## Part 2: TASK — Detailed Calibration

**T1**
```
Analyze the uploaded cost data and identify the top 3 margin compression drivers.
```
Single sentence. Model determines it needs to: read the data, calculate margins,
identify drivers, rank them, and present findings.

**T2**
```
Analyze the uploaded cost data and identify the top 3 margin compression drivers.
Steps:
1. Calculate gross margin by product line.
2. Identify lines with >5% margin decline QoQ.
3. Attribute decline to specific cost categories (BOM, logistics, labor).
```
Goal + decomposed sub-steps.

**T3**
```
Follow these steps exactly in order:
Step 1: Read the uploaded CSV file. Confirm you see columns: product_line, quarter,
        revenue, cogs_bom, cogs_logistics, cogs_labor. If any column is missing, STOP
        and report which column is missing.
Step 2: For each product_line, calculate gross_margin = (revenue - total_cogs) / revenue.
        Output a table: product_line | Q1_margin | Q2_margin | Q3_margin | Q4_margin.
Step 3: Identify product lines where margin declined by >5 percentage points from any
        quarter to the next. List them.
Step 4: For each declining product line from Step 3, identify which cost category
        (bom, logistics, labor) increased the most as a percentage of revenue.
Step 5: Output final report with: product_line, quarter_of_decline, primary_cost_driver,
        magnitude_of_increase.
```
Each step = one action + one output. Model cannot skip or combine.

---

## Part 3: CONSTRAINTS — Detailed Calibration

**T1 (3-5 constraints)**
```
- Flag uncertain claims as [INFERRED].
- Do not extrapolate beyond the data provided.
- Include source references for statistical claims.
```

**T2 (5-8 constraints)**
```
- Flag uncertain claims as [INFERRED].
- Do not extrapolate beyond the data provided.
- Include source references for statistical claims.
- If a data field is null, exclude that row from calculations and note the exclusion count.
- Do not compare across product lines unless they share the same cost structure.
- Round all percentages to one decimal place.
```

**T3 (exhaustive)**
```
- ONLY use data from the uploaded CSV. Do not use any other source.
- For EVERY claim about a number, cite the row(s) it came from.
- If a cell is empty or null: skip that row. Count skipped rows. Report count at end.
- If a cell contains text where a number is expected: skip that row. Report it as an error.
- Do not calculate averages across product lines.
- Round all percentages to one decimal place.
- If the CSV has fewer than 2 quarters of data, STOP and say: "Insufficient data for trend analysis."
- Do not suggest actions or recommendations. Only report findings.
- If asked to do something not listed in the TASK steps, say: "That's outside this analysis."
```
Every constraint is testable: you can verify pass/fail for each one.

---

## Part 4: CONTEXT — Detailed Calibration

**T1**: Provide only what's non-obvious.
```
Context: This analysis supports a board-level review of hyperscale margins.
The audience expects bottom-line-first presentation with supporting evidence.
```

**T2**: Add definitions for ambiguous terms.
```
Context: This analysis supports a board-level review of hyperscale margins.
Definitions:
- "Margin compression" = gross margin decline of >5 percentage points QoQ.
- "BOM" = Bill of Materials (silicon, memory, other components).
- "COGS" includes BOM + logistics + labor but excludes customer resolution costs.
Assumption: All revenue figures are in USD. If currency is not specified, assume USD.
```

**T3**: Full context with every definition and assumption stated.
```
Context: You are analyzing a CSV file of quarterly manufacturing cost data.
This data is for an internal strategy review. The audience is non-technical executives.

Definitions:
- "Margin compression" = gross margin decline of >5 percentage points QoQ.
- "BOM" = Bill of Materials. Includes: silicon, memory, other components.
- "COGS" = Cost of Goods Sold. Includes: BOM + logistics + labor.
  Does NOT include: customer resolution costs, warranty, or returns.
- "QoQ" = Quarter over Quarter comparison (Q1→Q2, Q2→Q3, Q3→Q4).
- "Product line" = the value in the product_line column of the CSV.

Assumptions (state if you rely on any):
- All revenue figures are in USD.
- Quarters are calendar quarters (Q1=Jan-Mar, Q2=Apr-Jun, etc.).
- Each row represents one product line in one quarter.
```

---

## Part 5: OUTPUT FORMAT — Detailed Calibration

**T1**: Describe structure.
```
Output a report with: executive summary (2-3 sentences), findings table,
and methodology notes.
```

**T2**: Template + one example.
```
Output format:
## Executive Summary
[2-3 sentences: top finding, magnitude, implication]

## Findings
| Product Line | Quarter | Margin Change | Primary Driver | Magnitude |
|...           |...      |...            |...             |...        |

## Methodology
[Brief note on data handling, exclusions, assumptions used]

Example row:
| Server-HX | Q2→Q3 | -7.2pp | BOM (silicon) | +$142M (+18% of rev) |
```

**T3**: Exact schema + examples + error handling.
```
Output EXACTLY this JSON structure. No other text.

{
  "executive_summary": "string, 2-3 sentences",
  "findings": [
    {
      "product_line": "string",
      "quarter_transition": "string, format: Q1→Q2",
      "margin_change_pp": "number, negative = decline",
      "primary_driver": "string, one of: bom, logistics, labor",
      "driver_magnitude_usd": "number",
      "driver_magnitude_pct": "number, percentage of revenue"
    }
  ],
  "exclusions": {
    "null_rows_skipped": "integer",
    "error_rows_skipped": "integer",
    "notes": "string or null"
  }
}

Correct example:
{
  "executive_summary": "Server-HX margins declined 7.2pp in Q3 driven by silicon BOM increases.",
  "findings": [
    {
      "product_line": "Server-HX",
      "quarter_transition": "Q2→Q3",
      "margin_change_pp": -7.2,
      "primary_driver": "bom",
      "driver_magnitude_usd": 142000000,
      "driver_magnitude_pct": 18.3
    }
  ],
  "exclusions": {"null_rows_skipped": 2, "error_rows_skipped": 0, "notes": null}
}

Common error — DO NOT do this:
{"findings": "Server-HX had margin decline"}
This is wrong because: findings must be an array of objects, not a string.
```

---

## CoT Calibration by Tier × Reasoning Mode

| Tier / Mode | Use CoT? | Reasoning |
|------|----------|-----------|
| **Reasoning-native** (o3/o4, GPT-5, Claude extended-thinking, DeepSeek-R1) | **No — suppress** | CoT is internalized; explicit CoT is redundant and adds latency. Also suppress few-shot (often degrades). Control depth via the reasoning-effort / thinking-budget parameter, not the prompt. OpenAI reasoning best-practices T1 ✅; CoT was established for *non-reasoning* models [Wei 2201.11903]. <3% accuracy gain, 20-80% time overhead [Meincke/Mollick 2025]. |
| T1 (non-reasoning: Opus, GPT-4o) | Only for multi-step analytical tasks | Zero-shot "Think step by step" is sufficient. |
| T2 | If multi-step reasoning needed | Short worked example (4-6 steps max). |
| **T3 (~<7-10B)** | **Never — CoT is HARMFUL here** | Not merely unhelpful: small models emit fluent-but-wrong reasoning traces whose errors the final answer inherits (⚠️ T3 / preprint magnitude — directionally consistent across reports, not a single peer-reviewed benchmark). Replace with least-to-most decomposition in TASK, or escalate to a larger model [IEOM 2024]. |

Research context: Optimal CoT length scales inversely with model capability.
14 steps for 1.5B models, 4 steps for 72B models [Qwen/Hendrycks 2025].

---

## Advanced Technique Gating

Selection matrix for reasoning-style techniques. Gate is the condition under which the
technique is worth adding. Default gate is **non-reasoning, T2+** (reasoning-native models
plan internally; T3 models degrade on multi-step reasoning). ReAct and RAG-grounding are
tier-agnostic where tools / sources exist.

| Technique | Gate | Note |
|-----------|------|------|
| Chain-of-thought | Non-reasoning, T2+ analytical | Suppressed on reasoning-native; HARMFUL on T3 (use least-to-most) [Wei 2201.11903]. |
| Self-consistency (sample-and-vote) | Non-reasoning, T2+, high-value only | ⚠️ 5-40x inference cost — reserve for high-stakes correctness [Wang 2203.11171]. |
| Tree-of-thoughts | Non-reasoning, T2+, ONLY with explicit search structure + evaluator | Needs a branch/evaluate/backtrack scaffold and an evaluator function — not a bare prompt phrase [Yao 2305.10601]. |
| Step-back prompting | Non-reasoning, T2+, abstraction-heavy | Derive the governing principle first, then answer [Zheng 2310.06117]. |
| Least-to-most | Any tier, decomposable tasks | Preferred T3 substitute for CoT; pre-split into ordered sub-steps [Zhou 2205.10601]. |
| Skeleton-of-thought | Non-reasoning, T2+, parallelizable output | Outline first, expand branches (optionally in parallel) — latency win [SoT 2307.15337]. |
| ReAct (reason + act) | Tier-agnostic where tools exist | Interleave thought / tool-call; the default for `agent` deployments. |
| RAG grounding | Tier-agnostic where sources exist | Always applies for grounded / RAG types (P3 universal constraint). |

Source overview: The Prompt Report survey [arXiv 2406.06608] catalogs these techniques;
the gating above encodes the 2025-2026 shift that reasoning-native models make CoT/few-shot
redundant-to-harmful rather than default-beneficial.
