-- Shim for plain Postgres (local, Neon, …): emulates the parts of Supabase that
-- RLS depends on. Never run on a real Supabase project (auth schema exists there).
-- Must work for a non-superuser owner, so no BYPASSRLS.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  -- The app connects as the DB owner and does `SET LOCAL ROLE authenticated` per request.
  -- PG16+: the creator's implicit membership has SET disabled, so grant it explicitly.
  if current_setting('server_version_num')::int >= 160000 then
    if not pg_has_role(current_user, 'authenticated', 'SET') then
      execute format('grant authenticated to %I with set true', current_user);
    end if;
  elsif not pg_has_role(current_user, 'authenticated', 'MEMBER') then
    execute format('grant authenticated to %I', current_user);
  end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
