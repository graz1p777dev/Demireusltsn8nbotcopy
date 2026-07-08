"use client"

import { useMemo, useState } from "react"
import { Truck } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { ContractorsToolbar } from "./contractors-toolbar"
import { ContractorCreateDialog } from "./contractor-create-dialog"
import { INITIAL_SUPPLIERS } from "./contractors-mock-data"
import type { SupplierRow } from "./contractors-mock-data"

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

export function SuppliersPageClient() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>(INITIAL_SUPPLIERS)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q)
    )
  }, [suppliers, search])

  function handleCreate(fields: { name: string; contact: string; phone: string }) {
    setSuppliers((prev) => [
      { id: crypto.randomUUID(), name: fields.name, contact: fields.contact || "—", phone: fields.phone || "—", debt: 0, lastPurchase: "—" },
      ...prev,
    ])
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ContractorsToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Поиск по названию или контакту"
        createLabel="Новый поставщик"
        onCreate={() => setDialogOpen(true)}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Поставщик</TableHead>
              <TableHead>Контакт</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead className="text-right">Задолженность</TableHead>
              <TableHead className="text-right">Закупка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Поставщики не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Truck className="size-4" />
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{s.name}</TableCell>
                  <TableCell className="text-foreground/70">{s.contact}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{s.phone}</TableCell>
                  <TableCell className={s.debt > 0 ? "text-right font-semibold text-destructive" : "text-right text-muted-foreground"}>
                    {s.debt > 0 ? formatMoney(s.debt) : "0"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{s.lastPurchase}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ContractorCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} kind="supplier" onCreate={handleCreate} />
    </div>
  )
}
