-- Applied via Supabase MCP on 2026-06-05.
-- Property Intelligence cache: provider lookups keyed by normalized address so
-- cost scales with unique addresses, not page views. Written by the
-- /api/property/resolve Pages Function using the service-role key.
create table if not exists public.pip_property_cache (
  address_key text primary key,
  snapshot    jsonb       not null,
  is_mock     boolean     not null default false,
  updated_at  timestamptz not null default now()
);

comment on table public.pip_property_cache is
  'Cache of resolved property snapshots (Regrid/Rentcast) for the public Property Intelligence Report. Keyed by normalized address. Service-role only.';

-- RLS on, no policies => anon/auth blocked; service-role bypasses RLS.
alter table public.pip_property_cache enable row level security;

create index if not exists pip_property_cache_updated_idx
  on public.pip_property_cache (updated_at desc);
