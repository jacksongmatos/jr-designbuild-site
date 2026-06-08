-- Applied via Supabase MCP (studio_portal_phase1 + _security_hardening).
-- JR Design Build — Studio + Supplier Portal, Phase 1 schema.
--
-- NAMING: every table is namespaced `studio_` on purpose. The spec asked for
-- `suppliers` / `catalog_items` / `material_categories`, but this database is
-- shared with the live JR Vision ERP, which already owns public.suppliers
-- (269 rows) and public.leads (209 rows). Reusing those names would clobber
-- production data, so the Studio gets its own `studio_*` namespace.
--
-- SECURITY: RLS on every table. Approval-status columns are locked by triggers
-- so a user can never self-approve — only the service role (Pages Functions)
-- can set them. projects/applications/leads have no anon/auth policies at all
-- (service-role only); anonymous client ownership is enforced by edit_token in
-- the Worker. The ERP-facing view is security_invoker. See docs/STUDIO_PORTAL.md.

create table if not exists public.studio_suppliers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete set null,
  company_name  text not null,
  contact_name  text,
  email         text,
  phone         text,
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected','suspended')),
  created_at    timestamptz not null default now()
);
create index if not exists studio_suppliers_user_idx on public.studio_suppliers (user_id);

create table if not exists public.studio_material_categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text unique not null,
  sort  int  not null default 0
);

create table if not exists public.studio_catalog_items (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid references public.studio_suppliers on delete cascade,
  category_id   uuid not null references public.studio_material_categories,
  name          text not null,
  description   text,
  image_path    text,
  texture_path  text,
  swatch_color  text,
  price_note    text,
  is_jr_product boolean not null default false,
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);
create index if not exists studio_catalog_supplier_idx on public.studio_catalog_items (supplier_id);
create index if not exists studio_catalog_category_idx on public.studio_catalog_items (category_id);
create index if not exists studio_catalog_status_idx   on public.studio_catalog_items (status);

create table if not exists public.studio_projects (
  id              uuid primary key default gen_random_uuid(),
  client_user_id  uuid references auth.users on delete set null,
  client_name     text,
  client_email    text,
  client_phone    text,
  base_image_path text not null,
  title           text,
  edit_token      text,
  status          text not null default 'draft' check (status in ('draft','submitted')),
  created_at      timestamptz not null default now()
);

create table if not exists public.studio_applications (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.studio_projects on delete cascade,
  catalog_item_id uuid references public.studio_catalog_items on delete set null,
  region_json     jsonb not null,
  opacity         numeric not null default 1,
  blend_mode      text not null default 'multiply',
  created_at      timestamptz not null default now()
);
create index if not exists studio_applications_project_idx on public.studio_applications (project_id);

create table if not exists public.studio_leads (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.studio_projects on delete set null,
  client_name   text,
  client_email  text,
  client_phone  text,
  summary_json  jsonb,
  erp_synced    boolean not null default false,
  created_at    timestamptz not null default now()
);

create or replace view public.studio_leads_unified
  with (security_invoker = on) as
select l.id, l.client_name, l.client_email, l.client_phone,
       l.summary_json, l.erp_synced, l.created_at,
       p.base_image_path, p.title
from public.studio_leads l
left join public.studio_projects p on p.id = l.project_id;

-- Privileged-column guards (SECURITY INVOKER; not directly callable).
create or replace function public.studio_lock_supplier_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'INSERT' then new.status := 'pending';
    else new.status := old.status;
    end if;
  end if;
  return new;
end $$;

create or replace function public.studio_lock_item_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.status := 'pending';
  end if;
  return new;
end $$;
revoke execute on function public.studio_lock_supplier_status() from public, anon, authenticated;
revoke execute on function public.studio_lock_item_status()     from public, anon, authenticated;

drop trigger if exists studio_suppliers_status_guard on public.studio_suppliers;
create trigger studio_suppliers_status_guard
  before insert or update on public.studio_suppliers
  for each row execute function public.studio_lock_supplier_status();

drop trigger if exists studio_items_status_guard on public.studio_catalog_items;
create trigger studio_items_status_guard
  before insert or update on public.studio_catalog_items
  for each row execute function public.studio_lock_item_status();

-- RLS
alter table public.studio_suppliers           enable row level security;
alter table public.studio_material_categories  enable row level security;
alter table public.studio_catalog_items        enable row level security;
alter table public.studio_projects             enable row level security;
alter table public.studio_applications         enable row level security;
alter table public.studio_leads                enable row level security;

create policy studio_suppliers_select_own on public.studio_suppliers
  for select to authenticated using (user_id = auth.uid());
create policy studio_suppliers_insert_self on public.studio_suppliers
  for insert to authenticated with check (user_id = auth.uid());
create policy studio_suppliers_update_own on public.studio_suppliers
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy studio_categories_read on public.studio_material_categories
  for select to anon, authenticated using (true);

create policy studio_items_read_approved on public.studio_catalog_items
  for select to anon, authenticated using (status = 'approved');
create policy studio_items_read_own on public.studio_catalog_items
  for select to authenticated
  using (supplier_id in (select id from public.studio_suppliers where user_id = auth.uid()));
create policy studio_items_insert_own on public.studio_catalog_items
  for insert to authenticated
  with check (supplier_id in (select id from public.studio_suppliers where user_id = auth.uid()));
create policy studio_items_update_own on public.studio_catalog_items
  for update to authenticated
  using (supplier_id in (select id from public.studio_suppliers where user_id = auth.uid()))
  with check (supplier_id in (select id from public.studio_suppliers where user_id = auth.uid()));

-- projects / applications / leads: no anon/auth policies => service-role only.

insert into storage.buckets (id, name, public) values ('studio-photos','studio-photos',false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('studio-catalog','studio-catalog',true) on conflict (id) do nothing;

insert into public.studio_material_categories (name, slug, sort) values
  ('Flooring','flooring',10),('Wall Paint','wall-paint',20),('Cabinets','cabinets',30),
  ('Countertop','countertop',40),('Backsplash','backsplash',50),('Tile','tile',60),
  ('Lighting','lighting',70),('Hardware','hardware',80)
on conflict (slug) do nothing;