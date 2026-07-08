-- ============================================================
-- Migration: inventory_products_image_and_storage
-- Фото товара: колонка + Storage bucket.
-- Паттерн bucket + RLS — как avatars/logos в
-- crm-system/supabase/migrations/019_storage.sql (публичное чтение,
-- запись только владельцу).
-- ============================================================

ALTER TABLE public.inventory_products
  ADD COLUMN image_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-products',
  'inventory-products',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "inventory_products_bucket_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory-products');

CREATE POLICY "inventory_products_bucket_insert_owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inventory-products'
    AND public.get_my_role() = 'owner'
  );

CREATE POLICY "inventory_products_bucket_update_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'inventory-products'
    AND public.get_my_role() = 'owner'
  );

CREATE POLICY "inventory_products_bucket_delete_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inventory-products'
    AND public.get_my_role() = 'owner'
  );
