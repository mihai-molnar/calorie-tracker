# Calorie Tracker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a prompt-based calorie tracker with LLM-powered conversational food/weight logging, onboarding wizard, and progress dashboard.

**Architecture:** FastAPI backend handles all LLM calls (backend-centric), React PWA frontend for mobile-first UX, Supabase for auth + PostgreSQL database with RLS. SSE streaming for chat responses.

**Tech Stack:** Python 3.12 / FastAPI / OpenAI SDK / Fernet encryption | React 18 / Vite / Tailwind CSS / Recharts | Supabase (Auth + DB) | pytest / Vitest

**Spec:** `docs/superpowers/specs/2026-03-15-calorie-tracker-design.md`

---

## File Structure

### Backend (`backend/`)

```
backend/
  requirements.txt
  pytest.ini
  .env.example
  app/
    __init__.py
    main.py                    # FastAPI app, CORS, lifespan
    config.py                  # Settings from env vars
    dependencies.py            # Supabase client, get_current_user dependency
    routers/
      __init__.py
      auth.py                  # POST /auth/register, login, logout
      onboarding.py            # POST /onboarding
      chat.py                  # POST /chat (SSE streaming)
      dashboard.py             # GET /dashboard, GET /daily-logs
      food_entries.py          # PATCH /food-entries/{id}
    services/
      __init__.py
      calorie.py               # BMR/TDEE/target calculation
      llm.py                   # Prompt building, OpenAI call, response parsing
      crypto.py                # API key encrypt/decrypt (Fernet)
    tests/
      __init__.py
      conftest.py              # Shared fixtures
      test_calorie.py
      test_crypto.py
      test_llm_parsing.py
      test_auth.py
      test_onboarding.py
      test_chat.py
      test_dashboard.py
      test_food_entries.py
```

### Frontend (`frontend/`)

```
frontend/
  package.json
  vite.config.ts
  tailwind.config.js
  tsconfig.json
  index.html
  public/
    manifest.json
  src/
    main.tsx
    App.tsx
    lib/
      api.ts                   # Fetch wrapper for backend API
      supabase.ts              # Supabase client init
    contexts/
      AuthContext.tsx           # Auth state provider
    hooks/
      useChat.ts               # Chat SSE + message state
      useDashboard.ts          # Dashboard data fetching
    pages/
      Login.tsx
      Register.tsx
      Onboarding.tsx
      Chat.tsx
      Dashboard.tsx
      Settings.tsx
    components/
      ProtectedRoute.tsx       # Redirect if not authed / not onboarded
      Layout.tsx               # Nav bar + content area
      StatsBar.tsx             # Today's calories/weight summary
      ChatMessage.tsx          # Single chat bubble
      WeightChart.tsx          # Recharts line chart
      CalorieChart.tsx         # Recharts bar chart
```

### Supabase (`supabase/`)

```
supabase/
  config.toml
  migrations/
    20260315000001_initial_schema.sql
```

---

## Chunk 1: Project Scaffolding + Database

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/pytest.ini`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
supabase==2.11.0
openai==1.58.1
cryptography==44.0.0
email-validator==2.2.0
python-dotenv==1.0.1
pydantic-settings==2.7.1
sse-starlette==2.2.1
httpx==0.28.1
pytest==8.3.4
pytest-asyncio==0.25.0
pytest-httpx==0.35.0
```

- [ ] **Step 2: Create `backend/.env.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-fernet-key-base64
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 3: Create `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
pythonpath = .
```

- [ ] **Step 4: Create `backend/app/__init__.py`**

Empty file.

- [ ] **Step 5: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    encryption_key: str
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 6: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="Calorie Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 7: Install dependencies and verify**

Run: `cd backend && pip install -r requirements.txt`

- [ ] **Step 8: Create `.gitignore` at project root**

```
# Python
__pycache__/
*.pyc
.env
venv/
.venv/

# Node
node_modules/
dist/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
```

- [ ] **Step 9: Commit**

```bash
git add .gitignore backend/
git commit -m "feat: scaffold backend project with FastAPI"
```

---

### Task 2: Initialize Frontend Project

**Files:**
- Create: `frontend/` (via Vite scaffold)
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tailwind.config.js`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/supabase.ts`

- [ ] **Step 1: Scaffold React + TypeScript project**

```bash
cd frontend && npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js tailwindcss @tailwindcss/vite recharts react-router-dom
npm install -D @types/react-router-dom vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Tailwind in `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

- [ ] **Step 4: Replace `frontend/src/index.css` with Tailwind**

```css
@import "tailwindcss";
```

- [ ] **Step 5: Create `frontend/src/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 6: Create `frontend/src/lib/api.ts`**

```typescript
import { supabase } from "./supabase";

const API_BASE = "/api";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
```

- [ ] **Step 7: Create `.env.example` for frontend**

Create `frontend/.env.example`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 8: Verify dev server starts**

Run: `npm run dev` — confirm it loads without errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with React, Vite, Tailwind"
```

---

### Task 3: Supabase Database Schema

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260315000001_initial_schema.sql`

- [ ] **Step 1: Create `supabase/config.toml`**

```toml
[project]
id = "your-project-id"
```

- [ ] **Step 2: Create migration file**

```sql
-- User profiles
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age int not null,
  gender text not null check (gender in ('male', 'female', 'other')),
  height_cm real not null,
  weight_kg real not null,
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  target_weight_kg real not null,
  daily_calorie_target int not null,
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily logs
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg real,
  total_calories int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Food entries
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  estimated_calories int not null,
  is_planned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- API keys
create table public.user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'openai',
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_daily_logs_user_date on public.daily_logs(user_id, date);
create index idx_food_entries_daily_log on public.food_entries(daily_log_id);
create index idx_chat_messages_daily_log on public.chat_messages(daily_log_id);

-- Row Level Security
alter table public.user_profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.food_entries enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_api_keys enable row level security;

create policy "Users can manage own profile"
  on public.user_profiles for all
  using (auth.uid() = user_id);

create policy "Users can manage own daily logs"
  on public.daily_logs for all
  using (auth.uid() = user_id);

create policy "Users can manage own food entries"
  on public.food_entries for all
  using (auth.uid() = user_id);

create policy "Users can manage own chat messages"
  on public.chat_messages for all
  using (daily_log_id in (
    select id from public.daily_logs where user_id = auth.uid()
  ));

create policy "Users can manage own API keys"
  on public.user_api_keys for all
  using (auth.uid() = user_id);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema migration with RLS"
```

---

## Chunk 2: Backend Core Services

### Task 4: Calorie Calculation Service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/calorie.py`
- Create: `backend/app/tests/__init__.py`
- Create: `backend/app/tests/test_calorie.py`

- [ ] **Step 1: Write failing tests**

Create `backend/app/tests/__init__.py` (empty) and `backend/app/tests/conftest.py` (empty).

Create `backend/app/tests/test_calorie.py`:

```python
from app.services.calorie import calculate_bmr, calculate_tdee, calculate_daily_target


def test_bmr_male():
    # 30yo male, 80kg, 180cm
    bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="male")
    # 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    assert bmr == 1780


def test_bmr_female():
    # 25yo female, 65kg, 165cm
    bmr = calculate_bmr(weight_kg=65, height_cm=165, age=25, gender="female")
    # 10*65 + 6.25*165 - 5*25 - 161 = 650 + 1031.25 - 125 - 161 = 1395.25
    assert bmr == 1395.25


def test_bmr_other_averages_male_female():
    bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="other")
    male_bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="male")
    female_bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="female")
    assert bmr == (male_bmr + female_bmr) / 2


def test_tdee_moderate():
    bmr = 1780
    tdee = calculate_tdee(bmr, activity_level="moderate")
    assert tdee == bmr * 1.55


def test_daily_target_with_deficit():
    target = calculate_daily_target(
        weight_kg=90, height_cm=180, age=30, gender="male",
        activity_level="moderate", target_weight_kg=80
    )
    # Should be TDEE - 500, but not below 1200
    bmr = 1780 + 10 * 10  # weight is 90 not 80 -> 10*90=900, so 900+1125-150+5=1880
    expected_tdee = 1880 * 1.55  # 2914
    expected = int(expected_tdee - 500)  # 2414
    assert target == expected


def test_daily_target_floor_1200():
    # Very low TDEE scenario
    target = calculate_daily_target(
        weight_kg=45, height_cm=150, age=60, gender="female",
        activity_level="sedentary", target_weight_kg=40
    )
    # BMR = 10*45 + 6.25*150 - 5*60 - 161 = 450+937.5-300-161 = 926.5
    # TDEE = 926.5 * 1.2 = 1111.8
    # Target = 1111.8 - 500 = 611.8 -> capped at 1200
    assert target == 1200
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest app/tests/test_calorie.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `backend/app/services/__init__.py`**

Empty file.

- [ ] **Step 4: Implement `backend/app/services/calorie.py`**

```python
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

MINIMUM_DAILY_CALORIES = 1200
DEFAULT_DEFICIT = 500


def calculate_bmr(
    weight_kg: float, height_cm: float, age: int, gender: str
) -> float:
    if gender == "male":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    elif gender == "female":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        male = calculate_bmr(weight_kg, height_cm, age, "male")
        female = calculate_bmr(weight_kg, height_cm, age, "female")
        return (male + female) / 2


def calculate_tdee(bmr: float, activity_level: str) -> float:
    return bmr * ACTIVITY_MULTIPLIERS[activity_level]


def calculate_daily_target(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str,
    activity_level: str,
    target_weight_kg: float,
) -> int:
    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)
    target = int(tdee - DEFAULT_DEFICIT)
    return max(target, MINIMUM_DAILY_CALORIES)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_calorie.py -v`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/ backend/app/tests/
git commit -m "feat: add calorie calculation service with BMR/TDEE"
```

---

### Task 5: Crypto Service (API Key Encryption)

**Files:**
- Create: `backend/app/services/crypto.py`
- Create: `backend/app/tests/test_crypto.py`

- [ ] **Step 1: Create `.env` for testing** (if not exists)

Generate a Fernet key and create `backend/.env`:
```bash
cd backend && python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Copy output to `.env` as `ENCRYPTION_KEY=...`. Fill in dummy values for other required env vars (SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET can be placeholder strings for unit tests).

- [ ] **Step 2: Write failing tests**

Create `backend/app/tests/test_crypto.py`:

```python
from app.services.crypto import encrypt_api_key, decrypt_api_key


def test_encrypt_decrypt_roundtrip():
    key = "sk-test-1234567890abcdef"
    encrypted = encrypt_api_key(key)
    assert encrypted != key
    assert decrypt_api_key(encrypted) == key


def test_encrypted_value_is_different_each_time():
    key = "sk-test-1234567890abcdef"
    e1 = encrypt_api_key(key)
    e2 = encrypt_api_key(key)
    # Fernet uses random IV, so encryptions differ
    assert e1 != e2


def test_decrypt_both_return_same_value():
    key = "sk-test-1234567890abcdef"
    e1 = encrypt_api_key(key)
    e2 = encrypt_api_key(key)
    assert decrypt_api_key(e1) == decrypt_api_key(e2) == key
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest app/tests/test_crypto.py -v`
Expected: FAIL — module `app.services.crypto` not found

- [ ] **Step 4: Implement `backend/app/services/crypto.py`**

```python
from cryptography.fernet import Fernet

from app.config import settings

_fernet = Fernet(settings.encryption_key.encode())


def encrypt_api_key(plain_key: str) -> str:
    return _fernet.encrypt(plain_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    return _fernet.decrypt(encrypted_key.encode()).decode()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_crypto.py -v`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/crypto.py backend/app/tests/test_crypto.py
git commit -m "feat: add API key encryption service using Fernet"
```

---

### Task 6: LLM Response Parsing Service

**Files:**
- Create: `backend/app/services/llm.py`
- Create: `backend/app/tests/test_llm_parsing.py`

- [ ] **Step 1: Write failing tests**

Create `backend/app/tests/test_llm_parsing.py`:

```python
import json
from app.services.llm import parse_llm_response, build_system_prompt, LLMParsedData


def test_parse_response_with_valid_json():
    response = """Great, I've logged 3 boiled eggs for you! That's about 210 calories.

```json
{
  "food_entries": [
    {"action": "add", "id": null, "description": "3 boiled eggs", "estimated_calories": 210, "is_planned": false}
  ],
  "weight_kg": null
}
```"""
    text, data = parse_llm_response(response)
    assert "3 boiled eggs" in text
    assert data is not None
    assert len(data.food_entries) == 1
    assert data.food_entries[0].action == "add"
    assert data.food_entries[0].estimated_calories == 210
    assert data.weight_kg is None


def test_parse_response_with_weight():
    response = """Logged your weight at 89.2 kg. You're making progress!

```json
{
  "food_entries": [],
  "weight_kg": 89.2
}
```"""
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
    response = """Here's your update.

```json
{not valid json}
```"""
    text, data = parse_llm_response(response)
    assert "Here's your update." in text
    assert data is None


def test_parse_response_update_action():
    response = """Updated to 2 eggs.

```json
{
  "food_entries": [
    {"action": "update", "id": "abc-123", "description": "2 boiled eggs", "estimated_calories": 140, "is_planned": false}
  ],
  "weight_kg": null
}
```"""
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest app/tests/test_llm_parsing.py -v`
Expected: FAIL

- [ ] **Step 3: Implement `backend/app/services/llm.py`**

```python
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
    """Split LLM response into conversational text and structured data."""
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
    age: int,
    gender: str,
    height_cm: float,
    latest_weight: float,
    target_weight_kg: float,
    daily_calorie_target: int,
    date: str,
    today_weight: float | None,
    food_entries: list[dict],
    total_calories: int,
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
1. Respond conversationally to the user's message.
2. If they mention food they ate, estimate calories and include structured data.
3. If they mention weight, extract the reading.
4. If they ask about a planned meal (hypothetical / "what if"), mark it as planned (not consumed).
5. If they correct a previous entry, reference its ID for update.
6. If they confirm a planned item, change it from planned to confirmed.
7. Always include a JSON block at the end of your response with any data changes.

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_llm_parsing.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/llm.py backend/app/tests/test_llm_parsing.py
git commit -m "feat: add LLM prompt builder and response parser"
```

---

### Task 7: Supabase Dependencies & Auth Middleware

**Files:**
- Create: `backend/app/dependencies.py`
- Create: `backend/app/tests/test_auth.py`

- [ ] **Step 1: Write failing tests**

Create `backend/app/tests/test_auth.py`:

```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_no_auth_required():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run tests to verify they pass** (health endpoint needs no auth)

Run: `cd backend && python -m pytest app/tests/test_auth.py -v`
Expected: PASS

- [ ] **Step 3: Implement `backend/app/dependencies.py`**

```python
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client, Client

from app.config import settings

security = HTTPBearer()

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    return _supabase


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Validate Supabase JWT and return user_id."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no sub claim",
            )
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
```

- [ ] **Step 4: Add PyJWT to requirements.txt**

Add `PyJWT==2.10.1` to `backend/requirements.txt` and install:
```bash
pip install PyJWT==2.10.1
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/dependencies.py backend/app/tests/test_auth.py backend/requirements.txt
git commit -m "feat: add Supabase client and JWT auth middleware"
```

---

## Chunk 3: Backend API Endpoints

### Task 8: Auth Router

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py` (register router)

- [ ] **Step 1: Create `backend/app/routers/__init__.py`**

Empty file.

- [ ] **Step 2: Implement `backend/app/routers/auth.py`**

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.dependencies import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str


@router.post("/register", response_model=AuthResponse)
async def register(body: AuthRequest, supabase: Client = Depends(get_supabase)):
    try:
        result = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
        if not result.user:
            raise HTTPException(status_code=400, detail="Registration failed")
        return AuthResponse(
            access_token=result.session.access_token,
            user_id=result.user.id,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(body: AuthRequest, supabase: Client = Depends(get_supabase)):
    try:
        result = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return AuthResponse(
            access_token=result.session.access_token,
            user_id=result.user.id,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase)):
    # Client-side handles session clearing; this is a no-op confirmation
    return {"message": "Logged out"}
```

- [ ] **Step 3: Register router in `backend/app/main.py`**

Add after CORS middleware:

```python
from app.routers import auth

app.include_router(auth.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/ backend/app/main.py
git commit -m "feat: add auth router (register, login, logout)"
```

---

### Task 9: Onboarding Router

**Files:**
- Create: `backend/app/routers/onboarding.py`
- Create: `backend/app/tests/test_onboarding.py`
- Modify: `backend/app/main.py` (register router)

- [ ] **Step 1: Write failing test**

Create `backend/app/tests/test_onboarding.py`:

```python
from app.services.calorie import calculate_daily_target


def test_onboarding_calorie_calculation():
    """Verify the onboarding flow would compute correct calories."""
    target = calculate_daily_target(
        weight_kg=90, height_cm=180, age=30, gender="male",
        activity_level="moderate", target_weight_kg=80
    )
    assert target > 1200
    assert target < 4000
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd backend && python -m pytest app/tests/test_onboarding.py -v`
Expected: PASS

- [ ] **Step 3: Implement `backend/app/routers/onboarding.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from supabase import Client

from app.dependencies import get_current_user, get_supabase
from app.services.calorie import calculate_daily_target
from app.services.crypto import encrypt_api_key

router = APIRouter(tags=["onboarding"])


class OnboardingRequest(BaseModel):
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    activity_level: str
    target_weight_kg: float
    daily_calorie_target: int | None = None  # If None, auto-calculate
    timezone: str = "UTC"
    openai_api_key: str

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        if v not in ("male", "female", "other"):
            raise ValueError("gender must be male, female, or other")
        return v

    @field_validator("activity_level")
    @classmethod
    def validate_activity_level(cls, v: str) -> str:
        valid = ("sedentary", "light", "moderate", "active", "very_active")
        if v not in valid:
            raise ValueError(f"activity_level must be one of {valid}")
        return v

    @field_validator("target_weight_kg")
    @classmethod
    def validate_target_less_than_current(cls, v: float, info) -> float:
        if "weight_kg" in info.data and v >= info.data["weight_kg"]:
            raise ValueError("target_weight_kg must be less than current weight_kg (MVP supports weight loss only)")
        return v


class OnboardingResponse(BaseModel):
    daily_calorie_target: int
    message: str


@router.post("/onboarding", response_model=OnboardingResponse)
async def onboarding(
    body: OnboardingRequest,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    calorie_target = body.daily_calorie_target or calculate_daily_target(
        weight_kg=body.weight_kg,
        height_cm=body.height_cm,
        age=body.age,
        gender=body.gender,
        activity_level=body.activity_level,
        target_weight_kg=body.target_weight_kg,
    )

    # Save profile
    supabase.table("user_profiles").upsert({
        "user_id": user_id,
        "age": body.age,
        "gender": body.gender,
        "height_cm": body.height_cm,
        "weight_kg": body.weight_kg,
        "activity_level": body.activity_level,
        "target_weight_kg": body.target_weight_kg,
        "daily_calorie_target": calorie_target,
        "timezone": body.timezone,
        "onboarding_completed": True,
    }).execute()

    # Save encrypted API key
    encrypted = encrypt_api_key(body.openai_api_key)
    supabase.table("user_api_keys").upsert({
        "user_id": user_id,
        "provider": "openai",
        "encrypted_key": encrypted,
    }).execute()

    return OnboardingResponse(
        daily_calorie_target=calorie_target,
        message="Onboarding complete! You're all set to start tracking.",
    )
```

- [ ] **Step 4: Register router in `backend/app/main.py`**

```python
from app.routers import auth, onboarding

app.include_router(auth.router)
app.include_router(onboarding.router)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/onboarding.py backend/app/tests/test_onboarding.py backend/app/main.py
git commit -m "feat: add onboarding endpoint with calorie calculation"
```

---

### Task 10: Chat Router (Core Feature)

**Files:**
- Create: `backend/app/routers/chat.py`
- Create: `backend/app/tests/test_chat.py`
- Modify: `backend/app/main.py` (register router)

- [ ] **Step 1: Write failing test for chat data processing**

Create `backend/app/tests/test_chat.py`:

```python
from app.services.llm import parse_llm_response


def test_chat_processes_add_entry():
    response = """Logged your eggs!

```json
{
  "food_entries": [
    {"action": "add", "id": null, "description": "2 boiled eggs", "estimated_calories": 140, "is_planned": false}
  ],
  "weight_kg": null
}
```"""
    text, data = parse_llm_response(response)
    assert data is not None
    assert data.food_entries[0].action == "add"
    assert data.food_entries[0].estimated_calories == 140


def test_chat_processes_weight_and_food():
    response = """Got it — 89.2 kg and 2 eggs.

```json
{
  "food_entries": [
    {"action": "add", "id": null, "description": "2 boiled eggs", "estimated_calories": 140, "is_planned": false}
  ],
  "weight_kg": 89.2
}
```"""
    text, data = parse_llm_response(response)
    assert data is not None
    assert data.weight_kg == 89.2
    assert len(data.food_entries) == 1
```

- [ ] **Step 2: Run tests to verify they pass** (uses existing llm.py)

Run: `cd backend && python -m pytest app/tests/test_chat.py -v`
Expected: PASS

- [ ] **Step 3: Implement `backend/app/routers/chat.py`**

```python
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from sse_starlette.sse import EventSourceResponse
from supabase import Client

from app.dependencies import get_current_user, get_supabase
from app.services.crypto import decrypt_api_key
from app.services.llm import build_system_prompt, parse_llm_response

router = APIRouter(tags=["chat"])

MAX_CHAT_HISTORY = 20
RATE_LIMIT_PER_MINUTE = 30

# Simple in-memory rate limiter (sufficient for single-user MVP)
_rate_limit_store: dict[str, list[float]] = {}


def _check_rate_limit(user_id: str) -> None:
    """Enforce per-user rate limit on chat messages."""
    import time

    now = time.time()
    if user_id not in _rate_limit_store:
        _rate_limit_store[user_id] = []

    # Remove entries older than 60 seconds
    _rate_limit_store[user_id] = [
        t for t in _rate_limit_store[user_id] if now - t < 60
    ]

    if len(_rate_limit_store[user_id]) >= RATE_LIMIT_PER_MINUTE:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=429, detail="Rate limit exceeded. Max 30 messages per minute."
        )

    _rate_limit_store[user_id].append(now)


class ChatRequest(BaseModel):
    message: str


def _get_user_date(supabase: Client, user_id: str) -> str:
    """Get today's date in user's timezone."""
    profile = (
        supabase.table("user_profiles")
        .select("timezone")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    tz_name = profile.data.get("timezone", "UTC")

    from zoneinfo import ZoneInfo
    import datetime as dt

    user_now = dt.datetime.now(ZoneInfo(tz_name))
    return user_now.strftime("%Y-%m-%d")


def _get_or_create_daily_log(supabase: Client, user_id: str, date: str) -> dict:
    """Get or create today's daily log."""
    result = (
        supabase.table("daily_logs")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", date)
        .execute()
    )
    if result.data:
        return result.data[0]

    new_log = (
        supabase.table("daily_logs")
        .insert({"user_id": user_id, "date": date, "total_calories": 0})
        .execute()
    )
    return new_log.data[0]


def _recalculate_total_calories(supabase: Client, daily_log_id: str) -> int:
    """Sum confirmed (non-planned) food entries for the day."""
    entries = (
        supabase.table("food_entries")
        .select("estimated_calories")
        .eq("daily_log_id", daily_log_id)
        .eq("is_planned", False)
        .execute()
    )
    total = sum(e["estimated_calories"] for e in entries.data)
    supabase.table("daily_logs").update({"total_calories": total}).eq(
        "id", daily_log_id
    ).execute()
    return total


def _apply_data_changes(
    supabase: Client, user_id: str, daily_log_id: str, data
) -> None:
    """Apply parsed LLM data changes to the database."""
    if data is None:
        return

    # Apply weight
    if data.weight_kg is not None:
        supabase.table("daily_logs").update({"weight_kg": data.weight_kg}).eq(
            "id", daily_log_id
        ).execute()

    # Apply food entries
    for entry in data.food_entries:
        if entry.action == "add":
            supabase.table("food_entries").insert({
                "daily_log_id": daily_log_id,
                "user_id": user_id,
                "description": entry.description,
                "estimated_calories": entry.estimated_calories,
                "is_planned": entry.is_planned,
            }).execute()
        elif entry.action == "update" and entry.id:
            # Validate entry belongs to this daily log
            existing = (
                supabase.table("food_entries")
                .select("id")
                .eq("id", entry.id)
                .eq("daily_log_id", daily_log_id)
                .execute()
            )
            if existing.data:
                supabase.table("food_entries").update({
                    "description": entry.description,
                    "estimated_calories": entry.estimated_calories,
                    "is_planned": entry.is_planned,
                }).eq("id", entry.id).execute()
        elif entry.action == "delete" and entry.id:
            existing = (
                supabase.table("food_entries")
                .select("id")
                .eq("id", entry.id)
                .eq("daily_log_id", daily_log_id)
                .execute()
            )
            if existing.data:
                supabase.table("food_entries").delete().eq("id", entry.id).execute()

    # Recalculate total
    _recalculate_total_calories(supabase, daily_log_id)


@router.post("/chat")
async def chat(
    body: ChatRequest,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Rate limit check
    _check_rate_limit(user_id)

    # Get user profile
    profile = (
        supabase.table("user_profiles")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not profile.data or not profile.data.get("onboarding_completed"):
        raise HTTPException(status_code=400, detail="Onboarding not completed")

    # Get API key
    api_key_row = (
        supabase.table("user_api_keys")
        .select("encrypted_key")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not api_key_row.data:
        raise HTTPException(status_code=400, detail="No API key configured")

    api_key = decrypt_api_key(api_key_row.data["encrypted_key"])

    # Get today's date in user timezone
    date = _get_user_date(supabase, user_id)

    # Get or create daily log
    daily_log = _get_or_create_daily_log(supabase, user_id, date)
    daily_log_id = daily_log["id"]

    # Get today's food entries
    food_entries = (
        supabase.table("food_entries")
        .select("id, description, estimated_calories, is_planned")
        .eq("daily_log_id", daily_log_id)
        .order("created_at")
        .execute()
    ).data

    # Get chat history (last N messages)
    chat_history = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("daily_log_id", daily_log_id)
        .order("created_at", desc=True)
        .limit(MAX_CHAT_HISTORY)
        .execute()
    ).data
    chat_history.reverse()

    # Build system prompt
    p = profile.data
    system_prompt = build_system_prompt(
        age=p["age"],
        gender=p["gender"],
        height_cm=p["height_cm"],
        latest_weight=daily_log.get("weight_kg") or p["weight_kg"],
        target_weight_kg=p["target_weight_kg"],
        daily_calorie_target=p["daily_calorie_target"],
        date=date,
        today_weight=daily_log.get("weight_kg"),
        food_entries=food_entries,
        total_calories=daily_log.get("total_calories", 0),
    )

    # Save user message
    supabase.table("chat_messages").insert({
        "daily_log_id": daily_log_id,
        "role": "user",
        "content": body.message,
    }).execute()

    # Build messages for OpenAI
    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": body.message})

    # Call OpenAI (non-streaming first, then return via SSE)
    client = OpenAI(api_key=api_key)

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
        )
        full_response = completion.choices[0].message.content
    except Exception as e:
        error_msg = f"OpenAI API error: {str(e)}"
        # Save error as assistant message
        supabase.table("chat_messages").insert({
            "daily_log_id": daily_log_id,
            "role": "assistant",
            "content": error_msg,
        }).execute()
        raise HTTPException(status_code=502, detail=error_msg)

    # Parse response
    text, data = parse_llm_response(full_response)

    # Apply data changes
    _apply_data_changes(supabase, user_id, daily_log_id, data)

    # If parsing failed, append note
    display_text = text
    if data is None and body.message.strip():
        # Check if we expected data (user mentioned food/weight)
        display_text = text

    # Save assistant message
    supabase.table("chat_messages").insert({
        "daily_log_id": daily_log_id,
        "role": "assistant",
        "content": full_response,
    }).execute()

    # Return via SSE for frontend compatibility
    async def event_generator():
        yield {"event": "message", "data": json.dumps({
            "text": display_text,
            "data_applied": data is not None,
            "total_calories": _recalculate_total_calories(supabase, daily_log_id) if data else daily_log.get("total_calories", 0),
            "weight_kg": data.weight_kg if data else daily_log.get("weight_kg"),
        })}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
```

- [ ] **Step 4: Register router in `backend/app/main.py`**

```python
from app.routers import auth, onboarding, chat

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(chat.router)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/chat.py backend/app/tests/test_chat.py backend/app/main.py
git commit -m "feat: add chat endpoint with LLM integration and SSE response"
```

---

### Task 11: Dashboard & Food Entries Routers

**Files:**
- Create: `backend/app/routers/dashboard.py`
- Create: `backend/app/routers/food_entries.py`
- Modify: `backend/app/main.py` (register routers)

- [ ] **Step 1: Implement `backend/app/routers/dashboard.py`**

```python
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_current_user, get_supabase

router = APIRouter(tags=["dashboard"])


class TodaySummary(BaseModel):
    date: str
    weight_kg: float | None
    total_calories: int
    daily_calorie_target: int
    calories_remaining: int


class DailyLogEntry(BaseModel):
    date: str
    weight_kg: float | None
    total_calories: int


class DashboardResponse(BaseModel):
    today: TodaySummary
    history: list[DailyLogEntry]


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    from app.routers.chat import _get_user_date, _get_or_create_daily_log

    # Get profile
    profile = (
        supabase.table("user_profiles")
        .select("daily_calorie_target, timezone")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    target = profile.data["daily_calorie_target"]

    # Get today's log
    date = _get_user_date(supabase, user_id)
    daily_log = _get_or_create_daily_log(supabase, user_id, date)

    today = TodaySummary(
        date=date,
        weight_kg=daily_log.get("weight_kg"),
        total_calories=daily_log.get("total_calories", 0),
        daily_calorie_target=target,
        calories_remaining=max(0, target - daily_log.get("total_calories", 0)),
    )

    # Get last 30 days of history
    history_data = (
        supabase.table("daily_logs")
        .select("date, weight_kg, total_calories")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(30)
        .execute()
    )

    history = [
        DailyLogEntry(
            date=d["date"],
            weight_kg=d.get("weight_kg"),
            total_calories=d.get("total_calories", 0),
        )
        for d in history_data.data
    ]

    return DashboardResponse(today=today, history=history)


@router.get("/daily-logs", response_model=list[DailyLogEntry])
async def daily_logs(
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(default=30, le=365),
    offset: int = Query(default=0, ge=0),
):
    result = (
        supabase.table("daily_logs")
        .select("date, weight_kg, total_calories")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return [
        DailyLogEntry(
            date=d["date"],
            weight_kg=d.get("weight_kg"),
            total_calories=d.get("total_calories", 0),
        )
        for d in result.data
    ]
```

- [ ] **Step 2: Implement `backend/app/routers/food_entries.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_current_user, get_supabase

router = APIRouter(tags=["food_entries"])


class FoodEntryPatch(BaseModel):
    estimated_calories: int


@router.patch("/food-entries/{entry_id}")
async def patch_food_entry(
    entry_id: str,
    body: FoodEntryPatch,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verify ownership
    existing = (
        supabase.table("food_entries")
        .select("id, daily_log_id")
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Food entry not found")

    # Update calories
    supabase.table("food_entries").update({
        "estimated_calories": body.estimated_calories,
    }).eq("id", entry_id).execute()

    # Recalculate daily total
    from app.routers.chat import _recalculate_total_calories

    daily_log_id = existing.data[0]["daily_log_id"]
    new_total = _recalculate_total_calories(supabase, daily_log_id)

    return {"message": "Updated", "new_total_calories": new_total}
```

- [ ] **Step 3: Create `backend/app/routers/settings.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.dependencies import get_current_user, get_supabase
from app.services.crypto import encrypt_api_key

router = APIRouter(prefix="/settings", tags=["settings"])


class UpdateApiKeyRequest(BaseModel):
    openai_api_key: str


@router.patch("/api-key")
async def update_api_key(
    body: UpdateApiKeyRequest,
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    encrypted = encrypt_api_key(body.openai_api_key)
    supabase.table("user_api_keys").update({
        "encrypted_key": encrypted,
    }).eq("user_id", user_id).execute()

    return {"message": "API key updated"}
```

- [ ] **Step 4: Register routers in `backend/app/main.py`**

```python
from app.routers import auth, onboarding, chat, dashboard, food_entries, settings

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(food_entries.router)
app.include_router(settings.router)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/dashboard.py backend/app/routers/food_entries.py backend/app/routers/settings.py backend/app/main.py
git commit -m "feat: add dashboard, food entries, and settings endpoints"
```

---

## Chunk 4: Frontend Auth & Onboarding

### Task 12: Auth Context & Protected Routes

**Files:**
- Create: `frontend/src/contexts/AuthContext.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/contexts/AuthContext.tsx`**

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Create `frontend/src/components/ProtectedRoute.tsx`**

```typescript
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function checkOnboarding() {
      try {
        const res = await apiFetch("/dashboard");
        setOnboardingCompleted(res.ok);
      } catch {
        setOnboardingCompleted(false);
      }
      setOnboardingChecked(true);
    }
    checkOnboarding();
  }, [session]);

  if (loading || (session && !onboardingChecked)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed (unless already on onboarding page)
  if (!onboardingCompleted && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect away from onboarding if already completed
  if (onboardingCompleted && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Set up routing in `frontend/src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Onboarding } from "./pages/Onboarding";
import { Chat } from "./pages/Chat";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { Layout } from "./components/Layout";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Chat />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Create placeholder pages**

Create stub files for each page (`Login.tsx`, `Register.tsx`, `Onboarding.tsx`, `Chat.tsx`, `Dashboard.tsx`, `Settings.tsx`) in `frontend/src/pages/`. Each exports a named component with a simple div placeholder.

Example `frontend/src/pages/Login.tsx`:
```typescript
export function Login() {
  return <div>Login page</div>;
}
```

Repeat for all pages.

- [ ] **Step 5: Create `frontend/src/components/Layout.tsx`**

```typescript
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Layout() {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? "text-green-600" : "text-gray-500"}`
            }
          >
            <span className="text-lg">💬</span>
            <span>Chat</span>
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? "text-green-600" : "text-gray-500"}`
            }
          >
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? "text-green-600" : "text-gray-500"}`
            }
          >
            <span className="text-lg">⚙️</span>
            <span>Settings</span>
          </NavLink>
          <button
            onClick={signOut}
            className="flex flex-col items-center text-xs text-gray-500"
          >
            <span className="text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add auth context, routing, layout with bottom nav"
```

---

### Task 13: Login & Register Pages

**Files:**
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/pages/Register.tsx`

- [ ] **Step 1: Implement `frontend/src/pages/Register.tsx`**

```typescript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/onboarding");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Start tracking your calories</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-green-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `frontend/src/pages/Login.tsx`**

```typescript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-1">Log in to continue tracking</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-green-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx
git commit -m "feat: implement login and register pages"
```

---

### Task 14: Onboarding Page

**Files:**
- Modify: `frontend/src/pages/Onboarding.tsx`

- [ ] **Step 1: Implement `frontend/src/pages/Onboarding.tsx`**

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (office job, little exercise)" },
  { value: "light", label: "Light (exercise 1-3 days/week)" },
  { value: "moderate", label: "Moderate (exercise 3-5 days/week)" },
  { value: "active", label: "Active (exercise 6-7 days/week)" },
  { value: "very_active", label: "Very Active (physical job + exercise)" },
];

type Step = "gender" | "age" | "height" | "weight" | "activity" | "target" | "review" | "apikey";

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("gender");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [calorieOverride, setCalorieOverride] = useState("");
  const [apiKey, setApiKey] = useState("");

  const calculatePreview = () => {
    // Mifflin-St Jeor + TDEE - 500
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const a = parseInt(age);
    const multipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    };

    let bmr: number;
    if (gender === "male") bmr = 10 * w + 6.25 * h - 5 * a + 5;
    else if (gender === "female") bmr = 10 * w + 6.25 * h - 5 * a - 161;
    else bmr = ((10 * w + 6.25 * h - 5 * a + 5) + (10 * w + 6.25 * h - 5 * a - 161)) / 2;

    const tdee = bmr * (multipliers[activityLevel] || 1.2);
    const target = Math.max(1200, Math.round(tdee - 500));
    setCalorieTarget(target);
    setCalorieOverride(String(target));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const res = await apiFetch("/onboarding", {
      method: "POST",
      body: JSON.stringify({
        age: parseInt(age),
        gender,
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        activity_level: activityLevel,
        target_weight_kg: parseFloat(targetWeightKg),
        daily_calorie_target: parseInt(calorieOverride),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        openai_api_key: apiKey,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.detail || "Something went wrong");
      setLoading(false);
      return;
    }

    navigate("/");
  };

  const steps: Record<Step, { title: string; next: Step | null; prev: Step | null }> = {
    gender: { title: "What's your gender?", next: "age", prev: null },
    age: { title: "How old are you?", next: "height", prev: "gender" },
    height: { title: "What's your height?", next: "weight", prev: "age" },
    weight: { title: "What's your current weight?", next: "activity", prev: "height" },
    activity: { title: "What's your activity level?", next: "target", prev: "weight" },
    target: { title: "What's your target weight?", next: "review", prev: "activity" },
    review: { title: "Your daily calorie target", next: "apikey", prev: "target" },
    apikey: { title: "Connect OpenAI", next: null, prev: "review" },
  };

  const goNext = () => {
    const next = steps[step].next;
    if (next === "review") calculatePreview();
    if (next) setStep(next);
  };

  const goPrev = () => {
    const prev = steps[step].prev;
    if (prev) setStep(prev);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case "gender": return !!gender;
      case "age": return !!age && parseInt(age) > 0;
      case "height": return !!heightCm && parseFloat(heightCm) > 0;
      case "weight": return !!weightKg && parseFloat(weightKg) > 0;
      case "activity": return !!activityLevel;
      case "target": return !!targetWeightKg && parseFloat(targetWeightKg) < parseFloat(weightKg);
      case "review": return !!calorieOverride && parseInt(calorieOverride) >= 1200;
      case "apikey": return apiKey.startsWith("sk-");
      default: return false;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-bold text-gray-900 text-center">
          {steps[step].title}
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          {step === "gender" && (
            <div className="flex gap-3">
              {["male", "female", "other"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 rounded-lg border font-medium capitalize ${
                    gender === g
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {step === "age" && (
            <input
              type="number"
              placeholder="Age in years"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            />
          )}

          {step === "height" && (
            <input
              type="number"
              placeholder="Height in cm"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            />
          )}

          {step === "weight" && (
            <input
              type="number"
              step="0.1"
              placeholder="Weight in kg"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            />
          )}

          {step === "activity" && (
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setActivityLevel(level.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border ${
                    activityLevel === level.value
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          )}

          {step === "target" && (
            <div>
              <input
                type="number"
                step="0.1"
                placeholder="Target weight in kg"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              />
              {targetWeightKg && parseFloat(targetWeightKg) >= parseFloat(weightKg) && (
                <p className="text-red-500 text-sm mt-2">
                  Target must be less than current weight ({weightKg} kg)
                </p>
              )}
            </div>
          )}

          {step === "review" && calorieTarget && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Recommended daily intake</p>
                <p className="text-3xl font-bold text-green-700">
                  {calorieTarget} kcal
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">
                  Override (min 1200 kcal):
                </label>
                <input
                  type="number"
                  value={calorieOverride}
                  onChange={(e) => setCalorieOverride(e.target.value)}
                  min={1200}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none mt-1"
                />
              </div>
            </div>
          )}

          {step === "apikey" && (
            <div className="space-y-3">
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Your API key is encrypted and stored securely. It's only used to
                make calls to OpenAI on your behalf.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {steps[step].prev && (
            <button
              onClick={goPrev}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium"
            >
              Back
            </button>
          )}
          {steps[step].next ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Start Tracking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Onboarding.tsx
git commit -m "feat: implement onboarding wizard with step-by-step form"
```

---

## Chunk 5: Frontend Chat & Dashboard

### Task 15: Chat Hook & SSE

**Files:**
- Create: `frontend/src/hooks/useChat.ts`

- [ ] **Step 1: Implement `frontend/src/hooks/useChat.ts`**

```typescript
import { useState, useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatStats {
  totalCalories: number;
  weightKg: number | null;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ChatStats>({
    totalCalories: 0,
    weightKg: null,
  });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        const errorMsg: ChatMessage = {
          role: "assistant",
          content: `Error: ${err.detail || "Something went wrong"}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      // Parse SSE response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                const assistantMsg: ChatMessage = {
                  role: "assistant",
                  content: data.text,
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStats({
                  totalCalories: data.total_calories ?? statsRef.current.totalCalories,
                  weightKg: data.weight_kg ?? statsRef.current.weightKg,
                });
              }
            } catch {
              // Skip non-JSON SSE data
            }
          }
        }
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Failed to connect. Please check your internet connection.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, stats, sendMessage };
}
```

Note: `statsRef` avoids stale closure issues — `sendMessage` is stable (empty deps) while always reading latest stats.
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useChat.ts
git commit -m "feat: add useChat hook with SSE parsing"
```

---

### Task 16: Chat Page & Components

**Files:**
- Create: `frontend/src/components/StatsBar.tsx`
- Create: `frontend/src/components/ChatMessage.tsx`
- Modify: `frontend/src/pages/Chat.tsx`

- [ ] **Step 1: Create `frontend/src/components/StatsBar.tsx`**

```typescript
interface StatsBarProps {
  totalCalories: number;
  dailyTarget: number;
  weightKg: number | null;
}

export function StatsBar({
  totalCalories,
  dailyTarget,
  weightKg,
}: StatsBarProps) {
  const remaining = Math.max(0, dailyTarget - totalCalories);
  const percentage = Math.min(100, (totalCalories / dailyTarget) * 100);
  const isOver = totalCalories > dailyTarget;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              {totalCalories}
            </span>
            <span className="text-gray-500 text-sm"> / {dailyTarget} kcal</span>
          </div>
          {weightKg && (
            <div className="text-right">
              <span className="text-lg font-semibold text-gray-700">
                {weightKg} kg
              </span>
            </div>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isOver ? "bg-red-500" : "bg-green-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {isOver
            ? `${totalCalories - dailyTarget} kcal over target`
            : `${remaining} kcal remaining`}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/ChatMessage.tsx`**

```typescript
interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isUser
            ? "bg-green-600 text-white rounded-br-md"
            : "bg-gray-200 text-gray-900 rounded-bl-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `frontend/src/pages/Chat.tsx`**

```typescript
import { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { StatsBar } from "../components/StatsBar";
import { ChatMessage } from "../components/ChatMessage";
import { apiFetch } from "../lib/api";

export function Chat() {
  const { messages, loading, stats, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const [dailyTarget, setDailyTarget] = useState(2000);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTarget() {
      const res = await apiFetch("/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDailyTarget(data.today.daily_calorie_target);
      }
    }
    fetchTarget();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen">
      <StatsBar
        totalCalories={stats.totalCalories}
        dailyTarget={dailyTarget}
        weightKg={stats.weightKg}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">Tell me what you ate today</p>
            <p className="text-sm mt-2">
              e.g. "I had 2 boiled eggs and a coffee for breakfast"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-200 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white px-4 py-3 mb-16"
      >
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What did you eat?"
            className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/StatsBar.tsx frontend/src/components/ChatMessage.tsx frontend/src/pages/Chat.tsx
git commit -m "feat: implement chat page with stats bar and message bubbles"
```

---

### Task 17: Dashboard Page

**Files:**
- Create: `frontend/src/hooks/useDashboard.ts`
- Create: `frontend/src/components/WeightChart.tsx`
- Create: `frontend/src/components/CalorieChart.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `frontend/src/hooks/useDashboard.ts`**

```typescript
import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

interface DailyLog {
  date: string;
  weight_kg: number | null;
  total_calories: number;
}

interface DashboardData {
  today: {
    date: string;
    weight_kg: number | null;
    total_calories: number;
    daily_calorie_target: number;
    calories_remaining: number;
  };
  history: DailyLog[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await apiFetch("/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 2: Create `frontend/src/components/WeightChart.tsx`**

```typescript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeightChartProps {
  data: { date: string; weight_kg: number | null }[];
}

export function WeightChart({ data }: WeightChartProps) {
  const filtered = data
    .filter((d) => d.weight_kg !== null)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      weight: d.weight_kg,
    }))
    .reverse();

  if (filtered.length === 0) {
    return (
      <p className="text-gray-400 text-center py-8">
        No weight data yet. Log your weight in the chat!
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={filtered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/CalorieChart.tsx`**

```typescript
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface CalorieChartProps {
  data: { date: string; total_calories: number }[];
  target: number;
}

export function CalorieChart({ data, target }: CalorieChartProps) {
  const formatted = data
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      calories: d.total_calories,
    }))
    .reverse();

  if (formatted.length === 0) {
    return (
      <p className="text-gray-400 text-center py-8">No calorie data yet.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <ReferenceLine y={target} stroke="#ef4444" strokeDasharray="5 5" />
        <Bar dataKey="calories" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Implement `frontend/src/pages/Dashboard.tsx`**

```typescript
import { useDashboard } from "../hooks/useDashboard";
import { WeightChart } from "../components/WeightChart";
import { CalorieChart } from "../components/CalorieChart";

export function Dashboard() {
  const { data, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-center text-red-600">
        {error || "Failed to load dashboard"}
      </div>
    );
  }

  const weeklyAvg =
    data.history.length > 0
      ? Math.round(
          data.history
            .slice(0, 7)
            .reduce((sum, d) => sum + d.total_calories, 0) /
            Math.min(7, data.history.length)
        )
      : 0;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* Today's summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Today</h2>
        <div className="flex justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data.today.total_calories}
              <span className="text-sm text-gray-500 font-normal">
                {" "}
                / {data.today.daily_calorie_target} kcal
              </span>
            </p>
            <p className="text-sm text-green-600">
              {data.today.calories_remaining} remaining
            </p>
          </div>
          {data.today.weight_kg && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {data.today.weight_kg}
              </p>
              <p className="text-sm text-gray-500">kg</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly average */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-1">
          7-Day Average
        </h2>
        <p className="text-xl font-bold text-gray-900">{weeklyAvg} kcal/day</p>
      </div>

      {/* Weight trend */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          Weight Trend
        </h2>
        <WeightChart data={data.history} />
      </div>

      {/* Calorie history */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          Daily Calories
        </h2>
        <CalorieChart
          data={data.history}
          target={data.today.daily_calorie_target}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useDashboard.ts frontend/src/components/WeightChart.tsx frontend/src/components/CalorieChart.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat: implement dashboard with weight trend and calorie charts"
```

---

### Task 18: Settings Page

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Implement `frontend/src/pages/Settings.tsx`**

```typescript
import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const res = await apiFetch("/dashboard");
      if (res.ok) {
        const data = await res.json();
        setCalorieTarget(String(data.today.daily_calorie_target));
      }
    }
    loadProfile();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.startsWith("sk-")) return;
    setSaving(true);
    const res = await apiFetch("/settings/api-key", {
      method: "PATCH",
      body: JSON.stringify({ openai_api_key: apiKey }),
    });
    setSaving(false);
    setMessage(res.ok ? "API key updated!" : "Failed to update API key");
    setApiKey("");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {message && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-medium text-gray-900">OpenAI API Key</h2>
        <input
          type="password"
          placeholder="sk-... (leave blank to keep current)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
        />
        <button
          onClick={handleSaveApiKey}
          disabled={!apiKey.startsWith("sk-") || saving}
          className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Update API Key
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-medium text-gray-900">Daily Calorie Target</h2>
        <p className="text-sm text-gray-500 mt-1">
          Current target: {calorieTarget} kcal
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Settings.tsx
git commit -m "feat: implement settings page with API key management"
```

---

## Chunk 6: PWA & Final Integration

### Task 19: PWA Configuration

**Files:**
- Modify: `frontend/vite.config.ts`
- Create: `frontend/public/manifest.json`

- [ ] **Step 1: Install PWA plugin**

```bash
cd frontend && npm install vite-plugin-pwa
```

- [ ] **Step 2: Update `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Calorie Tracker",
        short_name: "CalTracker",
        description: "AI-powered calorie tracking",
        theme_color: "#16a34a",
        background_color: "#f9fafb",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/dashboard/,
            handler: "NetworkFirst",
            options: {
              cacheName: "dashboard-cache",
              expiration: { maxEntries: 1, maxAgeSeconds: 3600 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.ts frontend/public/
git commit -m "feat: configure PWA with service worker and manifest"
```

---

### Task 20: Final Integration & Smoke Test

- [ ] **Step 1: Verify backend starts**

```bash
cd backend && cp .env.example .env
# Fill in real Supabase credentials and generate ENCRYPTION_KEY
uvicorn app.main:app --reload --port 8000
```

Verify `http://localhost:8000/health` returns `{"status": "ok"}`.

- [ ] **Step 2: Verify frontend starts**

```bash
cd frontend && cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Verify `http://localhost:5173` loads the login page.

- [ ] **Step 3: Run Supabase migration**

```bash
supabase db push
```

Or apply the migration SQL directly in the Supabase dashboard SQL editor.

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && python -m pytest app/tests/ -v
```

Expected: All tests pass.

- [ ] **Step 5: Manual smoke test flow**

1. Register a new account
2. Complete onboarding (fill in profile + API key)
3. Send a chat message: "I had 2 boiled eggs for breakfast"
4. Verify response estimates calories
5. Check dashboard shows today's entry
6. Send correction: "sorry, I meant 3 eggs"
7. Verify calories update

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final integration and smoke test verification"
```
