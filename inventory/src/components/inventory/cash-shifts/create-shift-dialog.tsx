"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createShift } from "@/app/inventory/cash-shifts/actions"
import type { EmployeeOption, RegisterOption } from "@/app/inventory/cash-shifts/actions"

interface CreateShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registers: RegisterOption[]
  employees: EmployeeOption[]
  onCreated: () => void
}

export function CreateShiftDialog({
  open,
  onOpenChange,
  registers,
  employees,
  onCreated,
}: CreateShiftDialogProps) {
  const [registerId, setRegisterId] = useState<string | null>(registers[0]?.id ?? null)
  const [cashierId, setCashierId] = useState<string | null>(employees[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    if (!registerId) return setError("Выберите кассу")
    if (!cashierId) return setError("Выберите кассира")

    const fd = new FormData()
    fd.set("register_id", registerId)
    fd.set("cashier_id", cashierId)

    startTransition(async () => {
      const result = await createShift(fd)
      if (!result.success) {
        setError(result.error)
        return
      }
      onCreated()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setError(null); onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Открыть смену</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Касса</Label>
            <Select value={registerId ?? undefined} onValueChange={(v) => setRegisterId(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Касса">
                  {(value: string) => registers.find((r) => r.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {registers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Кассир</Label>
            <Select value={cashierId ?? undefined} onValueChange={(v) => setCashierId(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Кассир">
                  {(value: string) => employees.find((e) => e.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            Открыть смену
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
