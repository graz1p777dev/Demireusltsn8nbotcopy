-- Кассир не получает доступ к товароучёту. Ему разрешены только данные,
-- необходимые для кассы, и создание собственных документов продажи.

CREATE POLICY "inventory_products_cashier_select"
  ON public.inventory_products FOR SELECT TO authenticated
  USING (public.get_my_role() = 'cashier');

CREATE POLICY "inventory_warehouses_cashier_select"
  ON public.inventory_warehouses FOR SELECT TO authenticated
  USING (public.get_my_role() = 'cashier' AND is_active = true);

CREATE POLICY "inventory_stock_balances_cashier_select"
  ON public.inventory_stock_balances FOR SELECT TO authenticated
  USING (public.get_my_role() = 'cashier');

CREATE POLICY "inventory_documents_cashier_select_own_sales"
  ON public.inventory_documents FOR SELECT TO authenticated
  USING (public.get_my_role() = 'cashier' AND doc_type = 'sale' AND created_by = auth.uid());

CREATE POLICY "inventory_documents_cashier_insert_sale"
  ON public.inventory_documents FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'cashier' AND doc_type = 'sale' AND created_by = auth.uid() AND status = 'draft');

CREATE POLICY "inventory_documents_cashier_post_own_sale"
  ON public.inventory_documents FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'cashier' AND doc_type = 'sale' AND created_by = auth.uid() AND status = 'draft')
  WITH CHECK (public.get_my_role() = 'cashier' AND doc_type = 'sale' AND created_by = auth.uid());

CREATE POLICY "inventory_document_items_cashier_select_own_sales"
  ON public.inventory_document_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_documents d
      WHERE d.id = document_id AND d.doc_type = 'sale' AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "inventory_document_items_cashier_insert_own_sale"
  ON public.inventory_document_items FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'cashier' AND EXISTS (
      SELECT 1 FROM public.inventory_documents d
      WHERE d.id = document_id AND d.doc_type = 'sale' AND d.created_by = auth.uid() AND d.status = 'draft'
    )
  );
