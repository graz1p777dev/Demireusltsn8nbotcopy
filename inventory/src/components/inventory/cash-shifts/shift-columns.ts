"use client"

import { useColumnVisibility, type ColumnDef } from "@/lib/use-column-visibility"

// "Статус" и "Номер" всегда видимы (как Наименование/Остатки в товарах) —
// в поповере настроек участвуют только остальные колонки.
export const SHIFT_COLUMN_DEFS: ColumnDef[] = [
  { key: "opened_at", label: "Открыта", defaultVisible: true },
  { key: "closed_at", label: "Закрыта", defaultVisible: true },
  { key: "cashier", label: "Кассир", defaultVisible: true },
  { key: "register", label: "Касса", defaultVisible: true },
  { key: "warehouse", label: "Магазин", defaultVisible: true },
  { key: "revenue", label: "Выручка", defaultVisible: true },
  { key: "sales_count", label: "Продажи", defaultVisible: true },
  { key: "sales_amount", label: "Сумма продаж", defaultVisible: true },
  { key: "cash_on_hand", label: "Наличные", defaultVisible: true },
]

const STORAGE_KEY = "demi-inventory:shift-columns:v1"

export function useShiftColumnVisibility() {
  return useColumnVisibility(STORAGE_KEY, SHIFT_COLUMN_DEFS)
}
