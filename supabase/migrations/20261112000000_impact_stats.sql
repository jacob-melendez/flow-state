-- Flow State v2: anonymous impact stats for SENSA Impact Labs reports.
--
-- Run this AFTER the accounts and friends migrations. Safe to run more than once.
--
-- What is collected (only if the student leaves "Share anonymous usage stats" on):
--   one row per install per day on which at least one cup was logged:
--   a random install id (NOT linked to any account), the date, cups, the goal,
--   whether it was met, the app version and platform.
-- The app sends these without the student's login, so they can't be tied to an
-- account. Nobody can read this data through the app or API; view it in the
-- Supabase dashboard (SQL Editor) with the impact_* views below.

create table if not exists public.usage_daily (
  install_id uuid not null,
  local_date date not null,
  cups smallint not null check (cups between 0 and 40),
  goal smallint not null check (goal between 1 and 20),
  goal_met boolean not null,
  app_version text not null check (char_length(app_version) <= 20),
  platform text not null check (platform in ('ios', 'android', 'web')),
  reported_at timestamptz not null default now(),
  primary key (install_id, local_date)
);

-- RLS on with no policies: no direct reads or writes through the API.
alter table public.usage_daily enable row level security;
revoke all on public.usage_daily from anon, authenticated;

-- The only way in. Accepts the last 8 days (timezones + a missed day or two), ignores
-- anything else, and is idempotent (re-sending a day replaces it).
create or replace function public.report_usage(
  p_install_id uuid,
  p_local_date date,
  p_cups integer,
  p_goal integer,
  p_app_version text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_install_id is null
     or p_local_date is null
     or p_local_date > current_date + 1
     or p_local_date < current_date - 8
     or p_platform not in ('ios', 'android', 'web') then
    return;
  end if;

  insert into public.usage_daily (install_id, local_date, cups, goal, goal_met, app_version, platform)
  values (
    p_install_id,
    p_local_date,
    least(greatest(coalesce(p_cups, 0), 0), 40),
    least(greatest(coalesce(p_goal, 8), 1), 20),
    coalesce(p_cups, 0) >= least(greatest(coalesce(p_goal, 8), 1), 20),
    left(coalesce(p_app_version, ''), 20),
    p_platform
  )
  on conflict (install_id, local_date) do update
    set cups = excluded.cups,
        goal = excluded.goal,
        goal_met = excluded.goal_met,
        app_version = excluded.app_version,
        platform = excluded.platform,
        reported_at = now();
end;
$$;

revoke execute on function public.report_usage(uuid, date, integer, integer, text, text) from public;
grant execute on function public.report_usage(uuid, date, integer, integer, text, text) to anon, authenticated;

------------------------------------------------------------------------------
-- Reports for the team (dashboard only). Weeks start on Monday.
------------------------------------------------------------------------------
create or replace view public.impact_weekly
with (security_invoker = true)
as
select
  date_trunc('week', local_date)::date as week_start,
  count(distinct install_id) as active_installs,
  count(*) as active_days,
  sum(cups) as total_cups,
  round(avg(cups), 1) as avg_cups_per_active_day,
  round(100.0 * avg(goal_met::int), 1) as pct_days_goal_met
from public.usage_daily
group by 1
order by 1 desc;

create or replace view public.impact_daily
with (security_invoker = true)
as
select
  local_date,
  count(*) as active_installs,
  sum(cups) as total_cups,
  round(avg(cups), 1) as avg_cups,
  round(100.0 * avg(goal_met::int), 1) as pct_goal_met
from public.usage_daily
group by 1
order by 1 desc;

revoke all on public.impact_weekly, public.impact_daily from anon, authenticated;
