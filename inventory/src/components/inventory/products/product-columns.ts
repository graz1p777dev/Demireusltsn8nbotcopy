"use client"

import { useColumnVisibility, type ColumnDef } from "@/lib/use-column-visibility"
import type { WarehouseRow } from "@/app/inventory/products/actions"

export const WAREHOUSE_COLUMN_PREFIX = "warehouse:"

export type ProductColumnDef = ColumnDef

// Порядок и состав чекбоксов в поповере "Настройки таблицы" — соответствует
// списку из ТЗ. "Остатки" (итоговая колонка) сюда не входит — она не
// отключаема и всегда идёт последней.
export function buildProductColumnDefs(warehouses: WarehouseRow[]): ProductColumnDef[] {
  return [
    { key: "photo", label: "Фотография", defaultVisible: true },
    { key: "code", label: "Код", defaultVisible: true },
    { key: "group", label: "Группа", defaultVisible: false },
    { key: "barcode", label: "Штрих-код", defaultVisible: false },
    { key: "sku", label: "Артикул", defaultVisible: false },
    { key: "unit", label: "Ед. изм.", defaultVisible: true },
    { key: "retail_price", label: "Цена продажи", defaultVisible: true },
    { key: "cost_basis", label: "Себестоимость", defaultVisible: false },
    { key: "cost_price", label: "Цена закупки", defaultVisible: false },
    { key: "discount_percent", label: "Скидка", defaultVisible: true },
    { key: "min_stock_level", label: "Мин. остаток", defaultVisible: false },
    ...warehouses.map((w) => ({
      key: `${WAREHOUSE_COLUMN_PREFIX}${w.id}`,
      label: w.name,
      defaultVisible: true,
    })),
  ]
}

const STORAGE_KEY = "demi-inventory:product-columns:v1"

export function useProductColumnVisibility(defs: ProductColumnDef[]) {
  return useColumnVisibility(STORAGE_KEY, defs)
}
