"use client"

import { useState, useTransition } from "react"
import { Lock, LockOpen } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { closeShift } from "@/app/inventory/cash-shifts/actions"
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

interface ShiftDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: ShiftRow | null
  onClosed: () => void
}

export function ShiftDetailDialog({ open, onOpenChange, shift, onClosed }: ShiftDetailDialogProps) {
  const [cashOnHand, setCashOnHand] = useState(String(shift?.cash_on_hand ?? 0))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!shift) return null
  const isOpen = shift.status === "open"

  function handleClose() {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set("cash_on_hand", cashOnHand || "0")
      const result = await closeShift(shift!.id, fd)
      if (!result.success) {
        setError(result.error)
        return
      }
      onClosed()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Смена #{shift.shift_number}</DialogTitle>
            <Badge variant={isOpen ? "default" : "secondary"} className="gap-1">
              {isOpen ? <LockOpen className="size-3" /> : <Lock className="size-3" />}
              {isOpen ? "Открыта" : "Закрыта"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Касса</span>
            <span>{shift.register_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Магазин</span>
            <span>{shift.warehouse_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Кассир</span>
            <span>{shift.cashier_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Открыта</span>
            <span>{formatDateTime(shift.opened_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Закрыта</span>
            <span>{formatDateTime(shift.closed_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Выручка</span>
            <span>{formatMoney(shift.revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Продажи</span>
            <span>{shift.sales_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Сумма продаж</span>
            <span>{formatMoney(shift.sales_amount)}</span>
          </div>

          {isOpen ? (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-3">
              <Label htmlFor="cash-on-hand">Наличные при закрытии</Label>
              <Input
                id="cash-on-hand"
                type="number"
                min={0}
                step="0.01"
                className="text-right font-mono"
                value={cashOnHand}
                onChange={(e) => setCashOnHand(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Наличные</span>
              <span>{formatMoney(shift.cash_on_hand)}</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть окно
          </Button>
          {isOpen && (
            <Button onClick={handleClose} disabled={isPending}>
              Закрыть смену
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
