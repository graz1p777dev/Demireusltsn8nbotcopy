create table if not exists public.inventory_company_settings (
  id boolean primary key default true check (id),
  name text not null default '',
  inn text,
  director text,
  phone text,
  address text,
  currency text not null default 'KGS',
  timezone text not null default 'Asia/Bishkek',
  logo_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null check (account_type in ('cash', 'bank', 'electronic')),
  balance numeric not null default 0,
  color text not null default '#0c4d6c',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_inventory_company_settings_updated_at on public.inventory_company_settings;
create trigger set_inventory_company_settings_updated_at before update on public.inventory_company_settings for each row execute function public.set_updated_at();
drop trigger if exists set_inventory_accounts_updated_at on public.inventory_accounts;
create trigger set_inventory_accounts_updated_at before update on public.inventory_accounts for each row execute function public.set_updated_at();

alter table public.inventory_company_settings enable row level security;
alter table public.inventory_accounts enable row level security;
drop policy if exists "inventory_company_settings_owner_all" on public.inventory_company_settings;
create policy "inventory_company_settings_owner_all" on public.inventory_company_settings for all to authenticated using (public.get_my_role() = 'owner') with check (public.get_my_role() = 'owner');
drop policy if exists "inventory_accounts_owner_all" on public.inventory_accounts;
create policy "inventory_accounts_owner_all" on public.inventory_accounts for all to authenticated using (public.get_my_role() = 'owner') with check (public.get_my_role() = 'owner');
