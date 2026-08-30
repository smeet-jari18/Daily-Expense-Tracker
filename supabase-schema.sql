-- ═══════════════════════════════════════════════════════════════════════════
-- ExpenseTrack - Supabase Database Setup
-- ─────────────────────────────────────────────────────────────────────────
-- HOW TO USE:
--   1. Supabase Dashboard → your project → "SQL Editor"
--   2. Paste this ENTIRE file → click "Run"
--   3. Done! (Safe to run again if you need to re-apply policies.)
--
-- This creates 3 tables + Row Level Security so every user can only
-- ever see or change their OWN data.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) ── PROFILES ─────────────────────────────────────────────────────────────
--    One row per account (mirrors the Supabase auth user)
create table if not exists public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    name       text not null default '',
    created_at timestamptz not null default now()
);

-- 2) ── EXPENSES ─────────────────────────────────────────────────────────────
--    "date" is a reserved word in Postgres, so the column is called
--    "expense_date" (the app maps it back to "date" automatically)
create table if not exists public.expenses (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references public.profiles (id) on delete cascade,
    amount         numeric(12,2) not null check (amount > 0),
    category       text not null,
    expense_date   date not null,
    payment_method text not null default 'Cash',
    description    text not null default '',
    created_at     timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
    on public.expenses (user_id, expense_date desc);

-- 3) ── SETTINGS ────────────────────────────────────────────────────────────
--    Theme, currency, budget and notification preferences (one row per user)
create table if not exists public.settings (
    user_id          uuid primary key references public.profiles (id) on delete cascade,
    theme            text not null default 'light',
    currency         text not null default 'INR',
    monthly_budget   numeric(12,2) not null default 0,
    expense_reminder boolean not null default true,
    budget_warning   boolean not null default true,
    monthly_summary  boolean not null default true,
    updated_at       timestamptz not null default now()
);

-- 4) ── ROW LEVEL SECURITY ───────────────────────────────────────────────────
--    The core security: a logged-in user can only touch their own rows.
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
    on public.expenses for select
    using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
    on public.expenses for insert
    with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
    on public.expenses for update
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
    on public.expenses for delete
    using (auth.uid() = user_id);

drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own"
    on public.settings for select
    using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own"
    on public.settings for insert
    with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own"
    on public.settings for update
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings_delete_own" on public.settings;
create policy "settings_delete_own"
    on public.settings for delete
    using (auth.uid() = user_id);

-- 5) ── AUTO-CREATE PROFILE + DEFAULT SETTINGS ON SIGNUP ─────────────────────
--    Runs automatically whenever a new account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'user'), '@', 1))
    )
    on conflict (id) do nothing;

    insert into public.settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 6) ── KEEP settings.updated_at FRESH ───────────────────────────────────────
create or replace function public.touch_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
    before update on public.settings
    for each row execute function public.touch_settings_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ DONE. Now:
--   • Project Settings → API → copy "Project URL" and "anon public" key
--   • Paste them into js/supabase-config.js
--   • (Optional) Authentication → Providers → Email → turn OFF "Confirm
--     email" if you want users to be able to log in right after signup
-- ═══════════════════════════════════════════════════════════════════════════
