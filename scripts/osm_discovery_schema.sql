-- Run once in the Supabase SQL Editor to enable persistent seven-day caching
-- of on-demand OpenStreetMap city searches. The API can still return live
-- listings without this table; in that case it only caches in backend memory.
create table if not exists public.city_discovery_cache (
  city_key text primary key,
  results jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists city_discovery_cache_expires_idx
  on public.city_discovery_cache (expires_at);

alter table public.city_discovery_cache enable row level security;
grant all on public.city_discovery_cache to service_role;
