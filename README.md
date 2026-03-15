# Calorie Tracker

A prompt-based calorie tracker powered by an LLM. Tell it what you ate in plain language and it estimates calories, tracks your progress toward a weight goal, and maintains a conversational daily log.

## How it works

Instead of searching food databases and filling out forms, you just chat:

- *"I had 2 boiled eggs and a coffee for breakfast"* — logs ~170 kcal
- *"sorry, I meant 3 eggs"* — updates the entry
- *"thinking about ordering a caesar salad, what do you think?"* — estimates calories without logging
- *"I'm 89.2 kg today"* — records your weight

The LLM handles natural language parsing, calorie estimation, and conversational context. You bring your own OpenAI API key.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Backend | Python, FastAPI |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| LLM | OpenAI API (GPT-4o) |
| Deployment | nginx + systemd |

## Features

- Conversational food and weight logging via LLM
- Onboarding wizard with auto-calculated calorie targets (Mifflin-St Jeor)
- Dashboard with weight trend and calorie charts
- Dark mode (light / dark / system)
- Responsive layout (mobile bottom nav + desktop sidebar)
- PWA — installable on mobile
- Chat history persists across navigation
- API keys encrypted at rest (Fernet)
- Row-Level Security on all tables

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone

```bash
git clone https://github.com/mihai-molnar/calorie-tracker.git
cd calorie-tracker
```

### 2. Set up Supabase

Create a Supabase project and run the migration SQL in the dashboard SQL editor:

```bash
cat supabase/migrations/20260315000001_initial_schema.sql
```

### 3. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Fill in your Supabase credentials and generate a Fernet encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 4. Frontend

```bash
cd frontend
npm install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings.

### 5. Run

```bash
# From project root
./run.sh
```

Or start each separately:

```bash
# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

## Deployment

Deployment configs for a VPS with nginx + systemd are in `deploy/`. See the deploy script:

```bash
# On the VPS
bash deploy/deploy.sh
```

This installs nginx, clones the repo, sets up a Python venv, builds the frontend, and configures systemd + nginx.

To update after pushing changes:

```bash
# Full redeploy (frontend + backend)
cd /opt/calorie-tracker && bash deploy/deploy.sh

# Backend only (no frontend rebuild needed)
cd /opt/calorie-tracker && git pull && sudo systemctl restart calorie-tracker

# Frontend only (no backend restart needed)
cd /opt/calorie-tracker && git pull && cd frontend && npm run build
```

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app
    config.py            # Environment settings
    dependencies.py      # Supabase client, JWT auth (ES256 + HS256)
    routers/
      auth.py            # Register, login, logout
      onboarding.py      # Profile setup + calorie calculation
      chat.py            # LLM chat + SSE + rate limiting
      dashboard.py       # Stats + history
      food_entries.py    # Manual calorie corrections
      settings.py        # API key update
    services/
      calorie.py         # BMR / TDEE / daily target
      crypto.py          # Fernet encrypt/decrypt
      llm.py             # Prompt builder + response parser
    tests/               # 17 unit tests

frontend/
  src/
    contexts/
      AuthContext.tsx     # Supabase session management
      ThemeContext.tsx     # Dark mode (light/dark/system)
    components/
      Layout.tsx          # Responsive sidebar + bottom nav
      ProtectedRoute.tsx  # Auth + onboarding gate
      StatsBar.tsx        # Calorie progress bar
      ChatMessage.tsx     # Chat bubbles
      WeightChart.tsx     # Recharts line chart
      CalorieChart.tsx    # Recharts bar chart
    hooks/
      useChat.ts          # Chat SSE + history loading
      useDashboard.ts     # Dashboard data fetching
    pages/
      Login.tsx, Register.tsx, Onboarding.tsx
      Chat.tsx, Dashboard.tsx, Settings.tsx

supabase/
  migrations/            # Database schema + RLS policies

deploy/
  calorie-tracker.nginx  # nginx site config
  calorie-tracker.service # systemd unit
  deploy.sh              # Deployment script
```
