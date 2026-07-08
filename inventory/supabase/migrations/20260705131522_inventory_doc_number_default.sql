-- ============================================================
-- Migration: inventory_doc_number_default
-- Даёт inventory_documents.doc_number DEFAULT '' — чисто для того,
-- чтобы Supabase gen types считал колонку опциональной в Insert<>
-- (иначе типизированный клиент требует doc_number всегда, хотя
-- на самом деле его генерирует триггер trg_inventory_documents_set_doc_number).
-- ============================================================

ALTER TABLE public.inventory_documents ALTER COLUMN doc_number SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.inventory_set_doc_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.doc_number IS NULL OR NEW.doc_number = '' THEN
    NEW.doc_number := public.inventory_generate_doc_number(NEW.doc_type);
  END IF;
  RETURN NEW;
END;
$$;
