alter table public.inventory_products
  add column if not exists product_type text not null default 'product',
  add column if not exists gtin text,
  add column if not exists description text,
  add column if not exists country text,
  add column if not exists height_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists depth_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists is_weighted boolean not null default false,
  add column if not exists is_free_price boolean not null default false;

alter table public.inventory_products
  drop constraint if exists inventory_products_product_type_check;

alter table public.inventory_products
  add constraint inventory_products_product_type_check
  check (product_type in ('product', 'service', 'kit'));

create unique index if not exists idx_inventory_products_gtin
  on public.inventory_products (gtin)
  where gtin is not null;

create table if not exists public.inventory_product_packages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.inventory_products(id) on delete cascade,
  name text not null,
  quantity numeric not null check (quantity > 0),
  barcode text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_product_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_product_id uuid not null references public.inventory_products(id) on delete cascade,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unique (kit_product_id, product_id),
  check (kit_product_id <> product_id)
);

alter table public.inventory_product_packages enable row level security;
alter table public.inventory_product_kit_items enable row level security;

drop policy if exists "inventory_product_packages_owner_all" on public.inventory_product_packages;
create policy "inventory_product_packages_owner_all"
  on public.inventory_product_packages for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

drop policy if exists "inventory_product_kit_items_owner_all" on public.inventory_product_kit_items;
create policy "inventory_product_kit_items_owner_all"
  on public.inventory_product_kit_items for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');
