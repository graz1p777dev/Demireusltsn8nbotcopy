"use client"

import { useRef, useState } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOutsideDismiss } from "@/lib/use-outside-dismiss"
import type { DocumentFormProduct } from "@/app/inventory/stock-movement/actions"

interface ProductComboboxProps {
  products: DocumentFormProduct[]
  onSelect: (product: DocumentFormProduct) => void
}

export function ProductCombobox({ products, onSelect }: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useOutsideDismiss(containerRef, () => setOpen(false), open)

  const filtered = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase())
      )
    : products

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen((v) => !v)}>
        <Plus className="size-4" />
        Добавить товар
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg">
          <div className="relative border-b border-border p-2">
            <Search className="absolute top-1/2 left-4.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Поиск по наименованию или артикулу"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-7"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">Ничего не найдено</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p)
                    setQuery("")
                    setOpen(false)
                  }}
                  className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.sku} · {p.cost_price.toLocaleString("ru-RU")} ₽/{p.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
