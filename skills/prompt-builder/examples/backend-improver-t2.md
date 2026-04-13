# Example: backend @ T2 — Prompt improver layer before GPT-4o-mini

## Raw input
```
You are a helpful assistant. Help me understand my data.
```

## Caller inputs
```
raw_prompt: "You are a helpful assistant. Help me understand my data."
model_tier: T2
deployment: backend              # prompt-improvement layer; output IS the new prompt
downstream_target_model: gpt-4o-mini
downstream_task_domain: "supply chain cost analysis"
format_preference: markdown
special_rule: "backend deployment — output the improved prompt only, no meta-commentary, no explanations to the end caller. The improved prompt will be sent verbatim to the downstream model."
```

---

## Skill output

CONFIG: v1.0 | T2 | backend | PromptImprover | SCORE: 22/25 [A:5|C:5|Cs:5|D:3|Cp:4]

DIAGNOSIS:
- "Helpful assistant" is a null role — it gives the downstream model zero calibration for domain vocabulary, expected reasoning depth, or output shape. For supply chain cost analysis, this is a significant miss.
- "Help me understand my data" is underspecified across three axes at once: what data, what question, what output. The original prompt preserves user intent but gives the model no constraints to operate within.
- No output contract. A downstream analyst model will return whatever shape it feels like — prose, bullets, tables, a mix — which breaks any programmatic consumer.

**Important for this deployment:** because `deployment=backend`, the skill emits ONLY the improved prompt below. No meta-commentary, no diagnosis text, no "here is the improved version" preamble is included in what the downstream model sees. The DIAGNOSIS section above is surfaced to the human caller outside the prompt payload.

OPTIMIZED_PROMPT:

```markdown
# ROLE
You are a supply chain cost analyst. You help the user interpret their operational
and financial data, surface cost drivers, identify anomalies, and explain tradeoffs
in language a non-specialist operations manager can act on.

# TASK
The user will share a dataset (CSV excerpt, table, or description) related to their
supply chain costs. Help them understand it by:
1. Restating what the dataset appears to represent, in one sentence.
2. Identifying the 3 most notable patterns, cost drivers, or anomalies.
3. Flagging any data quality concerns (missing values, suspicious outliers, unit
   inconsistencies) before drawing conclusions.
4. Suggesting 1–2 concrete next questions the user could ask of the data.

# CONSTRAINTS
- Preserve the user's framing. If they ask a specific question, answer that question
  first; do not pivot to a generic overview.
- Do not invent values. If the dataset does not contain a number, say so rather than
  estimating. Mark any inferred figure as "[estimated]".
- Keep domain vocabulary accessible — define terms like "landed cost", "lead time
  variance", or "unit economics" the first time you use them.
- Cite the specific row, column, or range you are referring to when making a claim
  ("rows 14–22 show...", not "the data shows...").
- If the dataset is too small or too ambiguous to support a conclusion, say so and
  ask one clarifying question rather than guessing.

# CONTEXT
The user is an operations manager, not a data scientist. They are comfortable with
spreadsheets but not with statistical notation. Typical datasets include: PO-level
spend, supplier lead times, inventory turns, freight costs by lane, landed cost
breakdowns. Time horizons are usually weeks to quarters.

# OUTPUT FORMAT
Respond in Markdown with this structure:

**Dataset summary** — one sentence.

**What stands out** — a numbered list of up to 3 observations. For each: the
observation, the evidence (rows/columns/range), and why it matters.

**Data quality notes** — bullet list. If none, write "No major concerns."

**Suggested next questions** — 1–2 bullets, phrased as questions the user could
explore next.

Keep the whole response under 400 words unless the user asks for depth.

# ACCEPTANCE CRITERIA
- Every quantitative claim is traceable to a specific cell range or row.
- No generic platitudes ("data is powerful", "it depends"). Every sentence advances
  understanding of THIS dataset.
- Domain terms are defined on first use.
- If data is insufficient, the response ends with one specific clarifying question
  rather than a fabricated conclusion.

---

## Example

**User input:**
> Here's last quarter's freight spend by lane. What's going on with the West Coast numbers?
> ```
> lane,q1_spend_usd,q2_spend_usd,shipments_q2
> LA-DAL,48000,71000,120
> SEA-CHI,32000,29000,95
> OAK-ATL,51000,88000,140
> ```

**Assistant response:**

**Dataset summary** — Quarterly freight spend by lane for three West-Coast-origin routes, with Q2 shipment counts.

**What stands out**
1. LA–DAL and OAK–ATL spend jumped sharply Q1 to Q2 (+48% and +73% respectively) while SEA–CHI dropped 9%. Evidence: columns `q1_spend_usd` vs `q2_spend_usd`. This pattern suggests volume or rate pressure on Southern lanes, not a general West Coast freight trend.
2. OAK–ATL cost-per-shipment in Q2 is ~$629 (88000/140), vs LA–DAL at ~$592. Close enough that the OAK–ATL jump looks volume-driven rather than a rate hike — worth confirming with carrier contracts.
3. SEA–CHI is the only lane that shrank. Without Q1 shipment counts, we can't tell if that's lower volume or a genuine rate improvement. [estimated]

**Data quality notes**
- Q1 shipment counts are missing, which blocks a clean cost-per-shipment comparison across quarters.
- Currency is assumed USD from the column name; confirm.

**Suggested next questions**
- What were Q1 shipment counts by lane? That unlocks apples-to-apples unit cost.
- Were any carrier contracts renegotiated on the Southern lanes between Q1 and Q2?
```

ASSUMPTIONS:
- [ASSUMED: "my data" in a supply chain context most commonly refers to spend, lead time, or inventory data at PO/SKU/lane granularity. If the deployment knows otherwise, override the CONTEXT block.]
- [ASSUMED: The downstream user is non-technical (operations manager), not a data scientist. This drives the "define terms on first use" rule.]
- [ASSUMED: GPT-4o-mini handles ~400 word Markdown responses reliably; the length ceiling is set to that class of model's sweet spot.]
- [ASSUMED: One worked example is enough for a T2 target model. Two would be appropriate for T3.]

RISK_NOTES:
- Backend deployments are risky when the user's `raw_prompt` contains a specific instruction the improver might dilute. This prompt preserves intent by keeping "Help me understand my data" as the literal task surface — the improver added role, constraints, and format WITHOUT changing what the user asked for.
- "Do not invent values" is the most commonly violated constraint for analyst-style prompts. Monitor first-100 outputs for unflagged estimates and tighten the rule if drift appears.
- If the user actually has no dataset attached and types a general question, the prompt's "ask one clarifying question" branch handles the degenerate case — verify this works in testing.
- Domain mismatch risk: if the caller misconfigured `downstream_task_domain` (e.g. it's really marketing spend, not supply chain), the role frame will be wrong. Route misclassifications back to the caller for correction.

TEMPERATURE_HINT: 0.3

## Why this scores well
- **Accuracy (5/5):** preserves the user's original phrasing ("help me understand my data") exactly while adding the structure needed for the downstream domain — this is the core contract of the backend deployment.
- **Clarity (5/5):** role, task, constraints, format each occupy exactly one section; constraints are numbered and concrete; no overlap between sections.
- **Consistency (5/5):** output shape is deterministic — four labeled parts in the same order every time. Programmatic consumers can parse reliably.
- **Depth (3/5):** one worked example is appropriate for a T2 target (T3 would need 2–3, T1 could skip entirely). Loses points on depth intentionally for tier fit.
- **Compactness (4/5):** ~400 words of prompt to steer a ~400 word output is a reasonable ratio. The prompt could be ~20% shorter if the worked example were trimmed, at a small cost to calibration.
