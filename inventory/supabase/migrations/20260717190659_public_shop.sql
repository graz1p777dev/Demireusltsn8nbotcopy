-- Public shop: safe catalog projection and customer orders.
-- Internal prices, suppliers and warehouse-level balances are never exposed.

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001),
  customer_name text not null,
  phone text not null,
  address text,
  comment text,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  total_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_number)
);

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0)
);

create index shop_orders_created_at_idx on public.shop_orders (created_at desc);
create index shop_orders_status_idx on public.shop_orders (status);
create index shop_order_items_order_id_idx on public.shop_order_items (order_id);

create trigger set_shop_orders_updated_at
  before update on public.shop_orders
  for each row execute function public.set_updated_at();

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

create policy "shop_orders_owner_all"
  on public.shop_orders for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

create policy "shop_order_items_owner_all"
  on public.shop_order_items for all to authenticated
  using (public.get_my_role() = 'owner')
  with check (public.get_my_role() = 'owner');

revoke all on public.shop_orders from anon;
revoke all on public.shop_order_items from anon;
grant select, update on public.shop_orders to authenticated;
grant select on public.shop_order_items to authenticated;

create or replace function public.get_shop_products()
returns table (
  id uuid,
  name text,
  sku text,
  unit text,
  retail_price numeric,
  discount_percent numeric,
  image_url text,
  description text,
  country text,
  stock numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.name,
    p.sku,
    p.unit,
    p.retail_price,
    p.discount_percent,
    p.image_url,
    p.description,
    p.country,
    greatest(coalesce(sum(b.quantity), 0), 0)::numeric as stock
  from public.inventory_products p
  left join public.inventory_stock_balances b on b.product_id = p.id
  where p.deleted_at is null
    and p.is_active = true
    and p.product_type <> 'service'
  group by p.id
  order by (coalesce(sum(b.quantity), 0) > 0) desc, p.name;
$$;

revoke all on function public.get_shop_products() from public;
grant execute on function public.get_shop_products() to anon, authenticated;

create or replace function public.create_shop_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_comment text,
  p_items jsonb
)
returns table (order_number bigint, total_amount numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_number bigint;
  v_total numeric(14, 2) := 0;
  v_item record;
  v_product record;
  v_unit_price numeric(14, 2);
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Укажите имя покупателя';
  end if;

  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 9 then
    raise exception 'Укажите корректный номер телефона';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Корзина пуста';
  end if;

  insert into public.shop_orders (customer_name, phone, address, comment)
  values (
    trim(p_customer_name),
    trim(p_phone),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_comment, '')), '')
  )
  returning id, shop_orders.order_number into v_order_id, v_order_number;

  for v_item in
    select
      (entry->>'product_id')::uuid as product_id,
      sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) entry
    group by (entry->>'product_id')::uuid
  loop
    if v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'Некорректное количество товара';
    end if;

    select
      p.id,
      p.name,
      p.retail_price,
      p.discount_percent,
      greatest(coalesce(sum(b.quantity), 0), 0) as stock
    into v_product
    from public.inventory_products p
    left join public.inventory_stock_balances b on b.product_id = p.id
    where p.id = v_item.product_id
      and p.deleted_at is null
      and p.is_active = true
      and p.product_type <> 'service'
    group by p.id;

    if not found then
      raise exception 'Один из товаров больше недоступен';
    end if;

    if v_product.stock < v_item.quantity then
      raise exception 'Недостаточно товара «%». Доступно: %', v_product.name, v_product.stock;
    end if;

    v_unit_price := round(
      v_product.retail_price * (1 - least(greatest(v_product.discount_percent, 0), 100) / 100),
      2
    );

    insert into public.shop_order_items (
      order_id, product_id, product_name, quantity, unit_price, line_total
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_item.quantity,
      v_unit_price,
      v_unit_price * v_item.quantity
    );

    v_total := v_total + (v_unit_price * v_item.quantity);
  end loop;

  update public.shop_orders set total_amount = v_total where id = v_order_id;

  return query select v_order_number, v_total;
end;
$$;

revoke all on function public.create_shop_order(text, text, text, text, jsonb) from public;
grant execute on function public.create_shop_order(text, text, text, text, jsonb) to anon, authenticated;
