// doc_type значения соответствуют CHECK-ограничению inventory_documents.doc_type
// (см. supabase/migrations/20260705123746_inventory_schema.sql).
// 'correction' сюда не входит — используется только внутренним механизмом
// начальных остатков при создании товара, пользователю не показывается.
export type InventoryDocType =
  | "purchase"
  | "sale"
  | "purchase_return"
  | "sale_return"
  | "writeoff"
  | "inventory_check"
  | "transfer"

// Как показывать цену в строке товара:
// - editable-cost: цена закупки, редактируется, влияет на себестоимость (только "Приход")
// - readonly-reference: розничная цена товара, только для справки, на остаток не влияет ("Расход")
// - none: цена не нужна и не показывается вовсе
export type ItemPriceMode = "editable-cost" | "readonly-reference" | "none"

export interface DocumentTypeOption {
  docType: InventoryDocType
  label: string
  enabled: boolean
  createTitle: string
  editTitlePrefix: string
  requiresSupplier: boolean
  requiresTargetWarehouse: boolean
  priceMode: ItemPriceMode
  quantityColumnLabel: string
  warehouseLabel: string
  // Инвентаризация: строка хранит "фактический остаток", а не количество к движению;
  // разницу с системным остатком вычисляет сервер в момент проведения.
  isStockCheck: boolean
}

export const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  {
    docType: "purchase",
    label: "Приход",
    enabled: true,
    createTitle: "Новый приход",
    editTitlePrefix: "Приход",
    requiresSupplier: true,
    requiresTargetWarehouse: false,
    priceMode: "editable-cost",
    quantityColumnLabel: "Кол-во",
    warehouseLabel: "Склад",
    isStockCheck: false,
  },
  {
    docType: "sale",
    label: "Расход",
    enabled: true,
    createTitle: "Новый расход",
    editTitlePrefix: "Расход",
    requiresSupplier: false,
    requiresTargetWarehouse: false,
    priceMode: "readonly-reference",
    quantityColumnLabel: "Кол-во",
    warehouseLabel: "Склад",
    isStockCheck: false,
  },
  {
    docType: "transfer",
    label: "Перемещение",
    enabled: true,
    createTitle: "Новое перемещение",
    editTitlePrefix: "Перемещение",
    requiresSupplier: false,
    requiresTargetWarehouse: true,
    priceMode: "none",
    quantityColumnLabel: "Кол-во",
    warehouseLabel: "Склад-источник",
    isStockCheck: false,
  },
  {
    docType: "inventory_check",
    label: "Инвентаризация",
    enabled: true,
    createTitle: "Новая инвентаризация",
    editTitlePrefix: "Инвентаризация",
    requiresSupplier: false,
    requiresTargetWarehouse: false,
    priceMode: "none",
    quantityColumnLabel: "Факт. остаток",
    warehouseLabel: "Склад",
    isStockCheck: true,
  },
  {
    docType: "purchase_return",
    label: "Возврат поставщику",
    enabled: false,
    createTitle: "Новый возврат поставщику",
    editTitlePrefix: "Возврат поставщику",
    requiresSupplier: true,
    requiresTargetWarehouse: false,
    priceMode: "editable-cost",
    quantityColumnLabel: "Кол-во",
    warehouseLabel: "Склад",
    isStockCheck: false,
  },
  {
    docType: "sale_return",
    label: "Возврат от клиента",
    enabled: false,
    createTitle: "Новый возврат от клиента",
    editTitlePrefix: "Возврат от клиента",
    requiresSupplier: false,
    requiresTargetWarehouse: false,
    priceMode: "readonly-reference",
    quantityColumnLabel: "Кол-во",
    warehouseLabel: "Склад",
    isStockCheck: false,
  },
  {
    docType: "writeoff",
    label: "Списание",
    enabled: true,
    createTitle: "Новое списание",
    editTitlePrefix: "Списание",
    requiresSupplier: false,
    requiresTargetWarehouse: false,
    priceMode: "none",
    quantityColumnLabel: "Кол-во",
    warehouseLabel: "Склад",
    isStockCheck: false,
  },
]

export const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((o) => [o.docType, o.label])
)

export function getDocumentTypeConfig(docType: string): DocumentTypeOption | undefined {
  return DOCUMENT_TYPE_OPTIONS.find((o) => o.docType === docType)
}
