-- Moodly cloud schema — Supabase Postgres + RLS
-- Apply via Supabase CLI: supabase db push
-- See docs/SUPABASE.md for setup.

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Mood / journal entries (one row per local calendar day)
-- ---------------------------------------------------------------------------
create table if not exists public.mood_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mood text not null,
  note text not null default '',
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  deleted_at timestamptz,
  primary key (user_id, date)
);

create index if not exists idx_mood_entries_user_updated
  on public.mood_entries (user_id, updated_at_ms desc);

alter table public.mood_entries enable row level security;

create policy "mood_entries_select_own"
  on public.mood_entries for select using (auth.uid() = user_id);
create policy "mood_entries_insert_own"
  on public.mood_entries for insert with check (auth.uid() = user_id);
create policy "mood_entries_update_own"
  on public.mood_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mood_entries_delete_own"
  on public.mood_entries for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Habit selections (composite per day + habit)
-- ---------------------------------------------------------------------------
create table if not exists public.habit_selections (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  habit_id text not null,
  updated_at_ms bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (user_id, date, habit_id)
);

create index if not exists idx_habit_selections_user_date
  on public.habit_selections (user_id, date);

alter table public.habit_selections enable row level security;

create policy "habit_selections_all_own"
  on public.habit_selections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Goals + progress
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  payload_json jsonb not null,
  updated_at_ms bigint not null,
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.goal_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id text not null,
  date date not null,
  value double precision not null,
  note text not null default '',
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  primary key (user_id, goal_id, date)
);

alter table public.goals enable row level security;
alter table public.goal_progress enable row level security;

create policy "goals_all_own"
  on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_progress_all_own"
  on public.goal_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- App settings + tracked habits (JSON blobs per user)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings_json jsonb not null,
  updated_at_ms bigint not null
);

create table if not exists public.tracked_habits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  habit_ids jsonb not null default '[]'::jsonb,
  updated_at_ms bigint not null
);

alter table public.app_settings enable row level security;
alter table public.tracked_habits enable row level security;

create policy "app_settings_all_own"
  on public.app_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tracked_habits_all_own"
  on public.tracked_habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Tasks metadata + day shards
-- ---------------------------------------------------------------------------
create table if not exists public.tasks_records (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload_json jsonb not null,
  updated_at_ms bigint not null
);

create table if not exists public.task_day_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  items_json jsonb not null default '[]'::jsonb,
  updated_at_ms bigint not null,
  primary key (user_id, date)
);

alter table public.tasks_records enable row level security;
alter table public.task_day_items enable row level security;

create policy "tasks_records_all_own"
  on public.tasks_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "task_day_items_all_own"
  on public.task_day_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Insights reflection timing (cooldown bookkeeping only)
-- ---------------------------------------------------------------------------
create table if not exists public.insights_reflection_timing (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload_json jsonb not null,
  updated_at_ms bigint not null
);

alter table public.insights_reflection_timing enable row level security;

create policy "insights_reflection_timing_all_own"
  on public.insights_reflection_timing for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Account deletion helper (RPC — deletes all user rows via auth.users cascade)
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
