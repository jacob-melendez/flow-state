-- TEST ONLY. A minimal stand-in for the parts of Supabase the migrations rely
-- on (roles, the auth schema, auth.uid()), so they can be tested in an
-- in-process Postgres (PGlite). Never run this against a real project.

create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);

-- Supabase reads the signed-in user's id from the request's JWT claims.
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Supabase grants table/function access to these roles by default and relies on RLS.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
