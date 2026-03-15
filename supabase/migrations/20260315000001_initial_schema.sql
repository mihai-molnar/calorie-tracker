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
