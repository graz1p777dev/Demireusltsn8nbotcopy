"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ShiftsToolbar, type ShiftsFilters } from "./shifts-toolbar"
import { ShiftsTable } from "./shifts-table"
import { CreateShiftDialog } from "./create-shift-dialog"
import { ShiftDetailDialog } from "./shift-detail-dialog"
import { useShiftColumnVisibility } from "./shift-columns"
import type { ShiftsPageData, ShiftRow } from "@/app/inventory/cash-shifts/actions"

const EMPTY_FILTERS: ShiftsFilters = {
  openedFrom: "",
  openedTo: "",
  cashierId: "all",
  warehouseId: "all",
  registerId: "all",
}

export function ShiftsPageClient({ initialData }: { initialData: ShiftsPageData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<ShiftsFilters>(EMPTY_FILTERS)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ShiftRow | null>(null)
  const { visibility, toggle: toggleColumn } = useShiftColumnVisibility()

  const filteredShifts = useMemo(() => {
    return initialData.shifts.filter((s) => {
      if (filters.openedFrom && new Date(s.opened_at) < new Date(filters.openedFrom)) return false
      if (filters.openedTo) {
        const to = new Date(filters.openedTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(s.opened_at) > to) return false
      }
      if (filters.cashierId !== "all" && s.cashier_id !== filters.cashierId) return false
      if (filters.registerId !== "all" && s.register_id !== filters.registerId) return false
      if (filters.warehouseId !== "all") {
        const register = initialData.registers.find((r) => r.id === s.register_id)
        if (register?.warehouse_id !== filters.warehouseId) return false
      }
      return true
    })
  }, [initialData.shifts, initialData.registers, filters])

  function refresh() {
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ShiftsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        employees={initialData.employees}
        warehouses={initialData.warehouses}
        registers={initialData.registers}
        columnVisibility={visibility}
        onToggleColumn={toggleColumn}
        onCreateShift={() => setCreateOpen(true)}
      />

      <ShiftsTable shifts={filteredShifts} visibility={visibility} onRowClick={setSelectedShift} />

      <CreateShiftDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        registers={initialData.registers}
        employees={initialData.employees}
        onCreated={refresh}
      />

      <ShiftDetailDialog
        open={!!selectedShift}
        onOpenChange={(open) => {
          if (!open) setSelectedShift(null)
        }}
        shift={selectedShift}
        onClosed={refresh}
      />
    </div>
  )
}
