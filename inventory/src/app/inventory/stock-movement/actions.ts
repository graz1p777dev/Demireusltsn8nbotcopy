'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/require-owner'
import { getDocumentTypeConfig, type InventoryDocType } from '@/config/document-types'

export type ActionResult = { success: true } | { success: false; error: string }

// ─── Данные для форм и списка ──────────────────────────────────────────────

export interface DocumentFormWarehouse {
  id: string
  name: string
}

export interface DocumentFormSupplier {
  id: string
  name: string
}

export interface DocumentFormProduct {
  id: string
  name: string
  sku: string
  unit: string
  cost_price: number
  retail_price: number
}

export interface DocumentFormData {
  warehouses: DocumentFormWarehouse[]
  suppliers: DocumentFormSupplier[]
  products: DocumentFormProduct[]
}

export async function getDocumentFormData(): Promise<DocumentFormData> {
  const supabase = await createClient()

  const [{ data: warehouses }, { data: suppliers }, { data: products }] = await Promise.all([
    supabase.from('inventory_warehouses').select('id, name').eq('is_active', true).order('name'),
    supabase.from('inventory_suppliers').select('id, name').order('name'),
    supabase
      .from('inventory_products')
      .select('id, name, sku, unit, cost_price, retail_price')
      .eq('is_active', true)
      .order('name'),
  ])

  return {
    warehouses: warehouses ?? [],
    suppliers: suppliers ?? [],
    products: (products ?? []).map((p) => ({
      ...p,
      cost_price: Number(p.cost_price),
      retail_price: Number(p.retail_price),
    })),
  }
}

export interface DocumentListRow {
  id: string
  doc_number: string
  doc_type: string
  status: string
  total_amount: number
  created_at: string
  warehouse_name: string | null
  target_warehouse_name: string | null
  supplier_name: string | null
}

export async function getDocumentsListData(): Promise<DocumentListRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_documents')
    .select(
      'id, doc_number, doc_type, status, total_amount, created_at, warehouse:inventory_warehouses!warehouse_id(name), target_warehouse:inventory_warehouses!target_warehouse_id(name), inventory_suppliers(name)'
    )
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((d) => ({
    id: d.id,
    doc_number: d.doc_number,
    doc_type: d.doc_type,
    status: d.status,
    total_amount: Number(d.total_amount),
    created_at: d.created_at,
    warehouse_name: d.warehouse?.name ?? null,
    target_warehouse_name: d.target_warehouse?.name ?? null,
    supplier_name: d.inventory_suppliers?.name ?? null,
  }))
}

export interface DocumentItemRow {
  product_id: string
  product_name: string
  quantity: number
  price: number
}

export interface DocumentWithItems {
  id: string
  doc_number: string
  doc_type: string
  status: string
  warehouse_id: string
  target_warehouse_id: string | null
  supplier_id: string | null
  comment: string | null
  total_amount: number
  items: DocumentItemRow[]
}

export async function getDocumentWithItems(id: string): Promise<DocumentWithItems | null> {
  const supabase = await createClient()

  const { data: doc, error: docError } = await supabase
    .from('inventory_documents')
    .select(
      'id, doc_number, doc_type, status, warehouse_id, target_warehouse_id, supplier_id, comment, total_amount'
    )
    .eq('id', id)
    .single()

  if (docError || !doc) return null

  const { data: items } = await supabase
    .from('inventory_document_items')
    .select('product_id, quantity, price, inventory_products(name)')
    .eq('document_id', id)

  return {
    ...doc,
    total_amount: Number(doc.total_amount),
    items: (items ?? []).map((i) => ({
      product_id: i.product_id,
      product_name: i.inventory_products?.name ?? '',
      quantity: Number(i.quantity),
      price: Number(i.price),
    })),
  }
}

// ─── Текущие остатки по складу (для инвентаризации) ────────────────────────

export async function getWarehouseStock(warehouseId: string): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventory_stock_balances')
    .select('product_id, quantity')
    .eq('warehouse_id', warehouseId)

  const map: Record<string, number> = {}
  for (const row of data ?? []) {
    map[row.product_id] = Number(row.quantity)
  }
  return map
}

// ─── createSupplier ─────────────────────────────────────────────────────────

const SupplierSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  phone: z.string().nullable(),
  contact_person: z.string().nullable(),
})

export async function createSupplier(
  input: unknown
): Promise<{ success: true; supplier: DocumentFormSupplier } | { success: false; error: string }> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const parsed = SupplierSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_suppliers')
    .insert(parsed.data)
    .select('id, name')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Не удалось создать поставщика' }
  }

  revalidatePath('/inventory/stock-movement')
  return { success: true, supplier: data }
}

// ─── saveDocument (создание/редактирование любого типа документа) ─────────

function itemSchemaFor(docType: InventoryDocType) {
  return z.object({
    product_id: z.string().uuid(),
    quantity:
      docType === 'inventory_check'
        ? z.coerce.number().min(0, 'Фактический остаток не может быть отрицательным')
        : z.coerce.number().positive('Количество должно быть больше нуля'),
    price: z.coerce.number().min(0),
  })
}

function saveDocumentSchemaFor(docType: InventoryDocType, requiresTargetWarehouse: boolean) {
  return z.object({
    warehouse_id: z.string().uuid('Выберите склад'),
    target_warehouse_id: requiresTargetWarehouse
      ? z.string().uuid('Выберите склад-получатель')
      : z.string().uuid().nullable(),
    supplier_id: z.string().uuid().nullable(),
    comment: z.string().nullable(),
    items: z.array(itemSchemaFor(docType)).min(1, 'Добавьте хотя бы одну строку'),
  })
}

export async function saveDocument(
  documentId: string | null,
  docType: InventoryDocType,
  formData: FormData,
  post: boolean
): Promise<ActionResult & { id?: string }> {
  const guard = await requireOwner()
  if (!guard.ok) return { success: false, error: guard.error }

  const config = getDocumentTypeConfig(docType)
  if (!config || !config.enabled) {
    return { success: false, error: 'Неизвестный или недоступный тип документа' }
  }

  let itemsRaw: unknown
  try {
    itemsRaw = JSON.parse(String(formData.get('items_json') ?? '[]'))
  } catch {
    return { success: false, error: 'Некорректные строки документа' }
  }

  const targetRaw = formData.get('target_warehouse_id')
  const supplierRaw = formData.get('supplier_id')
  const commentRaw = formData.get('comment')

  const schema = saveDocumentSchemaFor(docType, config.requiresTargetWarehouse)
  const parsed = schema.safeParse({
    warehouse_id: formData.get('warehouse_id'),
    target_warehouse_id: targetRaw && String(targetRaw).length > 0 ? String(targetRaw) : null,
    supplier_id: supplierRaw && String(supplierRaw).length > 0 ? String(supplierRaw) : null,
    comment: commentRaw && String(commentRaw).length > 0 ? String(commentRaw) : null,
    items: itemsRaw,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  if (config.requiresTargetWarehouse && parsed.data.warehouse_id === parsed.data.target_warehouse_id) {
    return { success: false, error: 'Склад-источник и склад-получатель должны отличаться' }
  }

  const supabase = await createClient()
  const totalAmount = parsed.data.items.reduce((sum, i) => sum + i.quantity * i.price, 0)

  let docId = documentId

  if (docId) {
    const { data: existing } = await supabase
      .from('inventory_documents')
      .select('status')
      .eq('id', docId)
      .single()

    if (!existing || existing.status !== 'draft') {
      return { success: false, error: 'Нельзя редактировать проведённый документ' }
    }

    const { error: updateError } = await supabase
      .from('inventory_documents')
      .update({
        warehouse_id: parsed.data.warehouse_id,
        target_warehouse_id: parsed.data.target_warehouse_id,
        supplier_id: parsed.data.supplier_id,
        comment: parsed.data.comment,
        total_amount: totalAmount,
      })
      .eq('id', docId)

    if (updateError) return { success: false, error: updateError.message }

    const { error: deleteItemsError } = await supabase
      .from('inventory_document_items')
      .delete()
      .eq('document_id', docId)

    if (deleteItemsError) return { success: false, error: deleteItemsError.message }
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { data: created, error: insertError } = await supabase
      .from('inventory_documents')
      .insert({
        doc_type: docType,
        warehouse_id: parsed.data.warehouse_id,
        target_warehouse_id: parsed.data.target_warehouse_id,
        supplier_id: parsed.data.supplier_id,
        comment: parsed.data.comment,
        total_amount: totalAmount,
        created_by: session?.user.id ?? null,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      return { success: false, error: insertError?.message ?? 'Не удалось создать документ' }
    }
    docId = created.id
  }

  const { error: itemsError } = await supabase.from('inventory_document_items').insert(
    parsed.data.items.map((i) => ({
      document_id: docId,
      product_id: i.product_id,
      quantity: i.quantity,
      price: i.price,
    }))
  )

  if (itemsError) return { success: false, error: itemsError.message }

  if (post) {
    if (docType === 'inventory_check') {
      const convertResult = await convertInventoryCheckItemsToDelta(docId, parsed.data.warehouse_id)
      if (!convertResult.success) return convertResult
    }

    const { error: postError } = await supabase
      .from('inventory_documents')
      .update({ status: 'posted' })
      .eq('id', docId)

    if (postError) return { success: false, error: postError.message }
  }

  revalidatePath('/inventory/stock-movement')
  return { success: true, id: docId }
}

// Для инвентаризации строки хранят "фактический остаток" (как ввёл пользователь),
// а триггер проведения ожидает уже готовую разницу для прибавления к остатку.
// Поэтому непосредственно перед проведением пересчитываем quantity каждой строки
// в дельту относительно текущего системного остатка; строки без отклонения удаляем.
async function convertInventoryCheckItemsToDelta(
  documentId: string,
  warehouseId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('inventory_document_items')
    .select('id, product_id, quantity')
    .eq('document_id', documentId)

  const stockMap = await getWarehouseStock(warehouseId)

  const deletions: string[] = []
  const updates: { id: string; delta: number }[] = []

  for (const item of items ?? []) {
    const current = stockMap[item.product_id] ?? 0
    const delta = Number(item.quantity) - current
    if (delta === 0) {
      deletions.push(item.id)
    } else {
      updates.push({ id: item.id, delta })
    }
  }

  if (deletions.length) {
    const { error } = await supabase.from('inventory_document_items').delete().in('id', deletions)
    if (error) return { success: false, error: error.message }
  }

  for (const u of updates) {
    const { error } = await supabase
      .from('inventory_document_items')
      .update({ quantity: u.delta })
      .eq('id', u.id)
    if (error) return { success: false, error: error.message }
  }

  if (updates.length === 0) {
    return {
      success: false,
      error: 'Нет отклонений между фактическим и системным остатком — нечего проводить',
    }
  }

  return { success: true }
}
