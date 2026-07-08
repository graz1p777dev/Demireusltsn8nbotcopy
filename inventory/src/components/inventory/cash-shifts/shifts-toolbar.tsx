"use client"

import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ColumnSettingsPopover } from "@/components/inventory/column-settings-popover"
import { SHIFT_COLUMN_DEFS } from "./shift-columns"
import type { EmployeeOption, RegisterOption, WarehouseOption } from "@/app/inventory/cash-shifts/actions"

export interface ShiftsFilters {
  openedFrom: string
  openedTo: string
  cashierId: string
  warehouseId: string
  registerId: string
}

interface ShiftsToolbarProps {
  filters: ShiftsFilters
  onFiltersChange: (filters: ShiftsFilters) => void
  employees: EmployeeOption[]
  warehouses: WarehouseOption[]
  registers: RegisterOption[]
  columnVisibility: Record<string, boolean>
  onToggleColumn: (key: string) => void
  onCreateShift: () => void
}

export function ShiftsToolbar({
  filters,
  onFiltersChange,
  employees,
  warehouses,
  registers,
  columnVisibility,
  onToggleColumn,
  onCreateShift,
}: ShiftsToolbarProps) {
  function set<K extends keyof ShiftsFilters>(key: K, value: ShiftsFilters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Открыта с</Label>
        <Input
          type="date"
          className="w-40"
          value={filters.openedFrom}
          onChange={(e) => set("openedFrom", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">по</Label>
        <Input
          type="date"
          className="w-40"
          value={filters.openedTo}
          onChange={(e) => set("openedTo", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Кассир</Label>
        <Select value={filters.cashierId} onValueChange={(v) => set("cashierId", String(v))}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) => (value === "all" ? "Все кассиры" : (employees.find((e) => e.id === value)?.name ?? value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кассиры</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Магазин</Label>
        <Select value={filters.warehouseId} onValueChange={(v) => set("warehouseId", String(v))}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) => (value === "all" ? "Все магазины" : (warehouses.find((w) => w.id === value)?.name ?? value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все магазины</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Касса</Label>
        <Select value={filters.registerId} onValueChange={(v) => set("registerId", String(v))}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) => (value === "all" ? "Все кассы" : (registers.find((r) => r.id === value)?.name ?? value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кассы</SelectItem>
            {registers.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      <Button size="sm" className="gap-1.5" onClick={onCreateShift}>
        <Plus className="size-4" />
        Открыть смену
      </Button>

      <ColumnSettingsPopover columnDefs={SHIFT_COLUMN_DEFS} visibility={columnVisibility} onToggle={onToggleColumn} />
    </div>
  )
}
