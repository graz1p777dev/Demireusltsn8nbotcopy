"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLE_LABELS } from "./company-mock-data"
import type { RoleKey } from "./company-mock-data"

interface EmployeeCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (fields: { name: string; role: RoleKey; store: string }) => void
}

const ROLE_KEYS = Object.keys(ROLE_LABELS) as RoleKey[]

export function EmployeeCreateDialog({ open, onOpenChange, onCreate }: EmployeeCreateDialogProps) {
  const [name, setName] = useState("")
  const [role, setRole] = useState<RoleKey>("cashier")
  const [store, setStore] = useState("")
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName("")
    setRole("cashier")
    setStore("")
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim()) return setError("Укажите имя сотрудника")
    onCreate({ name: name.trim(), role, store: store.trim() || "Все точки" })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить сотрудника</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee-name">Имя</Label>
            <Input id="employee-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: RoleKey) => ROLE_LABELS[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_KEYS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee-store">Точка</Label>
              <Input id="employee-store" placeholder="Все точки" value={store} onChange={(e) => setStore(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>Добавить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
