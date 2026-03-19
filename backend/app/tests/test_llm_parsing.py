from app.services.llm import parse_llm_response, build_system_prompt


def test_parse_response_with_valid_json():
    response = '''Great, I've logged 3 boiled eggs for you! That's about 210 calories.

```json
{
  "food_entries": [
    {"action": "add", "id": null, "description": "3 boiled eggs", "estimated_calories": 210, "is_planned": false}
  ],
  "weight_kg": null
}
```'''
    text, data = parse_llm_response(response)
    assert "3 boiled eggs" in text
    assert data is not None
    assert len(data.food_entries) == 1
    assert data.food_entries[0].action == "add"
    assert data.food_entries[0].estimated_calories == 210
    assert data.weight_kg is None


def test_parse_response_with_weight():
    response = '''Logged your weight at 89.2 kg.

```json
{
  "food_entries": [],
  "weight_kg": 89.2
}
```'''
    text, data = parse_llm_response(response)
    assert data is not None
    assert data.weight_kg == 89.2
    assert len(data.food_entries) == 0


def test_parse_response_no_json_block():
    response = "I'm not sure what you mean, could you clarify?"
    text, data = parse_llm_response(response)
    assert text == response
    assert data is None


def test_parse_response_malformed_json():
    response = '''Here's your update.

```json
{not valid json}
```'''
    text, data = parse_llm_response(response)
    assert "Here's your update." in text
    assert data is None


def test_parse_response_update_action():
    response = '''Updated to 2 eggs.

```json
{
  "food_entries": [
    {"action": "update", "id": "abc-123", "description": "2 boiled eggs", "estimated_calories": 140, "is_planned": false}
  ],
  "weight_kg": null
}
```'''
    text, data = parse_llm_response(response)
    assert data is not None
    assert data.food_entries[0].action == "update"
    assert data.food_entries[0].id == "abc-123"


def test_build_system_prompt_includes_profile():
    prompt = build_system_prompt(
        age=30, gender="male", height_cm=180,
        latest_weight=89.2, target_weight_kg=80,
        daily_calorie_target=2400, date="2026-03-15",
        today_weight=89.2, food_entries=[], total_calories=0,
    )
    assert "Age: 30" in prompt
    assert "Target: 80kg" in prompt
    assert "2400 kcal" in prompt


def test_build_system_prompt_includes_entries():
    entries = [
        {"id": "abc-123", "description": "3 boiled eggs", "estimated_calories": 210, "is_planned": False},
    ]
    prompt = build_system_prompt(
        age=30, gender="male", height_cm=180,
        latest_weight=89.2, target_weight_kg=80,
        daily_calorie_target=2400, date="2026-03-15",
        today_weight=89.2, food_entries=entries, total_calories=210,
    )
    assert "abc-123" in prompt
    assert "3 boiled eggs" in prompt
    assert "210" in prompt


def test_build_system_prompt_includes_clarification_instruction():
    prompt = build_system_prompt(
        age=30, gender="male", height_cm=180,
        latest_weight=89.2, target_weight_kg=80,
        daily_calorie_target=2400, date="2026-03-15",
        today_weight=89.2, food_entries=[], total_calories=0,
    )
    assert "ambiguous about portion size" in prompt
    assert "~100 kcal" in prompt


def test_build_system_prompt_includes_calorie_references():
    prompt = build_system_prompt(
        age=30, gender="male", height_cm=180,
        latest_weight=89.2, target_weight_kg=80,
        daily_calorie_target=2400, date="2026-03-15",
        today_weight=89.2, food_entries=[], total_calories=0,
    )
    assert "CALORIE REFERENCE EXAMPLES" in prompt
    assert "1 large egg (boiled): 78 kcal" in prompt
    assert "100g chicken breast (grilled): 165 kcal" in prompt
    assert "1 medium banana: 105 kcal" in prompt
