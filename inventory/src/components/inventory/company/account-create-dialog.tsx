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

const ACCOUNT_TYPES = ["Наличные", "Банк", "Электронный"] as const

interface AccountCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (fields: { name: string; type: string; balance: number }) => void
}

export function AccountCreateDialog({ open, onOpenChange, onCreate }: AccountCreateDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<string>(ACCOUNT_TYPES[0])
  const [balance, setBalance] = useState("0")
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName("")
    setType(ACCOUNT_TYPES[0])
    setBalance("0")
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim()) return setError("Укажите название счёта")
    onCreate({ name: name.trim(), type, balance: Number(balance) || 0 })
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
          <DialogTitle>Добавить счёт</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-name">Название</Label>
            <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Тип</Label>
              <Select value={type} onValueChange={(v) => setType(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-balance">Начальный баланс</Label>
              <Input
                id="account-balance"
                type="number"
                min={0}
                step="0.01"
                className="text-right font-mono"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
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
