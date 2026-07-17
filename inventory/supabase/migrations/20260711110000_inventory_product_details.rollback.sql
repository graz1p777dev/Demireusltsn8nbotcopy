drop policy if exists "inventory_product_kit_items_owner_all" on public.inventory_product_kit_items;
drop policy if exists "inventory_product_packages_owner_all" on public.inventory_product_packages;
drop table if exists public.inventory_product_kit_items;
drop table if exists public.inventory_product_packages;
drop index if exists public.idx_inventory_products_gtin;
alter table public.inventory_products
  drop constraint if exists inventory_products_product_type_check,
  drop column if exists product_type,
  drop column if exists gtin,
  drop column if exists description,
  drop column if exists country,
  drop column if exists height_cm,
  drop column if exists width_cm,
  drop column if exists depth_cm,
  drop column if exists weight_kg,
  drop column if exists is_weighted,
  drop column if exists is_free_price;
