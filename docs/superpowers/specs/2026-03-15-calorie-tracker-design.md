# Calorie Tracker — Design Spec

## Overview

A prompt-based calorie tracker that uses an LLM to provide a natural-language interface for daily food and weight logging. Users describe what they ate in plain language, and the system estimates calories, tracks progress toward a weight goal, and maintains a conversational daily log.

**Key differentiator:** All daily tracking is conversational (no forms, no dropdowns). The LLM acts as the interface layer — parsing food descriptions, estimating calories, and responding naturally. Onboarding is form-based to collect structured profile data.

## Target User

Solo user initially, designed for easy multi-user extension later. Full Supabase Auth from the start so adding multi-user is a configuration change, not a rewrite.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, Recharts |
| PWA | vite-plugin-pwa (mobile-first, installable) |
| Backend | Python / FastAPI |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| LLM | OpenAI API (GPT-4o) — bring your own key |

## Architecture

Backend-centric LLM approach: all LLM calls go through the FastAPI backend. The frontend sends user messages to the API, which builds the prompt (injecting user profile, today's log, calorie target), calls OpenAI, parses the structured response, persists data, and streams the reply back via SSE.

```
[React PWA] <--SSE--> [FastAPI] <--> [OpenAI API]
                          |
                     [Supabase]
                    (Auth + DB)
```

### Why Backend-Centric

- API key stays server-side (encrypted at rest, decrypted only for OpenAI calls)
- Single place for prompt engineering and structured output parsing
- Backend controls all data persistence — no split logic
- SSE streaming keeps the UX responsive

## Data Model

### users (Supabase Auth managed)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | From Supabase Auth |
| email | text | |
| created_at | timestamptz | |

### user_profiles

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID, FK → users | PK |
| age | int | |
| gender | text | male/female |
| height_cm | float | |
| weight_kg | float | Starting weight |
| activity_level | enum | sedentary, light, moderate, active, very_active |
| target_weight_kg | float | |
| daily_calorie_target | int | Auto-calculated via Mifflin-St Jeor, user-overridable |
| onboarding_completed | boolean | Default false |

### daily_logs

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK → users | |
| date | date | Unique per user per day |
| weight_kg | float, nullable | User may not weigh in every day |
| total_calories | int | Running total, updated as entries change |

### food_entries

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| daily_log_id | UUID, FK → daily_logs | |
| description | text | Raw text, e.g. "3 boiled eggs" |
| estimated_calories | int | LLM estimate, user-correctable |
| is_planned | boolean | For "what if" queries not yet confirmed |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### chat_messages

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| daily_log_id | UUID, FK → daily_logs | |
| role | text | user / assistant |
| content | text | |
| created_at | timestamptz | |

### user_api_keys

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID, FK → users | PK |
| provider | text | "openai" (extensible) |
| encrypted_key | text | Encrypted server-side |

## API Endpoints

### Auth
- `POST /auth/register` — Supabase Auth registration wrapper
- `POST /auth/login` — Supabase Auth login wrapper

### Onboarding
- `POST /onboarding` — Save profile data, auto-calculate calorie target (Mifflin-St Jeor formula + caloric deficit based on target weight), mark onboarding complete

### Chat (Core Feature)
- `POST /chat` — Main endpoint
  - Receives: user message text
  - Builds system prompt with: user profile, calorie target, today's food entries, running total
  - Calls OpenAI with instruction to respond conversationally AND return structured JSON
  - Parses response: extracts food entries (add/update/delete), weight readings, planned-to-confirmed transitions
  - Persists extracted data to database
  - Streams conversational reply via SSE

### Dashboard
- `GET /dashboard` — Today's summary (calories consumed/remaining, weight) + historical data for charts
- `GET /daily-logs` — Paginated history for trend charts

### Manual Corrections
- `PATCH /food-entries/{id}` — Manual calorie override

## LLM Prompt Strategy

### System Prompt Structure

```
You are a calorie tracking assistant. The user is tracking their daily food intake.

USER PROFILE:
- Age: {age}, Gender: {gender}, Height: {height_cm}cm
- Current weight: {latest_weight}kg, Target: {target_weight_kg}kg
- Daily calorie target: {daily_calorie_target} kcal

TODAY'S LOG ({date}):
- Weight: {today_weight or "not logged yet"}
- Food entries: {list of entries with calories}
- Total calories so far: {total} / {target} kcal

INSTRUCTIONS:
1. Respond conversationally to the user's message
2. If they mention food, estimate calories and include structured data
3. If they mention weight, extract the reading
4. If they ask about a planned meal, mark it as planned (not consumed)
5. If they correct a previous entry, reference it for update
6. Always include a JSON block in your response with any data changes

RESPONSE FORMAT:
Your conversational reply here.

```json
{
  "food_entries": [
    {"action": "add|update|delete", "id": null|"existing-id", "description": "...", "estimated_calories": 140, "is_planned": false}
  ],
  "weight_kg": null|89.2
}
```
```

### Interaction Patterns

| User says | LLM does |
|-----------|----------|
| "I had 3 boiled eggs" | Adds entry, estimates ~210 kcal |
| "sorry, I meant 2 eggs" | Updates previous entry to ~140 kcal |
| "thinking about a caesar salad 200g" | Adds planned entry (is_planned=true), gives calorie estimate and opinion |
| "yeah I'll have the salad" | Flips is_planned to false (confirmed) |
| "I'm 89.2 today" | Records weight, comments on progress |

## Frontend

### Pages

1. **Auth pages** — Register and login forms (email/password)
2. **Onboarding wizard** — Step-by-step form flow:
   - Gender → Age → Height (cm) → Current weight (kg) → Activity level
   - Review: shows auto-calculated daily calorie target (Mifflin-St Jeor + deficit)
   - Override option: let user adjust the target
   - API key input: paste OpenAI API key
3. **Main chat view** (primary screen) — Mobile-first layout:
   - Top bar: today's stats (calories consumed / target, today's weight)
   - Chat area: scrollable conversation, streamed responses
   - Input: text input at bottom with send button
4. **Dashboard** — Accessible from nav:
   - Weight trend line chart (Recharts)
   - Daily calorie bar chart (consumed vs target)
   - Weekly averages
5. **Settings** — Update profile, API key, calorie target

### PWA

- Service worker via vite-plugin-pwa
- Installable on mobile home screen
- Offline: show cached dashboard, queue chat messages for when online

## Auth & Security

- **Supabase Auth** for user management (email/password)
- **Row-Level Security (RLS)** on all tables — users can only read/write their own data
- **API key encryption:** keys encrypted server-side (e.g. Fernet symmetric encryption) before storage, decrypted only in memory when making OpenAI calls
- **FastAPI middleware** validates Supabase JWT on every request
- **HTTPS** enforced in production

## Calorie Calculation

### Mifflin-St Jeor Formula (BMR)

- Male: `10 * weight_kg + 6.25 * height_cm - 5 * age + 5`
- Female: `10 * weight_kg + 6.25 * height_cm - 5 * age - 161`

### TDEE (Total Daily Energy Expenditure)

`BMR * activity_multiplier`

| Activity Level | Multiplier |
|---------------|------------|
| Sedentary | 1.2 |
| Light | 1.375 |
| Moderate | 1.55 |
| Active | 1.725 |
| Very Active | 1.9 |

### Daily Target

`TDEE - deficit` where deficit is calculated based on a safe rate of weight loss (~0.5kg/week = ~500 kcal/day deficit). Capped at a minimum of 1200 kcal/day for safety.

## MVP Scope

**In scope:**
- User registration and auth
- Onboarding wizard with profile + calorie target calculation
- Conversational daily food/weight logging via LLM
- Calorie estimation from natural language
- Manual calorie corrections
- Planned meal queries ("what if")
- Entry editing via conversation ("sorry I meant...")
- Dashboard with weight trend + calorie charts
- Mobile-first PWA
- Bring your own OpenAI API key

**Out of scope (future):**
- Multiple LLM providers (Anthropic, Google, etc.)
- Macro breakdown (protein/carbs/fat)
- Nutritional coaching and proactive advice
- Food database integration (USDA/Open Food Facts)
- Social features
- Export/import data
- Weekly/monthly report summaries
