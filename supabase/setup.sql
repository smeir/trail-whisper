-- Enable PostGIS support for geography columns
create extension if not exists postgis;

-- Activities table scoped per authenticated user
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (sport in ('running','walking','hiking','cycling','swimming','other')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  total_distance_m integer not null check (total_distance_m >= 0),
  track_geom geography(LineString, 4326) not null,
  center_point geography(Point, 4326) not null,
  created_at timestamptz not null default now()
);

create index if not exists activities_center_point_gix on public.activities using gist (center_point);
create index if not exists activities_user_started_idx on public.activities (user_id, started_at desc);

alter table public.activities enable row level security;

create policy if not exists "activities_select_own"
  on public.activities for select using (auth.uid() = user_id);

create policy if not exists "activities_insert_own"
  on public.activities for insert with check (auth.uid() = user_id);

create policy if not exists "activities_update_own"
  on public.activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "activities_delete_own"
  on public.activities for delete using (auth.uid() = user_id);

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
as $$
  select
    a.id,
    a.started_at,
    a.ended_at,
    a.total_distance_m,
    a.sport,
    ST_Distance(a.center_point, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) as distance_m
  from public.activities a
  where a.user_id = auth.uid()
    and ST_DWithin(
      a.center_point,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
      coalesce(radius_m, 400)
    )
  order by a.started_at desc;
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
  center_geojson json,
  created_at timestamptz
)
language sql
security definer
as $$
  select
    a.id,
    a.sport,
    a.started_at,
    a.ended_at,
    a.total_distance_m,
    ST_AsGeoJSON(a.track_geom)::json as track_geojson,
    ST_AsGeoJSON(a.center_point)::json as center_geojson,
    a.created_at
  from public.activities a
  where a.user_id = auth.uid()
    and a.id = activity_id;
$$;
