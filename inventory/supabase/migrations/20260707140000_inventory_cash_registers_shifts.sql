-- ============================================================
-- Migration: inventory_cash_registers_shifts
-- Раздел "Кассы и смены": кассы (registers), кассиры, привязанные
-- к кассе (register_cashiers), и рабочие смены (shifts).
--
-- cashier_id ссылается на уже существующую таблицу public.employees
-- (общий проект с crm-system) — отдельной модели сотрудников для
-- инвентаризации не создаём, как и попросили.
-- ============================================================

CREATE TABLE public.inventory_registers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.inventory_warehouses(id),
  balance      numeric NOT NULL DEFAULT 0,
  -- Способы оплаты/эквайринга — редактируемые текстовые теги без
  -- реальной интеграции на этом этапе.
  terminals    text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_register_cashiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id uuid NOT NULL REFERENCES public.inventory_registers(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (register_id, employee_id)
);

CREATE TABLE public.inventory_shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- "Смена #N" в интерфейсе — сквозной номер по всем сменам.
  shift_number  bigint GENERATED ALWAYS AS IDENTITY,
  register_id   uuid NOT NULL REFERENCES public.inventory_registers(id),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  cashier_id    uuid NOT NULL REFERENCES public.employees(id),
  -- Заполняются автоматически "Интерфейсом кассира" на следующем шаге;
  -- пока не имеющая реальных продаж смена держит нули.
  revenue       numeric NOT NULL DEFAULT 0,
  sales_count   integer NOT NULL DEFAULT 0,
  sales_amount  numeric NOT NULL DEFAULT 0,
  -- Фактическая наличность, пересчитанная кассиром при закрытии смены.
  cash_on_hand  numeric NOT NULL DEFAULT 0
);

CREATE INDEX inventory_shifts_register_id_idx ON public.inventory_shifts(register_id);
CREATE INDEX inventory_register_cashiers_register_id_idx ON public.inventory_register_cashiers(register_id);

-- ============================================================
-- RLS: тот же паттерн "владелец может всё", что и у остальных
-- таблиц склада (см. inventory_schema.sql) — на этом проекте новые
-- таблицы по умолчанию открыты для anon/authenticated без RLS.
-- ============================================================

ALTER TABLE public.inventory_registers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_register_cashiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_shifts            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_registers_owner_all"
  ON public.inventory_registers FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_register_cashiers_owner_all"
  ON public.inventory_register_cashiers FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "inventory_shifts_owner_all"
  ON public.inventory_shifts FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');
