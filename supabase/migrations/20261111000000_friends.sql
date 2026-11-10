-- Flow State v2: friends.
--
-- Run this AFTER 20261110000000_accounts_sync.sql (SQL Editor → paste → Run,
-- or `npx supabase db push`). Safe to run more than once.
--
-- Privacy rules:
--   * Students add friends by friend code or by exact Stanford email (if the
--     other student allows email search). No browsing or partial matching.
--   * "Not found" looks the same for: no such person, email search off, or a block.
--   * Friends see only: display name, today's cups vs goal, current streak.
--   * Incoming requests also show the sender's Stanford email (so you know who it is).
--   * The friendships table can't be written directly; all changes go through
--     the functions below, which enforce these rules.

------------------------------------------------------------------------------
-- Friend codes and email-search setting on profiles.
------------------------------------------------------------------------------
-- 8 characters without look-alikes (no I, L, O, 0, 1), from a strong random source.
create or replace function public.generate_friend_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.friend_code = code);
  end loop;
  return code;
end;
$$;

alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists discoverable_by_email boolean not null default true;

update public.profiles set friend_code = public.generate_friend_code() where friend_code is null;

alter table public.profiles alter column friend_code set default public.generate_friend_code();
alter table public.profiles alter column friend_code set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_friend_code_key') then
    alter table public.profiles add constraint profiles_friend_code_key unique (friend_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_friend_code_format') then
    alter table public.profiles
      add constraint profiles_friend_code_format check (friend_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$');
  end if;
end;
$$;

-- Same as before, plus: students can't change their own friend code.
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.friend_code := old.friend_code;
  if new.daily_goal_updated_at < old.daily_goal_updated_at then
    new.daily_goal := old.daily_goal;
    new.daily_goal_updated_at := old.daily_goal_updated_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

------------------------------------------------------------------------------
-- Friendships: one row per pair of students.
------------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  blocked_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester <> addressee),
  check ((status = 'blocked') = (blocked_by is not null))
);

create unique index if not exists friendships_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_requester on public.friendships (requester);
create index if not exists friendships_addressee on public.friendships (addressee);

alter table public.friendships enable row level security;

-- Students can see their own relationships, but not that someone blocked them.
drop policy if exists "Own friendships: read" on public.friendships;
create policy "Own friendships: read" on public.friendships
  for select to authenticated
  using (
    (status <> 'blocked' and (requester = (select auth.uid()) or addressee = (select auth.uid())))
    or blocked_by = (select auth.uid())
  );

-- No direct writes: everything goes through the functions below.
revoke all on public.friendships from anon;
revoke insert, update, delete on public.friendships from authenticated;

------------------------------------------------------------------------------
-- Helpers (not callable by the app).
------------------------------------------------------------------------------
-- Today's date in a student's timezone (falls back to Stanford's if unknown).
create or replace function public.local_today(p_timezone text)
returns date
language plpgsql
stable
set search_path = ''
as $$
begin
  return (now() at time zone coalesce(nullif(p_timezone, ''), 'America/Los_Angeles'))::date;
exception when others then
  return (now() at time zone 'America/Los_Angeles')::date;
end;
$$;

-- Consecutive days the goal was met, ending today; if today's goal isn't met
-- yet, the streak counts through yesterday. Same rules as currentStreak() in
-- src/domain/streaks.ts: deleted cups don't count; each day uses that day's
-- goal, falling back to the profile's current goal.
create or replace function public.current_streak(p_user uuid, p_today date)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  base_goal integer;
  met date[];
  d date := p_today;
  streak integer := 0;
begin
  select p.daily_goal into base_goal from public.profiles p where p.id = p_user;
  select coalesce(array_agg(t.local_date), '{}') into met
  from (
    select e.local_date, sum(e.cups) as cups
    from public.drink_entries e
    where e.user_id = p_user and e.deleted_at is null and e.local_date between p_today - 400 and p_today
    group by e.local_date
  ) t
  left join public.daily_goals g on g.user_id = p_user and g.local_date = t.local_date
  where t.cups >= coalesce(g.goal, base_goal);

  if not (d = any (met)) then
    d := d - 1;
  end if;
  while d = any (met) loop
    streak := streak + 1;
    d := d - 1;
  end loop;
  return streak;
end;
$$;

revoke execute on function public.generate_friend_code() from public, anon, authenticated;
revoke execute on function public.local_today(text) from public, anon, authenticated;
revoke execute on function public.current_streak(uuid, date) from public, anon, authenticated;

------------------------------------------------------------------------------
-- App functions.
------------------------------------------------------------------------------
-- Send a request by friend code or exact email. Returns one of:
-- sent | accepted | already_friends | already_requested | self | needs_name | too_many | not_found
create or replace function public.send_friend_request(p_code text default null, p_email text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from public.profiles p where p.id = me and p.display_name is not null) then
    return 'needs_name';
  end if;

  if p_code is not null then
    select p.id into target from public.profiles p
    where p.friend_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  elsif p_email is not null then
    select p.id into target from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) = lower(btrim(p_email)) and p.discoverable_by_email;
  end if;

  if target is null then
    return 'not_found';
  end if;
  if target = me then
    return 'self';
  end if;

  select f.* into existing from public.friendships f
  where least(f.requester, f.addressee) = least(me, target)
    and greatest(f.requester, f.addressee) = greatest(me, target);

  if found then
    if existing.status = 'blocked' then
      if existing.blocked_by <> me then
        return 'not_found'; -- don't reveal the block
      end if;
      -- Re-adding someone you blocked unblocks them and sends a request.
      update public.friendships
        set requester = me, addressee = target, status = 'pending', blocked_by = null, created_at = now(), responded_at = null
        where id = existing.id;
      return 'sent';
    end if;
    if existing.status = 'accepted' then
      return 'already_friends';
    end if;
    if existing.requester = me then
      return 'already_requested';
    end if;
    -- They already asked you: become friends.
    update public.friendships set status = 'accepted', responded_at = now() where id = existing.id;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships f where f.requester = me and f.status = 'pending') >= 50 then
    return 'too_many';
  end if;

  insert into public.friendships (requester, addressee) values (me, target);
  return 'sent';
exception when unique_violation then
  return 'already_requested';
end;
$$;

-- Accept or decline a request sent to you. Returns accepted | declined | not_found.
create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
      where id = p_request_id and addressee = me and status = 'pending';
    return case when found then 'accepted' else 'not_found' end;
  end if;
  delete from public.friendships where id = p_request_id and addressee = me and status = 'pending';
  return case when found then 'declined' else 'not_found' end;
end;
$$;

-- Unfriend, cancel a sent request, or decline a received one; optionally block.
-- Returns removed | blocked.
create or replace function public.remove_friend(p_user_id uuid, p_block boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if p_user_id = me then
    return 'removed';
  end if;

  select f.* into existing from public.friendships f
  where least(f.requester, f.addressee) = least(me, p_user_id)
    and greatest(f.requester, f.addressee) = greatest(me, p_user_id);

  if p_block then
    if not found then
      insert into public.friendships (requester, addressee, status, blocked_by, responded_at)
        values (me, p_user_id, 'blocked', me, now());
    elsif not (existing.status = 'blocked' and existing.blocked_by <> me) then
      update public.friendships set status = 'blocked', blocked_by = me, responded_at = now() where id = existing.id;
    end if;
    return 'blocked';
  end if;

  -- Removing never lifts a block someone else placed on you.
  if found and not (existing.status = 'blocked' and existing.blocked_by <> me) then
    delete from public.friendships where id = existing.id;
  end if;
  return 'removed';
end;
$$;

-- Everyone you're connected with. Friends include today's progress and streak;
-- incoming requests include the sender's email; nothing else is shared.
create or replace function public.get_friends()
returns table (
  user_id uuid,
  display_name text,
  status text,
  request_id uuid,
  email text,
  today_cups integer,
  today_goal integer,
  streak integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  return query
  with rel as (
    select f.id as rid,
           f.status as rstatus,
           f.requester = me as outgoing,
           case when f.requester = me then f.addressee else f.requester end as other
    from public.friendships f
    where (f.requester = me or f.addressee = me) and f.status in ('pending', 'accepted')
  )
  select
    rel.other,
    p.display_name,
    case when rel.rstatus = 'accepted' then 'friend' when rel.outgoing then 'outgoing' else 'incoming' end,
    rel.rid,
    case when rel.rstatus = 'pending' and not rel.outgoing then u.email::text end,
    case when rel.rstatus = 'accepted' then coalesce((
      select sum(e.cups)::integer from public.drink_entries e
      where e.user_id = rel.other and e.deleted_at is null and e.local_date = t.today
    ), 0) end,
    case when rel.rstatus = 'accepted' then coalesce((
      select g.goal::integer from public.daily_goals g where g.user_id = rel.other and g.local_date = t.today
    ), p.daily_goal::integer) end,
    case when rel.rstatus = 'accepted' then public.current_streak(rel.other, t.today) end
  from rel
  join public.profiles p on p.id = rel.other
  join auth.users u on u.id = rel.other
  cross join lateral (select public.local_today(p.timezone) as today) t
  order by p.display_name nulls last;
end;
$$;

revoke execute on function public.send_friend_request(text, text) from public, anon;
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_friend(uuid, boolean) from public, anon;
revoke execute on function public.get_friends() from public, anon;
grant execute on function public.send_friend_request(text, text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid, boolean) to authenticated;
grant execute on function public.get_friends() to authenticated;
