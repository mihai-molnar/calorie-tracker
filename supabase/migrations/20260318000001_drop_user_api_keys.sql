-- Remove per-user API key storage (BYOK feature removed)
-- User data in user_profiles, daily_logs, food_entries, chat_messages is unaffected.
drop table if exists public.user_api_keys;
