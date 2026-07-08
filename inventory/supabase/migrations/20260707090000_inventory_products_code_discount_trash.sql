-- "Код" — внутренний авто-номер товара (никогда не редактируется пользователем,
-- отдельно от "Артикул" = inventory_products.sku, который остаётся свободным полем).
alter table inventory_products
  add column code bigint generated always as identity;

alter table inventory_products
  add column discount_percent numeric not null default 0;

-- Мягкое удаление: удаление товара не удаляет строку, а проставляет deleted_at.
-- Страница "Корзина" показывает товары с deleted_at is not null.
alter table inventory_products
  add column deleted_at timestamptz;
