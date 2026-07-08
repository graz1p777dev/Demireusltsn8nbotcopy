-- ============================================================
-- Migration: inventory_schema
-- Складской модуль Demi Inventory. Таблицы с префиксом inventory_,
-- чтобы не конфликтовать с существующими таблицами основной CRM
-- (тот же Supabase-проект rjzmxgiqleftwcsxgfte).
--
-- ЗАВИСИМОСТИ ОТ ОСНОВНОГО ПРОЕКТА (crm-system):
--   public.set_updated_at()     — из crm-system/supabase/migrations/001_functions_core.sql
--   public.get_my_role()        — из crm-system/supabase/migrations/001_functions_core.sql
-- Эта миграция их не создаёт и не переопределяет — только использует.
-- Если когда-нибудь эти миграции нужно будет применить к чистому
-- проекту без crm-system, оба файла должны быть применены первыми.
-- ============================================================

-- ------------------------------------------------------------
-- 1. inventory_categories
-- ------------------------------------------------------------
CREATE TABLE public.inventory_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  parent_id  UUID        REFERENCES public.inventory_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_categories_parent_id ON public.inventory_categories(parent_id);

-- ------------------------------------------------------------
-- 2. inventory_warehouses
-- ------------------------------------------------------------
CREATE TABLE public.inventory_warehouses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  address    TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. inventory_suppliers
-- ------------------------------------------------------------
CREATE TABLE public.inventory_suppliers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  phone           TEXT,
  contact_person  TEXT,
  balance         NUMERIC     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. inventory_products
-- ------------------------------------------------------------
CREATE TABLE public.inventory_products (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  sku              TEXT        NOT NULL UNIQUE,
  barcode          TEXT,
  category_id      UUID        REFERENCES public.inventory_categories(id),
  unit             TEXT        NOT NULL,
  cost_price       NUMERIC     NOT NULL DEFAULT 0,
  retail_price     NUMERIC     NOT NULL DEFAULT 0,
  min_stock_level  INTEGER     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_products_category_id ON public.inventory_products(category_id);
CREATE INDEX idx_inventory_products_barcode     ON public.inventory_products(barcode);

CREATE TRIGGER set_inventory_products_updated_at
  BEFORE UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 5. inventory_documents
-- ------------------------------------------------------------
CREATE TABLE public.inventory_documents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number          TEXT        NOT NULL UNIQUE,
  doc_type            TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'draft',
  warehouse_id        UUID        NOT NULL REFERENCES public.inventory_warehouses(id),
  target_warehouse_id UUID        REFERENCES public.inventory_warehouses(id),
  supplier_id         UUID        REFERENCES public.inventory_suppliers(id),
  total_amount        NUMERIC     NOT NULL DEFAULT 0,
  comment             TEXT,
  created_by          UUID        REFERENCES auth.users(id),
  posted_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT inventory_documents_doc_type_check CHECK (
    doc_type IN (
      'purchase', 'sale', 'purchase_return', 'sale_return',
      'writeoff', 'correction', 'inventory_check', 'transfer'
    )
  ),
  CONSTRAINT inventory_documents_status_check CHECK (
    status IN ('draft', 'posted')
  )
);

CREATE INDEX idx_inventory_documents_warehouse_id ON public.inventory_documents(warehouse_id);
CREATE INDEX idx_inventory_documents_supplier_id  ON public.inventory_documents(supplier_id);
CREATE INDEX idx_inventory_documents_status       ON public.inventory_documents(status);
CREATE INDEX idx_inventory_documents_doc_type     ON public.inventory_documents(doc_type);

-- ------------------------------------------------------------
-- 6. inventory_document_items
-- ------------------------------------------------------------
CREATE TABLE public.inventory_document_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES public.inventory_documents(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES public.inventory_products(id),
  quantity    NUMERIC     NOT NULL,
  price       NUMERIC     NOT NULL
);

CREATE INDEX idx_inventory_document_items_document_id ON public.inventory_document_items(document_id);
CREATE INDEX idx_inventory_document_items_product_id  ON public.inventory_document_items(product_id);

-- ------------------------------------------------------------
-- 7. inventory_stock_balances
-- ------------------------------------------------------------
CREATE TABLE public.inventory_stock_balances (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID        NOT NULL REFERENCES public.inventory_products(id),
  warehouse_id UUID        NOT NULL REFERENCES public.inventory_warehouses(id),
  quantity     NUMERIC     NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT inventory_stock_balances_product_warehouse_unique UNIQUE (product_id, warehouse_id)
);

CREATE INDEX idx_inventory_stock_balances_warehouse_id ON public.inventory_stock_balances(warehouse_id);

CREATE TRIGGER set_inventory_stock_balances_updated_at
  BEFORE UPDATE ON public.inventory_stock_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 8. inventory_stock_movements
-- ------------------------------------------------------------
CREATE TABLE public.inventory_stock_movements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID        NOT NULL REFERENCES public.inventory_documents(id),
  product_id      UUID        NOT NULL REFERENCES public.inventory_products(id),
  warehouse_id    UUID        NOT NULL REFERENCES public.inventory_warehouses(id),
  quantity_change NUMERIC     NOT NULL,
  balance_after   NUMERIC     NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_stock_movements_document_id  ON public.inventory_stock_movements(document_id);
CREATE INDEX idx_inventory_stock_movements_product_id   ON public.inventory_stock_movements(product_id);
CREATE INDEX idx_inventory_stock_movements_warehouse_id ON public.inventory_stock_movements(warehouse_id);

-- ============================================================
-- RLS — на этом этапе доступ только для владельца (owner).
-- Паттерн проверки роли идентичен основному проекту:
-- public.get_my_role() = 'owner' (см. crm-system/supabase/migrations/001_functions_core.sql).
-- ============================================================

ALTER TABLE public.inventory_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_warehouses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_document_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_balances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_movements  ENABLE ROW LEVEL SECURITY;

-- Одна политика "владелец может всё" на таблицу (FOR ALL), без
-- разделения по SELECT/INSERT/UPDATE/DELETE — как и запрошено на
-- этом этапе (только владелец работает со складом).
CREATE POLICY "inventory_categories_owner_all"
  ON public.inventory_categories FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_warehouses_owner_all"
  ON public.inventory_warehouses FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_suppliers_owner_all"
  ON public.inventory_suppliers FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_products_owner_all"
  ON public.inventory_products FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_documents_owner_all"
  ON public.inventory_documents FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_document_items_owner_all"
  ON public.inventory_document_items FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_stock_balances_owner_all"
  ON public.inventory_stock_balances FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_stock_movements_owner_all"
  ON public.inventory_stock_movements FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');
