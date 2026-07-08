"use client"

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SHIFT_COLUMN_DEFS } from "./shift-columns"
import type { ShiftRow } from "@/app/inventory/cash-shifts/actions"

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface ShiftsTableProps {
  shifts: ShiftRow[]
  visibility: Record<string, boolean>
  onRowClick: (shift: ShiftRow) => void
}

export function ShiftsTable({ shifts, visibility, onRowClick }: ShiftsTableProps) {
  const visibleDefs = SHIFT_COLUMN_DEFS.filter((d) => visibility[d.key] ?? d.defaultVisible)
  const columnCount = 2 + visibleDefs.length

  function renderCell(key: string, shift: ShiftRow) {
    switch (key) {
      case "opened_at":
        return formatDateTime(shift.opened_at)
      case "closed_at":
        return formatDateTime(shift.closed_at)
      case "cashier":
        return shift.cashier_name ?? "—"
      case "register":
        return shift.register_name ?? "—"
      case "warehouse":
        return shift.warehouse_name ?? "—"
      case "revenue":
        return formatMoney(shift.revenue)
      case "sales_count":
        return shift.sales_count
      case "sales_amount":
        return formatMoney(shift.sales_amount)
      case "cash_on_hand":
        return formatMoney(shift.cash_on_hand)
      default:
        return null
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Статус</TableHead>
            <TableHead>Номер</TableHead>
            {visibleDefs.map((d) => (
              <TableHead key={d.key}>{d.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-10 text-center text-sm text-muted-foreground">
                Смен пока нет
              </TableCell>
            </TableRow>
          ) : (
            shifts.map((shift) => (
              <TableRow key={shift.id} onClick={() => onRowClick(shift)} className="cursor-pointer">
                <TableCell>
                  <Badge
                    className={cn(
                      "gap-1.5 border-transparent whitespace-nowrap",
                      shift.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        shift.status === "open" ? "bg-primary" : "bg-[#a2b4c0]"
                      )}
                    />
                    {shift.status === "open" ? "открыта" : "закрыта"}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-primary">Смена #{shift.shift_number}</TableCell>
                {visibleDefs.map((d) => (
                  <TableCell key={d.key} className={d.key === "cashier" || d.key === "register" || d.key === "warehouse" ? "text-muted-foreground" : undefined}>
                    {renderCell(d.key, shift)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
