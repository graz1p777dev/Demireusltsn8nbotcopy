"use client"

import { useState } from "react"
import { Plus, Store as StoreIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StoreCreateDialog } from "./store-create-dialog"
import { INITIAL_STORES } from "./company-mock-data"
import type { StoreRow } from "./company-mock-data"

export function StoresPageClient() {
  const [stores, setStores] = useState<StoreRow[]>(INITIAL_STORES)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleCreate(fields: { name: string; address: string }) {
    setStores((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: fields.name, address: fields.address, staff: 0, registers: 0, stockLabel: "0 позиций" },
    ])
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Добавить магазин
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-col gap-0">
              <div className="flex items-center gap-3">
                <span className="flex size-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <StoreIcon className="size-[21px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.address}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3.5">
                <div>
                  <p className="text-lg font-bold">{s.staff}</p>
                  <p className="text-[11px] text-muted-foreground">сотруд.</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{s.registers}</p>
                  <p className="text-[11px] text-muted-foreground">касс</p>
                </div>
                <div>
                  <p className="mt-0.5 text-sm font-bold">{s.stockLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StoreCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </div>
  )
}
