# Improve LLM Calorie Estimate Accuracy

**Date:** 2026-03-19
**Scope:** Backend only — prompt changes in `backend/app/services/llm.py`

## Problem

The LLM calorie estimates rely entirely on GPT-4o's built-in knowledge with no calibration or guidance. Two issues:

1. **No portion disambiguation.** "A bowl of pasta" could be 300-800 kcal. The LLM guesses rather than asking.
2. **No reference anchoring.** Without calibration examples, estimates can drift from realistic values.

## Solution

Two additions to the system prompt in `build_system_prompt()`:

### 1. Portion clarification instruction

Add after existing instruction #2:

> If the user's description is ambiguous about portion size, brand, or preparation method AND the calorie difference between interpretations would be more than ~100 kcal, ask a brief clarifying question before estimating. For unambiguous items (e.g. "a banana", "2 boiled eggs"), estimate directly without asking.

This prevents unnecessary back-and-forth for obvious items while catching the cases where ambiguity causes the most error.

When asking a clarifying question (no food logged yet), the LLM should still include the JSON block with empty `food_entries` and null `weight_kg`. The existing parsing fallback handles the case where it doesn't, but being explicit avoids inconsistency.

### 2. Few-shot calorie reference examples

Add a `CALORIE REFERENCE EXAMPLES` section between the INSTRUCTIONS and RESPONSE FORMAT blocks, with ~10 common foods and realistic calorie values:

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

These anchor the LLM's internal estimates without replacing its reasoning.

## What doesn't change

- Response JSON format (`food_entries`, `weight_kg`)
- `FoodEntryAction` / `LLMParsedData` dataclasses
- Chat endpoint logic in `chat.py`
- iOS app code
- Parsing logic and tests

## Testing

- Existing `test_llm_parsing.py` passes unchanged (format is the same)
- Manual verification: send "I had pasta" and confirm the LLM asks about portion/type before estimating
