"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WarehouseCreateDialog } from "./warehouse-create-dialog"
import { createRegister, updateRegister } from "@/app/inventory/cash-shifts/actions"
import type { EmployeeOption, RegisterRow, WarehouseOption } from "@/app/inventory/cash-shifts/actions"

interface RegisterFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  register: RegisterRow | null
  warehouses: WarehouseOption[]
  employees: EmployeeOption[]
  onSaved: () => void
}

export function RegisterFormSheet({
  open,
  onOpenChange,
  register,
  warehouses: initialWarehouses,
  employees,
  onSaved,
}: RegisterFormSheetProps) {
  const isEdit = !!register

  const [name, setName] = useState(register?.name ?? "")
  const [warehouseId, setWarehouseId] = useState<string | null>(
    register?.warehouse_id ?? initialWarehouses[0]?.id ?? null
  )
  const [warehouses, setWarehouses] = useState(initialWarehouses)
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false)
  const [cashierIds, setCashierIds] = useState<Set<string>>(
    new Set(register?.cashiers.map((c) => c.id) ?? [])
  )
  const [terminals, setTerminals] = useState<string[]>(register?.terminals ?? [])
  const [terminalDraft, setTerminalDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const title = useMemo(() => (isEdit ? "Редактировать кассу" : "Новая касса"), [isEdit])

  function toggleCashier(id: string) {
    setCashierIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addTerminal() {
    const value = terminalDraft.trim()
    if (!value || terminals.includes(value)) return
    setTerminals((prev) => [...prev, value])
    setTerminalDraft("")
  }

  function removeTerminal(value: string) {
    setTerminals((prev) => prev.filter((t) => t !== value))
  }

  function handleSubmit() {
    setError(null)
    if (!name.trim()) return setError("Название обязательно")
    if (!warehouseId) return setError("Выберите магазин")

    const fd = new FormData()
    fd.set("name", name.trim())
    fd.set("warehouse_id", warehouseId)
    fd.set("cashier_ids", JSON.stringify(Array.from(cashierIds)))
    fd.set("terminals", JSON.stringify(terminals))

    startTransition(async () => {
      const result = isEdit ? await updateRegister(register!.id, fd) : await createRegister(fd)
      if (!result.success) {
        setError(result.error)
        return
      }
      onSaved()
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-name">
              Наименование <span className="text-destructive">*</span>
            </Label>
            <Input id="register-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Магазин *</Label>
            <Select
              value={warehouseId ?? undefined}
              onValueChange={(value) => {
                const v = String(value)
                if (v === "__create__") {
                  setWarehouseDialogOpen(true)
                  return
                }
                setWarehouseId(v)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Магазин">
                  {(value: string) => warehouses.find((w) => w.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__create__">+ Создать магазин</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Кассиры</Label>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет доступных сотрудников</p>
            ) : (
              <div className="flex flex-col gap-0.5 rounded-lg border border-border p-1.5">
                {employees.map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-muted/50">
                    <Checkbox checked={cashierIds.has(e.id)} onCheckedChange={() => toggleCashier(e.id)} />
                    <Label className="flex-1 cursor-pointer text-[13px] font-normal" onClick={() => toggleCashier(e.id)}>
                      {e.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-terminal">Терминалы</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="register-terminal"
                placeholder="Например, Наличные, Visa/MC"
                value={terminalDraft}
                onChange={(e) => setTerminalDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTerminal()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTerminal}>
                Добавить
              </Button>
            </div>
            {terminals.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {terminals.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 pr-1">
                    {t}
                    <button
                      type="button"
                      aria-label={`Удалить ${t}`}
                      onClick={() => removeTerminal(t)}
                      className="flex size-3.5 items-center justify-center rounded-full hover:bg-foreground/10"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 border-t border-border bg-muted/30 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            <Check className="size-4" />
            {isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </SheetContent>

      <WarehouseCreateDialog
        open={warehouseDialogOpen}
        onOpenChange={setWarehouseDialogOpen}
        onCreated={(warehouse) => {
          setWarehouses((prev) => [...prev, warehouse].sort((a, b) => a.name.localeCompare(b.name)))
          setWarehouseId(warehouse.id)
          setWarehouseDialogOpen(false)
        }}
      />
    </Sheet>
  )
}
