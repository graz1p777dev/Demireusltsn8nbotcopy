-- ============================================================
-- Migration: inventory_document_posting
-- Автонумерация документов (per-doc_type counter) и проведение
-- документа (draft -> posted): движение остатков + себестоимость.
-- ============================================================

-- ------------------------------------------------------------
-- Нумерация: PREFIX-000001, отдельный счётчик на каждый doc_type.
-- ------------------------------------------------------------
CREATE TABLE public.inventory_doc_number_counters (
  doc_type    TEXT    PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.inventory_doc_number_counters (doc_type) VALUES
  ('purchase'), ('sale'), ('purchase_return'), ('sale_return'),
  ('writeoff'), ('correction'), ('inventory_check'), ('transfer');

CREATE OR REPLACE FUNCTION public.inventory_doc_type_prefix(p_doc_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_doc_type
    WHEN 'purchase'        THEN 'ЗАК'
    WHEN 'sale'             THEN 'ПРД'
    WHEN 'purchase_return'  THEN 'ВЗК'
    WHEN 'sale_return'      THEN 'ВПР'
    WHEN 'writeoff'         THEN 'СПС'
    WHEN 'correction'       THEN 'КОР'
    WHEN 'inventory_check'  THEN 'ИНВ'
    WHEN 'transfer'         THEN 'ПЕР'
    ELSE 'ДОК'
  END;
$$;

-- Атомарный инкремент счётчика + форматирование номера.
CREATE OR REPLACE FUNCTION public.inventory_generate_doc_number(p_doc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  UPDATE public.inventory_doc_number_counters
  SET last_number = last_number + 1
  WHERE doc_type = p_doc_type
  RETURNING last_number INTO v_next;

  -- Защитный случай: doc_type без предзаполненной строки счётчика
  -- (не должен происходить, т.к. CHECK на inventory_documents.doc_type
  -- ограничивает тем же набором значений, что и seed выше).
  IF v_next IS NULL THEN
    INSERT INTO public.inventory_doc_number_counters (doc_type, last_number)
    VALUES (p_doc_type, 1)
    ON CONFLICT (doc_type) DO UPDATE
      SET last_number = public.inventory_doc_number_counters.last_number + 1
    RETURNING last_number INTO v_next;
  END IF;

  RETURN public.inventory_doc_type_prefix(p_doc_type) || '-' || LPAD(v_next::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_set_doc_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.doc_number IS NULL THEN
    NEW.doc_number := public.inventory_generate_doc_number(NEW.doc_type);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_documents_set_doc_number
  BEFORE INSERT ON public.inventory_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_set_doc_number();

-- ------------------------------------------------------------
-- Проведение документа.
-- Хелпер: применить изменение остатка + записать движение.
-- Возвращает итоговый остаток (balance_after).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inventory_apply_stock_change(
  p_product_id     UUID,
  p_warehouse_id   UUID,
  p_quantity_change NUMERIC,
  p_document_id    UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  INSERT INTO public.inventory_stock_balances (product_id, warehouse_id, quantity)
  VALUES (p_product_id, p_warehouse_id, p_quantity_change)
  ON CONFLICT (product_id, warehouse_id) DO UPDATE
    SET quantity   = public.inventory_stock_balances.quantity + EXCLUDED.quantity,
        updated_at = now()
  RETURNING quantity INTO v_balance;

  INSERT INTO public.inventory_stock_movements (
    document_id, product_id, warehouse_id, quantity_change, balance_after
  ) VALUES (
    p_document_id, p_product_id, p_warehouse_id, p_quantity_change, v_balance
  );

  RETURN v_balance;
END;
$$;

-- ------------------------------------------------------------
-- Триггер на смену статуса inventory_documents.
--
-- draft -> posted : провести документ (движение остатков + себестоимость)
-- posted -> posted : не наступает — WHEN ниже фильтрует "без изменений"
-- posted -> draft  : запрещено (откат — отдельная задача в будущем)
--
-- Черновики (status = 'draft') остатки не трогают: логика ниже
-- срабатывает только в момент самого перехода на 'posted'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inventory_handle_document_posting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF OLD.status = 'posted' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION
      'inventory_documents: откат проведённого документа % в черновик пока не поддерживается',
      OLD.doc_number;
  END IF;

  IF NOT (OLD.status = 'draft' AND NEW.status = 'posted') THEN
    -- Единственный другой достижимый переход при OLD.status IS DISTINCT
    -- FROM NEW.status и CHECK-ограничении на 2 статуса — не должен
    -- случаться, но на всякий случай ничего не делаем со остатками.
    RETURN NEW;
  END IF;

  FOR v_item IN
    SELECT product_id, quantity, price
    FROM public.inventory_document_items
    WHERE document_id = NEW.id
  LOOP
    IF NEW.doc_type = 'transfer' THEN
      IF NEW.target_warehouse_id IS NULL THEN
        RAISE EXCEPTION
          'inventory_documents: у документа перемещения % не указан целевой склад',
          NEW.doc_number;
      END IF;
      PERFORM public.inventory_apply_stock_change(v_item.product_id, NEW.warehouse_id, -v_item.quantity, NEW.id);
      PERFORM public.inventory_apply_stock_change(v_item.product_id, NEW.target_warehouse_id, v_item.quantity, NEW.id);
    ELSIF NEW.doc_type IN ('purchase', 'sale_return', 'correction', 'inventory_check') THEN
      PERFORM public.inventory_apply_stock_change(v_item.product_id, NEW.warehouse_id, v_item.quantity, NEW.id);
    ELSIF NEW.doc_type IN ('sale', 'purchase_return', 'writeoff') THEN
      PERFORM public.inventory_apply_stock_change(v_item.product_id, NEW.warehouse_id, -v_item.quantity, NEW.id);
    ELSE
      RAISE EXCEPTION 'inventory_documents: неизвестный doc_type %', NEW.doc_type;
    END IF;

    IF NEW.doc_type = 'purchase' THEN
      UPDATE public.inventory_products
      SET cost_price = v_item.price
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  NEW.posted_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_documents_posting
  BEFORE UPDATE OF status ON public.inventory_documents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.inventory_handle_document_posting();
