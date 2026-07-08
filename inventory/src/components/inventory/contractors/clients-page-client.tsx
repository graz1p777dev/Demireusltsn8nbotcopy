"use client"

import { useMemo, useState } from "react"
import { UserRound } from "lucide-react"
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
import { INITIAL_CLIENTS } from "./contractors-mock-data"
import type { ClientRow } from "./contractors-mock-data"

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

export function ClientsPageClient() {
  const [clients, setClients] = useState<ClientRow[]>(INITIAL_CLIENTS)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
  }, [clients, search])

  function handleCreate(fields: { name: string; contact: string; phone: string }) {
    setClients((prev) => [
      { id: crypto.randomUUID(), name: fields.name, phone: fields.phone || "—", sales: 0, total: 0, discount: 0, lastVisit: "—" },
      ...prev,
    ])
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ContractorsToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Поиск по имени или телефону"
        createLabel="Новый клиент"
        onCreate={() => setDialogOpen(true)}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Клиент</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead className="text-center">Продаж</TableHead>
              <TableHead className="text-right">Сумма покупок</TableHead>
              <TableHead className="text-center">Скидка</TableHead>
              <TableHead className="text-right">Визит</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Клиенты не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="flex size-8 items-center justify-center rounded-lg bg-[#f3f0f7] text-[#5b4b8a]">
                      <UserRound className="size-4" />
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">{c.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{c.phone}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{c.sales.toLocaleString("ru-RU")}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(c.total)}</TableCell>
                  <TableCell className="text-center font-semibold text-primary">{c.discount}%</TableCell>
                  <TableCell className="text-right text-muted-foreground">{c.lastVisit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ContractorCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} kind="client" onCreate={handleCreate} />
    </div>
  )
}
