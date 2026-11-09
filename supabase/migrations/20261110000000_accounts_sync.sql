-- Flow State v2: accounts and cloud sync.
--
-- Run this once in your Supabase project (Dashboard → SQL Editor → paste → Run,
-- or `npx supabase db push`). See docs/backend-setup.md.
--
-- Design:
--   * Only @stanford.edu emails can create accounts (enforced here, not just in the app).
--   * Students can read and write only their own rows (row-level security).
--   * Phones upload rows with their own `updated_at`; the server keeps the newest
--     version of each row, so two phones can't overwrite each other's newer changes.
--   * `synced_at` is set by the server on every write; phones download rows
--     changed since the last `synced_at` they saw.
--   * Rows are never hard-deleted by the app (undo sets `deleted_at`), except
--     when the whole account is deleted.

------------------------------------------------------------------------------
-- Only Stanford email addresses may sign up (or change their email).
------------------------------------------------------------------------------
create or replace function public.enforce_stanford_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(btrim(new.email)) not like '%@stanford.edu' then
    raise exception 'Only @stanford.edu email addresses can use Flow State accounts'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_stanford_email on auth.users;
create trigger enforce_stanford_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_stanford_email();

------------------------------------------------------------------------------
-- Profiles (one per account; created automatically on sign-up).
------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 30),
  daily_goal smallint not null default 8 check (daily_goal between 1 and 20),
  daily_goal_updated_at timestamptz not null default 'epoch',
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the newer daily goal when two phones disagree; always bump updated_at.
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if new.daily_goal_updated_at < old.daily_goal_updated_at then
    new.daily_goal := old.daily_goal;
    new.daily_goal_updated_at := old.daily_goal_updated_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

------------------------------------------------------------------------------
-- Drink log and per-day goals.
------------------------------------------------------------------------------
create table if not exists public.drink_entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_at timestamptz not null,
  local_date date not null,
  cups smallint not null default 1 check (cups between 1 and 10),
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp()
);

create index if not exists drink_entries_user_synced on public.drink_entries (user_id, synced_at);
create index if not exists drink_entries_user_date on public.drink_entries (user_id, local_date);

create table if not exists public.daily_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_date date not null,
  goal smallint not null check (goal between 1 and 20),
  updated_at timestamptz not null,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, local_date)
);

create index if not exists daily_goals_user_synced on public.daily_goals (user_id, synced_at);

-- Newest change wins: ignore an update that is older than what's stored, and
-- stamp every accepted write with the server time for downloads.
create or replace function public.sync_row_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return null; -- keep the newer stored row
    end if;
    new.user_id := old.user_id;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists drink_entries_sync_guard on public.drink_entries;
create trigger drink_entries_sync_guard
  before insert or update on public.drink_entries
  for each row execute function public.sync_row_guard();

drop trigger if exists daily_goals_sync_guard on public.daily_goals;
create trigger daily_goals_sync_guard
  before insert or update on public.daily_goals
  for each row execute function public.sync_row_guard();

------------------------------------------------------------------------------
-- Row-level security: each student sees and changes only their own rows.
------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.drink_entries enable row level security;
alter table public.daily_goals enable row level security;

drop policy if exists "Own profile: read" on public.profiles;
create policy "Own profile: read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "Own profile: update" on public.profiles;
create policy "Own profile: update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Own entries: read" on public.drink_entries;
create policy "Own entries: read" on public.drink_entries
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Own entries: insert" on public.drink_entries;
create policy "Own entries: insert" on public.drink_entries
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Own entries: update" on public.drink_entries;
create policy "Own entries: update" on public.drink_entries
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Own goals: read" on public.daily_goals;
create policy "Own goals: read" on public.daily_goals
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Own goals: insert" on public.daily_goals;
create policy "Own goals: insert" on public.daily_goals
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Own goals: update" on public.daily_goals;
create policy "Own goals: update" on public.daily_goals
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Signed-out visitors (the anon role) get no access to these tables at all.
revoke all on public.profiles, public.drink_entries, public.daily_goals from anon;

------------------------------------------------------------------------------
-- Account deletion (required by the App Store for apps with accounts).
-- Deletes the caller's login; their profile, log and goals are removed by cascade.
------------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
