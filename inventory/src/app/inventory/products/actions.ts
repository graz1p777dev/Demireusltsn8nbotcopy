'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/require-owner'

export type ActionResult = { success: true } | { success: false; error: string }

const UNITS = ['шт', 'мл', 'г', 'л', 'уп'] as const

// ─── Данные страницы ────────────────────────────────────────────────────────

export interface CategoryRow {
  id: string
  name: string
  parent_id: string | null
}

export interface WarehouseRow {
  id: string
  name: string
}

export interface ProductRow {
  id: string
  code: number
  name: string
  sku: string
  barcode: string | null
  category_id: string | null
  unit: string
  cost_price: number
  retail_price: number
  discount_percent: number
  min_stock_level: number
  is_active: boolean
  image_url: string | null
  stock_total: number
  stock_by_warehouse: Record<string, number>
}

export interface ProductsPageData {
  categories: CategoryRow[]
  warehouses: WarehouseRow[]
  products: ProductRow[]
}

export async function getProductsPageData(): Promise<ProductsPageData> {
  const supabase = await createClient()

  const [{ data: categories }, { data: warehouses }, { data: products }, { data: balances }] =
    await Promise.all([
      supabase.from('inventory_categories').select('id, name, parent_id').order('name'),
      supabase.from('inventory_warehouses').select('id, name').eq('is_active', true).order('name'),
      supabase
        .from('inventory_products')
        .select(
          'id, code, name, sku, barcode, category_id, unit, cost_price, retail_price, discount_percent, min_stock_level, is_active, image_url'
        )
        .is('deleted_at', null)
        .order('name'),
      supabase.from('inventory_stock_balances').select('product_id, warehouse_id, quantity'),
    ])

  const stockByProduct = new Map<string, number>()
  const stockByProductWarehouse = new Map<string, Record<string, number>>()
  for (const b of balances ?? []) {
    stockByProduct.set(b.product_id, (stockByProduct.get(b.product_id) ?? 0) + Number(b.quantity))
    const byWarehouse = stockByProductWarehouse.get(b.product_id) ?? {}
    byWarehouse[b.warehouse_id] = (byWarehouse[b.warehouse_id] ?? 0) + Number(b.quantity)
    stockByProductWarehouse.set(b.product_id, byWarehouse)
  }

  const productRows: ProductRow[] = (products ?? []).map((p) => ({
    ...p,
    cost_price: Number(p.cost_price),
    retail_price: Number(p.retail_price),
    discount_percent: Number(p.discount_percent),
    stock_total: stockByProduct.get(p.id) ?? 0,
    stock_by_warehouse: stockByProductWarehouse.get(p.id) ?? {},
  }))

  return {
    categories: categories ?? [],
    warehouses: warehouses ?? [],
    products: productRows,
  }
}

// ─── Корзина ────────────────────────────────────────────────────────────────

export interface TrashProductRow {
  id: string
  code: number
  name: string
  sku: string
  unit: string
  deleted_at: string
}

export async function getTrashPageData(): Promise<TrashProductRow[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventory_products')
    .select('id, code, name, sku, unit, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (data ?? []) as TrashProductRow[]
}

const IdsSchema = z.array(z.string().uuid()).min(1, 'Не выбрано ни одного товара')

export async function softDeleteProducts(ids: unknown): Promise<ActionResult> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = IdsSchema.safeParse(ids)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_products')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', parsed.data)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/products')
  revalidatePath('/inventory/trash')
  return { success: true }
}

export async function restoreProducts(ids: unknown): Promise<ActionResult> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = IdsSchema.safeParse(ids)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_products')
    .update({ deleted_at: null })
    .in('id', parsed.data)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/products')
  revalidatePath('/inventory/trash')
  return { success: true }
}

export async function permanentlyDeleteProducts(ids: unknown): Promise<ActionResult> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = IdsSchema.safeParse(ids)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }

  const supabase = await createClient()
  const { error } = await supabase.from('inventory_products').delete().in('id', parsed.data)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/trash')
  return { success: true }
}

// ─── createCategory ─────────────────────────────────────────────────────────

const CategorySchema = z.object({
  name: z.string().min(1, 'Название категории обязательно'),
})

export async function createCategory(
  input: unknown
): Promise<{ success: true; category: CategoryRow } | { success: false; error: string }> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = CategorySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert({ name: parsed.data.name })
    .select('id, name, parent_id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Не удалось создать категорию' }
  }

  revalidatePath('/inventory/products')
  return { success: true, category: data }
}

// ─── createProduct / updateProduct ─────────────────────────────────────────

const ProductSchema = z.object({
  name: z.string().min(1, 'Наименование обязательно'),
  sku: z.string().min(1, 'Артикул обязателен'),
  barcode: z.string().nullable(),
  category_id: z.string().uuid().nullable(),
  unit: z.enum(UNITS),
  cost_price: z.coerce.number().min(0),
  retail_price: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100),
  min_stock_level: z.coerce.number().int().min(0),
})

function readProductFormFields(formData: FormData) {
  const categoryIdRaw = formData.get('category_id')
  const barcodeRaw = formData.get('barcode')
  return {
    name: formData.get('name'),
    sku: formData.get('sku'),
    barcode: barcodeRaw && String(barcodeRaw).length > 0 ? String(barcodeRaw) : null,
    category_id: categoryIdRaw && String(categoryIdRaw).length > 0 ? String(categoryIdRaw) : null,
    unit: formData.get('unit'),
    cost_price: formData.get('cost_price'),
    retail_price: formData.get('retail_price'),
    discount_percent: formData.get('discount_percent'),
    min_stock_level: formData.get('min_stock_level'),
  }
}

async function uploadProductImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageFile: File
): Promise<{ url: string } | { error: string }> {
  const ext = imageFile.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('inventory-products')
    .upload(path, imageFile, { contentType: imageFile.type })

  if (uploadError) return { error: `Не удалось загрузить изображение: ${uploadError.message}` }

  const {
    data: { publicUrl },
  } = supabase.storage.from('inventory-products').getPublicUrl(path)

  return { url: publicUrl }
}

export async function createProduct(
  formData: FormData
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = ProductSchema.safeParse(readProductFormFields(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()

  const { data: skuTaken } = await supabase
    .from('inventory_products')
    .select('id')
    .eq('sku', parsed.data.sku)
    .maybeSingle()
  if (skuTaken) return { success: false, error: 'Товар с таким артикулом уже существует' }

  let imageUrl: string | null = null
  const imageFile = formData.get('image')
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadProductImage(supabase, imageFile)
    if ('error' in uploaded) return { success: false, error: uploaded.error }
    imageUrl = uploaded.url
  }

  const { data: product, error: insertError } = await supabase
    .from('inventory_products')
    .insert({ ...parsed.data, image_url: imageUrl })
    .select('id')
    .single()

  if (insertError || !product) {
    return { success: false, error: insertError?.message ?? 'Не удалось создать товар' }
  }

  const initialStockResult = await maybeCreateInitialStockDocument(supabase, formData, {
    productId: product.id,
    costPrice: parsed.data.cost_price,
  })
  if (!initialStockResult.success) {
    return {
      success: false,
      error: `Товар создан, но начальные остатки не проведены: ${initialStockResult.error}`,
    }
  }

  revalidatePath('/inventory/products')
  return { success: true, id: product.id }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = ProductSchema.safeParse(readProductFormFields(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()

  const { data: skuTaken } = await supabase
    .from('inventory_products')
    .select('id')
    .eq('sku', parsed.data.sku)
    .neq('id', id)
    .maybeSingle()
  if (skuTaken) return { success: false, error: 'Товар с таким артикулом уже существует' }

  let imageUrl: string | undefined
  const imageFile = formData.get('image')
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadProductImage(supabase, imageFile)
    if ('error' in uploaded) return { success: false, error: uploaded.error }
    imageUrl = uploaded.url
  }

  const { error } = await supabase
    .from('inventory_products')
    .update(imageUrl ? { ...parsed.data, image_url: imageUrl } : parsed.data)
    .eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/inventory/products')
  return { success: true }
}

// ─── Импорт товаров из CSV ──────────────────────────────────────────────────

const ImportRowSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().nullable(),
  category: z.string().nullable(),
  unit: z.enum(UNITS),
  cost_price: z.coerce.number().min(0),
  retail_price: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100),
  min_stock_level: z.coerce.number().int().min(0),
})

export type ImportProductRow = z.infer<typeof ImportRowSchema>

export interface ImportRowError {
  row: number
  message: string
}

export type ImportProductsResult =
  | { success: true; created: number; updated: number; errors: ImportRowError[]; newCategories: CategoryRow[] }
  | { success: false; error: string }

export async function importProducts(rawRows: unknown): Promise<ImportProductsResult> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { success: false, error: "Нет строк для импорта" }
  }
  if (rawRows.length > 2000) {
    return { success: false, error: "Слишком много строк за один раз (максимум 2000)" }
  }

  const errors: ImportRowError[] = []
  const validRows: { row: ImportProductRow; index: number }[] = []

  rawRows.forEach((raw, index) => {
    const parsed = ImportRowSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push({ row: index + 1, message: parsed.error.issues[0]?.message ?? "Ошибка валидации" })
      return
    }
    validRows.push({ row: parsed.data, index })
  })

  const skusInFile = new Set<string>()
  for (const { row, index } of validRows) {
    if (skusInFile.has(row.sku)) {
      errors.push({ row: index + 1, message: `Повторяющийся артикул в файле: ${row.sku}` })
      continue
    }
    skusInFile.add(row.sku)
  }
  const dedupedRows = validRows.filter(({ row }, i) => validRows.findIndex((r) => r.row.sku === row.sku) === i)

  if (dedupedRows.length === 0) {
    return { success: true, created: 0, updated: 0, errors, newCategories: [] }
  }

  const supabase = await createClient()

  const { data: existingCategories } = await supabase
    .from("inventory_categories")
    .select("id, name")
  const categoryByName = new Map<string, string>(
    (existingCategories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id])
  )

  const neededCategoryNames = new Set<string>()
  for (const { row } of dedupedRows) {
    const name = row.category?.trim()
    if (name && !categoryByName.has(name.toLowerCase())) neededCategoryNames.add(name)
  }

  const newCategories: CategoryRow[] = []
  if (neededCategoryNames.size > 0) {
    const { data: createdCategories, error: categoryError } = await supabase
      .from("inventory_categories")
      .insert(Array.from(neededCategoryNames).map((name) => ({ name })))
      .select("id, name, parent_id")

    if (categoryError) return { success: false, error: `Не удалось создать категории: ${categoryError.message}` }
    for (const c of createdCategories ?? []) {
      categoryByName.set(c.name.trim().toLowerCase(), c.id)
      newCategories.push(c)
    }
  }

  const skus = dedupedRows.map(({ row }) => row.sku)
  const { data: existingProducts } = await supabase
    .from("inventory_products")
    .select("sku")
    .in("sku", skus)
  const existingSkuSet = new Set((existingProducts ?? []).map((p) => p.sku))

  const payload = dedupedRows.map(({ row }) => ({
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category_id: row.category?.trim() ? (categoryByName.get(row.category.trim().toLowerCase()) ?? null) : null,
    unit: row.unit,
    cost_price: row.cost_price,
    retail_price: row.retail_price,
    discount_percent: row.discount_percent,
    min_stock_level: row.min_stock_level,
  }))

  const { error: upsertError } = await supabase
    .from("inventory_products")
    .upsert(payload, { onConflict: "sku" })

  if (upsertError) return { success: false, error: `Не удалось сохранить товары: ${upsertError.message}` }

  const created = payload.filter((p) => !existingSkuSet.has(p.sku)).length
  const updated = payload.length - created

  revalidatePath("/inventory/products")
  return { success: true, created, updated, errors, newCategories }
}

// ─── Начальные остатки ──────────────────────────────────────────────────────
// Документ создаётся как черновик и сразу переводится в posted одним UPDATE —
// это специально сделано так, чтобы сработал существующий триггер проведения
// (inventory_handle_document_posting), а не дублировать его логику здесь.

async function maybeCreateInitialStockDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  ctx: { productId: string; costPrice: number }
): Promise<ActionResult> {
  const enabled = formData.get('initial_stock_enabled') === 'on'
  if (!enabled) return { success: true }

  const warehouseId = formData.get('initial_stock_warehouse_id')
  const quantity = Number(formData.get('initial_stock_quantity'))

  if (!warehouseId || typeof warehouseId !== 'string') {
    return { success: false, error: 'Выберите склад для начального остатка' }
  }
  if (!(quantity > 0)) {
    return { success: false, error: 'Укажите количество начального остатка больше нуля' }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: doc, error: docError } = await supabase
    .from('inventory_documents')
    .insert({
      doc_type: 'correction',
      warehouse_id: warehouseId,
      created_by: session?.user.id ?? null,
      comment: 'Начальный остаток при создании товара',
    })
    .select('id')
    .single()

  if (docError || !doc) {
    return { success: false, error: docError?.message ?? 'Не удалось создать документ остатков' }
  }

  const { error: itemError } = await supabase.from('inventory_document_items').insert({
    document_id: doc.id,
    product_id: ctx.productId,
    quantity,
    price: ctx.costPrice,
  })
  if (itemError) return { success: false, error: itemError.message }

  const { error: postError } = await supabase
    .from('inventory_documents')
    .update({ status: 'posted' })
    .eq('id', doc.id)
  if (postError) return { success: false, error: postError.message }

  return { success: true }
}
