"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RegisterCard } from "./register-card"
import { RegisterFormSheet } from "./register-form-sheet"
import type { RegistersPageData, RegisterRow } from "@/app/inventory/cash-shifts/actions"

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

export function RegistersPageClient({ initialData }: { initialData: RegistersPageData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [selectedRegister, setSelectedRegister] = useState<RegisterRow | null>(null)

  const totalBalance = useMemo(
    () => initialData.registers.reduce((sum, r) => sum + r.balance, 0),
    [initialData.registers]
  )

  function refresh() {
    startTransition(() => router.refresh())
  }

  function openCreateForm() {
    setSelectedRegister(null)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <Button className="gap-1.5" onClick={openCreateForm}>
          <Plus className="size-4" />
          Создать
        </Button>
        <p className="text-sm text-muted-foreground">
          Всего денег в кассах: <span className="font-mono font-semibold text-foreground">{formatMoney(totalBalance)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {initialData.registers.map((register) => (
          <RegisterCard
            key={register.id}
            register={register}
            onClick={() => {
              setSelectedRegister(register)
              setFormOpen(true)
            }}
          />
        ))}

        <Card
          onClick={openCreateForm}
          className="cursor-pointer items-center justify-center border-dashed transition-colors hover:border-ring"
        >
          <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Plus className="size-6" />
            <Button size="sm" onClick={(e) => { e.stopPropagation(); openCreateForm() }}>
              Создать
            </Button>
          </CardContent>
        </Card>
      </div>

      <RegisterFormSheet
        key={selectedRegister?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        register={selectedRegister}
        warehouses={initialData.warehouses}
        employees={initialData.employees}
        onSaved={refresh}
      />
    </div>
  )
}
