"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Folder, FolderOpen, ImageIcon, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CategoryRow, ProductRow } from "@/app/inventory/products/actions"
import { WAREHOUSE_COLUMN_PREFIX, type ProductColumnDef } from "./product-columns"

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

export interface ProductGroup {
  key: string
  title: string
  products: ProductRow[]
}

interface ProductsListProps {
  groups: ProductGroup[]
  flatProducts: ProductRow[]
  grouped: boolean
  categories: CategoryRow[]
  columnDefs: ProductColumnDef[]
  visibility: Record<string, boolean>
  onRowClick: (product: ProductRow) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}

function renderColumnCell(key: string, p: ProductRow, categoryName: string | null): React.ReactNode {
  if (key === "code") return <span className="font-mono text-foreground/60">{p.code}</span>
  if (key === "group") return <span className="truncate text-foreground/60">{categoryName ?? "—"}</span>
  if (key === "barcode") {
    return <span className="truncate font-mono text-foreground/60">{p.barcode ?? "—"}</span>
  }
  if (key === "sku") return <span className="truncate font-mono text-foreground/60">{p.sku}</span>
  if (key === "unit") return <span className="text-foreground/60">{p.unit}</span>
  if (key === "retail_price") {
    return <span className="block text-right font-mono font-semibold">{formatMoney(p.retail_price)}</span>
  }
  if (key === "cost_basis" || key === "cost_price") {
    return <span className="block text-right font-mono">{formatMoney(p.cost_price)}</span>
  }
  if (key === "discount_percent") {
    return <span className="block text-right font-mono">{p.discount_percent}%</span>
  }
  if (key === "min_stock_level") {
    return <span className="block text-right font-mono">{p.min_stock_level}</span>
  }
  if (key.startsWith(WAREHOUSE_COLUMN_PREFIX)) {
    const warehouseId = key.slice(WAREHOUSE_COLUMN_PREFIX.length)
    return <span className="block text-right font-mono font-semibold">{p.stock_by_warehouse[warehouseId] ?? 0}</span>
  }
  return null
}

export function ProductsList({
  groups,
  flatProducts,
  grouped,
  categories,
  columnDefs,
  visibility,
  onRowClick,
  selectedIds,
  onToggleSelect,
}: ProductsListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const showPhoto = visibility.photo ?? true
  const extraColumns = columnDefs.filter((d) => d.key !== "photo" && (visibility[d.key] ?? d.defaultVisible))
  const gridTemplate = `36px 2.4fr ${extraColumns.map(() => "1fr").join(" ")} 1fr`

  function renderRow(p: ProductRow) {
    return (
      <div
        key={p.id}
        onClick={() => onRowClick(p)}
        className="group grid cursor-pointer items-center gap-3 border-b border-border px-5 py-2.5 text-[13px] hover:bg-muted/30"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(p.id)
          }}
          className={cn(
            "flex size-[15px] items-center justify-center rounded border-[1.5px]",
            selectedIds.has(p.id) ? "border-primary bg-primary text-primary-foreground" : "border-[#a2b4c0]"
          )}
        >
          {selectedIds.has(p.id) && (
            <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
              <path
                d="M2 6l2.5 2.5L10 3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        <span className={cn("flex items-center gap-2.5", grouped && "pl-[26px]")}>
          {showPhoto && (
            <span className="flex size-[30px] flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-[#eef2f4]">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-3.5 text-muted-foreground" />
              )}
            </span>
          )}
          <span className="truncate font-semibold">{p.name}</span>
          <Pencil className="size-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </span>

        {extraColumns.map((col) => (
          <span key={col.key} className="truncate">
            {renderColumnCell(col.key, p, categoryNameById.get(p.category_id ?? "") ?? null)}
          </span>
        ))}

        <span className="block text-right font-mono font-semibold">{p.stock_total}</span>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div
        className="grid items-center gap-3 border-b border-border bg-[#f4f7f8] px-5 py-2.5 text-[11px] font-semibold tracking-wide text-foreground/50 uppercase"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span className="block size-[15px] rounded border-[1.5px] border-[#a2b4c0]" />
        <span>Наименование</span>
        {extraColumns.map((col) => (
          <span key={col.key} className="truncate">
            {col.label}
          </span>
        ))}
        <span className="text-right">Остатки</span>
      </div>

      <div>
        {grouped
          ? groups.map((group) => {
              const isOpen = !collapsed.has(group.key)
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className={cn(
                      "flex w-full items-center gap-2.5 border-b border-border px-5 py-2.5 text-left transition-colors",
                      isOpen ? "bg-[#eef2f4]" : "hover:bg-muted/40"
                    )}
                  >
                    {isOpen ? (
                      <ChevronDown className="size-[15px] flex-shrink-0" />
                    ) : (
                      <ChevronRight className="size-[15px] flex-shrink-0" />
                    )}
                    {isOpen ? (
                      <FolderOpen className="size-[17px] flex-shrink-0 text-primary" />
                    ) : (
                      <Folder className="size-[17px] flex-shrink-0 text-[#a2b4c0]" />
                    )}
                    <span className="text-sm font-semibold">{group.title}</span>
                    <span className="font-mono text-xs text-foreground/45">{group.products.length}</span>
                  </button>

                  {isOpen && group.products.map(renderRow)}
                </div>
              )
            })
          : flatProducts.map(renderRow)}
      </div>
    </div>
  )
}
