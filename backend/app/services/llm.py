import json
import re
from dataclasses import dataclass


@dataclass
class FoodEntryAction:
    action: str  # "add", "update", "delete"
    id: str | None
    description: str
    estimated_calories: int
    is_planned: bool


@dataclass
class LLMParsedData:
    food_entries: list[FoodEntryAction]
    weight_kg: float | None


def parse_llm_response(response: str) -> tuple[str, LLMParsedData | None]:
    json_match = re.search(r"```json\s*\n(.*?)\n```", response, re.DOTALL)

    if not json_match:
        return response.strip(), None

    text = response[: json_match.start()].strip()
    json_str = json_match.group(1)

    try:
        raw = json.loads(json_str)
    except json.JSONDecodeError:
        return text, None

    food_entries = [
        FoodEntryAction(
            action=e.get("action", "add"),
            id=e.get("id"),
            description=e.get("description", ""),
            estimated_calories=e.get("estimated_calories", 0),
            is_planned=e.get("is_planned", False),
        )
        for e in raw.get("food_entries", [])
    ]

    return text, LLMParsedData(
        food_entries=food_entries,
        weight_kg=raw.get("weight_kg"),
    )


def build_system_prompt(
    age: int, gender: str, height_cm: float, latest_weight: float,
    target_weight_kg: float, daily_calorie_target: int, date: str,
    today_weight: float | None, food_entries: list[dict], total_calories: int,
) -> str:
    entries_str = "\n".join(
        f"  - [{e['id']}] {e['description']}: {e['estimated_calories']} kcal"
        + (" (planned)" if e.get("is_planned") else "")
        for e in food_entries
    ) or "  (none yet)"

    weight_str = f"{today_weight}kg" if today_weight else "not logged yet"

    return f"""You are a calorie tracking assistant. The user is tracking their daily food intake and weight.

USER PROFILE:
- Age: {age}, Gender: {gender}, Height: {height_cm}cm
- Current weight: {latest_weight}kg, Target: {target_weight_kg}kg
- Daily calorie target: {daily_calorie_target} kcal

TODAY'S LOG ({date}):
- Weight: {weight_str}
- Food entries:
{entries_str}
- Total calories so far: {total_calories} / {daily_calorie_target} kcal

INSTRUCTIONS:
1. You ONLY discuss topics related to food, meals, calories, nutrition, weight, and diet. If the user asks about anything unrelated (math, trivia, coding, etc.), politely decline and redirect them to log their food or weight.
2. If they mention food they ate, estimate calories and include structured data.
3. If the user's description is ambiguous about portion size, brand, or preparation method AND the calorie difference between interpretations would be more than ~100 kcal, ask a brief clarifying question before estimating. For unambiguous items (e.g. "a banana", "2 boiled eggs"), estimate directly without asking. When asking a clarifying question, still include the JSON block with empty food_entries and null weight_kg.
4. If they mention weight, extract the reading.
5. If they ask about a planned meal (hypothetical / "what if"), mark it as planned (not consumed).
6. If they correct a previous entry, reference its ID for update.
7. If they confirm a planned item, change it from planned to confirmed.
8. Always include a JSON block at the end of your response with any data changes.

RESPONSE FORMAT:
Your conversational reply here.

```json
{{
  "food_entries": [
    {{"action": "add|update|delete", "id": null, "description": "...", "estimated_calories": 140, "is_planned": false}}
  ],
  "weight_kg": null
}}
```

If there are no data changes, return empty food_entries array and null weight_kg."""
