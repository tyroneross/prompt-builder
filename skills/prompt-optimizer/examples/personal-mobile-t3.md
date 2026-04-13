# Example: personal_mobile @ T3 — Find local family-friendly ice skating

## Raw input
```
Find ice skating places
```

## Caller inputs
```
raw_prompt: "Find ice skating places"
model_tier: T3                   # on-device small model (e.g. Apple Intelligence / Gemini Nano class)
deployment: personal_mobile
format_preference: plain_text    # voice-friendly, iOS Notes compatible
user_context:
  location: "Campbell, CA"
  household: "parent with two young kids (ages 6 and 8)"
  hobbies: ["ice skating", "knife and axe throwing", "fitness"]
  privacy: "high — never emit kids' names, exact home address, or any health data"
  current_time: "2026-04-13, 14:30 PDT"
```

---

## Skill output

CONFIG: v1.0 | T3 | personal_mobile | LocalRecs | SCORE: 21/25 [A:4|C:5|Cs:4|D:4|Cp:4]

DIAGNOSIS:
- No location, time, or household context — "ice skating places" could mean anything from a frozen pond in Minnesota to a curling rink in Canada. A personal assistant prompt must inject the known user context every time.
- No privacy guardrails. A small model handed kids' data will happily paste names, ages, or "near 123 Foo St" into output; the prompt must forbid this explicitly.
- No format discipline. Mobile output needs to fit on one screen, be voice-readable, and avoid markdown that looks ugly in iOS Notes / read-aloud.

OPTIMIZED_PROMPT:

You are a helpful friend who knows Campbell, California and the South Bay well, and who cares about making good weekend plans with young kids. The person talking to you is a parent of two young kids. Today is Monday, April 13, 2026, and it is 2:30 PM local time.

What they want: a short list of nearby places where they can go ice skating with their family this week. Give them 3 options, ranked best-first for a family with young children.

Rules you must follow:
- Keep every place within about a 15 minute drive of Campbell, CA. If you are not confident a place is within that range, do not include it.
- Prefer indoor rinks with public sessions, rental skates in kids' sizes, and staffed rails or skate aids for beginners.
- Keep total cost realistic for a family of four: under about $80 per visit including rentals. Flag anything pricier.
- Never mention the kids by name, age, school, or any detail that identifies them. Do not guess a home address. Do not refer to anyone's health, fitness level, or ability in a way that assumes medical information.
- If you are not sure a place is currently open or still operating, say "worth calling ahead" next to it instead of inventing hours.
- Write in plain text. No bullet symbols, no asterisks, no headers, no emoji. Use short sentences that read well aloud. Keep the whole reply under 150 words so it fits on one phone screen without scrolling.
- End with one short, friendly note about skate safety for the kids (helmets, gloves, lace snug).
- Because you also know this person enjoys knife and axe throwing, add one brief line at the very end reminding them that those sports stay locked up at home and out of reach of the kids. One sentence, no lecture.

Output shape (plain text, in this order, no labels):
1. One warm opening line acknowledging the plan.
2. Three numbered options. For each: the place name, one short sentence on why it fits, a rough cost, and a "call ahead" or "check hours" note if relevant.
3. One safety line about skating with young kids.
4. One short sentence about keeping throwing gear locked up at home.

Example of the tone and shape you should match (venue names are placeholders — use real ones you are confident about, otherwise say "check a local listing"):

Sounds like a fun week — here are three good options nearby.
1. Winter Lodge Ice Rink in Palo Alto. Indoor, small, friendly to first-timers, rents kids' skates and has skate aids. About $20 per person with rentals, so roughly $80 for four. Worth calling ahead for the public session schedule.
2. Sharks Ice at San Jose. Bigger rink, longer public sessions, good if the kids have skated before. About $18 per person, rentals extra. Weekday afternoons are the quietest.
3. Solar4America Ice at Fremont. Slightly farther but usually less crowded midweek. Call ahead to confirm public skate times today.
Helmets on, gloves on, laces snug — young skaters fall a lot and that is fine.
One more thing: keep the throwing knives and axes locked away at home, out of kids' reach.

If you cannot find three places you are confident about within 15 minutes of Campbell, say so honestly and suggest one alternative family activity indoors instead. Do not pad the list with guesses.

ASSUMPTIONS:
- [ASSUMED: "ice skating places" means public recreational skating, not hockey leagues or figure skating lessons. If lessons were meant, the model should ask.]
- [ASSUMED: "Near Campbell, CA" covers roughly San Jose / Sunnyvale / Palo Alto / Fremont within a 15 min drive window; venues listed above are examples only — a real deployment must either ground these with a maps tool or a local venue DB at runtime.]
- [ASSUMED: Cost ceiling of ~$80 for a family of four reflects a casual weekday outing, not a birthday party or private lesson.]
- [ASSUMED: The parent wants the safety tip once, not repeated — one short line, not a lecture.]

RISK_NOTES:
- Venue names in the example are placeholders for prompt shape. An on-device model with no tool access WILL hallucinate hours, prices, and even which rinks still exist. Pair this prompt with a local venues tool / map lookup at runtime, or add a stronger "say you're not sure" fallback.
- Privacy: the prompt forbids naming kids and inferring address, but a T3 model may still leak context if the upstream app passes kids' names in other fields. Sanitize inputs at the app layer too.
- Safety: the knife/axe reminder is included because it is a known hobby in the user context and young kids are in the household. If the deployment does not pass that hobby through, the line should be dropped — do not invent a reason to mention weapons.
- The 150-word ceiling is tight. If the model goes long, the voice-readable guarantee breaks. Consider a post-hoc length trim in the app layer as a safety net.

TEMPERATURE_HINT: 0.2

## Why this scores well
- **Accuracy (4/5):** hard constraints on travel radius, cost, privacy, and "say 'call ahead' instead of inventing hours" prevent the single biggest failure mode for a small on-device model — confident hallucination of venue details. Loses one point because without tool access, it still can't fully verify.
- **Clarity (5/5):** rules are short, imperative, one per line; output shape is spelled out as a numbered order; example demonstrates tone and structure in one compact block.
- **Consistency (4/5):** plain-text output is fully deterministic in shape — opening line, 3 numbered options, safety line, throwing-gear line. One point off because a T3 model may still drift on tone.
- **Depth (4/5):** anticipates the kid-safety angle, the hobby-crossover angle (knife/axe storage), and the "what if I can't find 3" fallback — each addresses a realistic failure the raw prompt would have missed.
- **Compactness (4/5):** the prompt itself is longer than the output it generates, which is appropriate for a T3 on-device model where every guardrail must be explicit. Loses one point for length — could be trimmed further if the deployment has a very tight context window.
