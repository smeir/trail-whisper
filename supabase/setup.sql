-- Enable PostGIS support for geography columns (Supabase usually installs extensions into the `extensions` schema)
create extension if not exists postgis;

-- Ensure PostGIS (geography) is available – raises a clear error if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'geography'
  ) THEN
    RAISE EXCEPTION 'PostGIS geography type not found. Ensure `create extension postgis;` ran in this database.';
  END IF;
END$$;

-- Activities table scoped per authenticated user
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (sport in ('running','walking','hiking','cycling','swimming','other')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  total_distance_m integer not null check (total_distance_m >= 0),
  track_geom geography(LineString, 4326) not null,
  created_at timestamptz not null default now()
);
create index if not exists activities_user_started_idx on public.activities (user_id, started_at desc);
-- Without this every ST_DWithin below degrades to a sequential scan that decodes
-- each LineString in full.
create index if not exists activities_track_geom_idx on public.activities using gist (track_geom);

alter table public.activities enable row level security;

-- Re-create RLS policies idempotently (Postgres does not support IF NOT EXISTS for CREATE POLICY)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_select_own'
  ) THEN
    EXECUTE 'DROP POLICY "activities_select_own" ON public.activities';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_insert_own'
  ) THEN
    EXECUTE 'DROP POLICY "activities_insert_own" ON public.activities';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_update_own'
  ) THEN
    EXECUTE 'DROP POLICY "activities_update_own" ON public.activities';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_delete_own'
  ) THEN
    EXECUTE 'DROP POLICY "activities_delete_own" ON public.activities';
  END IF;
END$$;

create policy "activities_select_own"
  on public.activities for select using (auth.uid() = user_id);

create policy "activities_insert_own"
  on public.activities for insert with check (auth.uid() = user_id);

create policy "activities_update_own"
  on public.activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activities_delete_own"
  on public.activities for delete using (auth.uid() = user_id);

-- Drop the RPCs before recreating them: `create or replace` cannot change a
-- function's return type or drop a parameter, so re-running this script against a
-- database built from an older revision fails with "cannot change return type of
-- existing function". Dropping by `oid::regprocedure` catches every overload,
-- including signatures this file no longer knows about.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('find_visits_near', 'find_activities_near', 'get_activity_geojson')
  LOOP
    EXECUTE format('DROP FUNCTION %s', fn.signature);
  END LOOP;
END$$;

-- RPC to detect visits within a configurable radius (default 400m)
create or replace function public.find_visits_near(
  lat double precision,
  lon double precision,
  radius_m integer default 400
)
returns table(
  activity_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  total_distance_m integer,
  sport text,
  distance_m double precision
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    a.id,
    a.started_at,
    a.ended_at,
    a.total_distance_m,
    a.sport,
    ST_Distance(a.track_geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) as distance_m
  from public.activities a
  where a.user_id = auth.uid()
    and ST_DWithin(
      a.track_geom,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
      coalesce(radius_m, 400)
    )
  order by a.started_at desc;
$$;

-- RPC backing the History "filter near me" view. Same ST_DWithin predicate as
-- find_visits_near, so both screens agree on what "nearby" means, and it applies
-- the sport/date filters here rather than shipping every track_geom to the browser
-- to be measured and thrown away. Deliberately returns no geometry.
create or replace function public.find_activities_near(
  lat double precision,
  lon double precision,
  radius_m integer default 2000,
  sport_filter text default null,
  started_from timestamptz default null,
  started_to timestamptz default null,
  max_results integer default null
)
returns table(
  id uuid,
  sport text,
  started_at timestamptz,
  ended_at timestamptz,
  total_distance_m integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    a.id,
    a.sport,
    a.started_at,
    a.ended_at,
    a.total_distance_m,
    a.created_at
  from public.activities a
  where a.user_id = auth.uid()
    and ST_DWithin(
      a.track_geom,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
      coalesce(radius_m, 2000)
    )
    and (sport_filter is null or a.sport = sport_filter)
    and (started_from is null or a.started_at >= started_from)
    and (started_to is null or a.started_at <= started_to)
  order by a.started_at desc
  limit max_results;
$$;

-- Helper RPC used by the activity detail view to expose GeoJSON geometry
create or replace function public.get_activity_geojson(activity_id uuid)
returns table(
  id uuid,
  sport text,
  started_at timestamptz,
  ended_at timestamptz,
  total_distance_m integer,
  track_geojson json,
  created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    a.id,
    a.sport,
    a.started_at,
    a.ended_at,
    a.total_distance_m,
    ST_AsGeoJSON(a.track_geom)::json as track_geojson,
    a.created_at
  from public.activities a
  where a.user_id = auth.uid()
    and a.id = activity_id;
$$;
