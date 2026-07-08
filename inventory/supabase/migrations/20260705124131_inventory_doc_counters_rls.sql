-- ============================================================
-- Migration: inventory_doc_counters_rls
-- inventory_doc_number_counters не входит в список из 8 бизнес-таблиц,
-- но это тоже таблица склада, и на этом проекте по умолчанию anon/
-- authenticated получают полный CRUD на новые таблицы без RLS.
-- Закрываем тем же паттерном (владелец), что и остальные 8 таблиц.
-- ============================================================

ALTER TABLE public.inventory_doc_number_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_doc_number_counters_owner_all"
  ON public.inventory_doc_number_counters FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');
