# Improve Calorie Estimate Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve LLM calorie estimation accuracy by adding few-shot reference examples and a portion-clarification instruction to the system prompt.

**Architecture:** Pure prompt changes in `build_system_prompt()`. No structural changes to parsing, data models, or the iOS app.

**Tech Stack:** Python, pytest

**Spec:** `docs/superpowers/specs/2026-03-19-improve-calorie-estimates-design.md`

---

## File Structure

- Modify: `backend/app/services/llm.py` — add clarification instruction and reference examples to system prompt
- Modify: `backend/app/tests/test_llm_parsing.py` — add tests verifying the new prompt content

---

### Task 1: Add clarification instruction to system prompt (TDD)

**Files:**
- Modify: `backend/app/tests/test_llm_parsing.py`
- Modify: `backend/app/services/llm.py` (INSTRUCTIONS section, lines 78-85)

- [ ] **Step 1: Write failing test for clarification instruction**

Append to `backend/app/tests/test_llm_parsing.py`:

```python
def test_build_system_prompt_includes_clarification_instruction():
    prompt = build_system_prompt(
        age=30, gender="male", height_cm=180,
        latest_weight=89.2, target_weight_kg=80,
        daily_calorie_target=2400, date="2026-03-15",
        today_weight=89.2, food_entries=[], total_calories=0,
    )
    assert "ambiguous about portion size" in prompt
    assert "~100 kcal" in prompt
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/mihai/AI/calorie-tracker && python -m pytest backend/app/tests/test_llm_parsing.py::test_build_system_prompt_includes_clarification_instruction -v`

Expected: FAIL — `"ambiguous about portion size"` not found in prompt.

- [ ] **Step 3: Add clarification instruction to system prompt**

In `build_system_prompt()` in `backend/app/services/llm.py`, add a new instruction #3 after the existing instruction #2 ("If they mention food they ate, estimate calories and include structured data."). Renumber all subsequent instructions (old 3→4, 4→5, 5→6, 6→7, 7→8). The full INSTRUCTIONS section should become:

```
INSTRUCTIONS:
1. You ONLY discuss topics related to food, meals, calories, nutrition, weight, and diet. If the user asks about anything unrelated (math, trivia, coding, etc.), politely decline and redirect them to log their food or weight.
2. If they mention food they ate, estimate calories and include structured data.
3. If the user's description is ambiguous about portion size, brand, or preparation method AND the calorie difference between interpretations would be more than ~100 kcal, ask a brief clarifying question before estimating. For unambiguous items (e.g. "a banana", "2 boiled eggs"), estimate directly without asking. When asking a clarifying question, still include the JSON block with empty food_entries and null weight_kg.
4. If they mention weight, extract the reading.
5. If they ask about a planned meal (hypothetical / "what if"), mark it as planned (not consumed).
6. If they correct a previous entry, reference its ID for update.
7. If they confirm a planned item, change it from planned to confirmed.
8. Always include a JSON block at the end of your response with any data changes.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/mihai/AI/calorie-tracker && python -m pytest backend/app/tests/test_llm_parsing.py::test_build_system_prompt_includes_clarification_instruction -v`

Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd /Users/mihai/AI/calorie-tracker && python -m pytest backend/app/tests/test_llm_parsing.py -v`

Expected: All 8 tests PASS (7 existing + 1 new)

- [ ] **Step 6: Commit**

```bash
cd /Users/mihai/AI/calorie-tracker
git add backend/app/services/llm.py backend/app/tests/test_llm_parsing.py
git commit -m "feat: add portion-clarification instruction to system prompt"
```

---

### Task 2: Add calorie reference examples to system prompt (TDD)

**Files:**
- Modify: `backend/app/tests/test_llm_parsing.py`
- Modify: `backend/app/services/llm.py` (insert new section between INSTRUCTIONS and RESPONSE FORMAT)

- [ ] **Step 1: Write failing test for calorie references**

Append to `backend/app/tests/test_llm_parsing.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/mihai/AI/calorie-tracker && python -m pytest backend/app/tests/test_llm_parsing.py::test_build_system_prompt_includes_calorie_references -v`

Expected: FAIL — `"CALORIE REFERENCE EXAMPLES"` not found in prompt.

- [ ] **Step 3: Add calorie reference examples section**

In `build_system_prompt()` in `backend/app/services/llm.py`, insert the following block between the INSTRUCTIONS section and the RESPONSE FORMAT section:

```
CALORIE REFERENCE EXAMPLES (use as calibration, not as a lookup table):
- 1 large egg (boiled): 78 kcal
- 1 cup cooked oatmeal: 150 kcal
- 1 slice whole wheat toast with butter: 130 kcal
- 1 medium banana: 105 kcal
- 100g chicken breast (grilled): 165 kcal
- 1 cup cooked white rice: 205 kcal
- 1 cup coffee with 2 tbsp whole milk: 20 kcal
- 1 medium apple: 95 kcal
- 1 slice cheese pizza (large, ~130g): 285 kcal
- 1 fast-food cheeseburger (single patty): 350 kcal
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/mihai/AI/calorie-tracker && python -m pytest backend/app/tests/test_llm_parsing.py::test_build_system_prompt_includes_calorie_references -v`

Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd /Users/mihai/AI/calorie-tracker && python -m pytest backend/app/tests/test_llm_parsing.py -v`

Expected: All 9 tests PASS (7 existing + 2 new)

- [ ] **Step 6: Commit**

```bash
cd /Users/mihai/AI/calorie-tracker
git add backend/app/services/llm.py backend/app/tests/test_llm_parsing.py
git commit -m "feat: add calorie reference examples to system prompt"
```
