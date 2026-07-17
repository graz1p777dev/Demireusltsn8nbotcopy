import 'server-only'

import { createClient } from '@/lib/supabase/server'

export interface ShopProduct {
  id: string
  name: string
  sku: string
  unit: string
  retailPrice: number
  discountPercent: number
  imageUrl: string | null
  description: string | null
  country: string | null
  stock: number
}

export async function getShopProducts(): Promise<ShopProduct[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_shop_products')

  if (error) throw new Error(`Не удалось загрузить каталог: ${error.message}`)

  return (data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    retailPrice: Number(product.retail_price),
    discountPercent: Number(product.discount_percent),
    imageUrl: product.image_url,
    description: product.description,
    country: product.country,
    stock: Math.max(0, Number(product.stock)),
  }))
}
