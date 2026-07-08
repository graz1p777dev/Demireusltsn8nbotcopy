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
import {
  MONEY_ACCOUNTS,
  MONEY_CATEGORIES_EXPENSE,
  MONEY_CATEGORIES_INCOME,
  type MoneyOperation,
} from "./money-mock-data"

interface MoneyOperationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isIncome: boolean
  onCreate: (operation: MoneyOperation) => void
}

export function MoneyOperationDialog({ open, onOpenChange, isIncome, onCreate }: MoneyOperationDialogProps) {
  const categories = isIncome ? MONEY_CATEGORIES_INCOME : MONEY_CATEGORIES_EXPENSE

  const [operation, setOperation] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<string>(categories[0])
  const [account, setAccount] = useState<string>(MONEY_ACCOUNTS[0])
  const [counterparty, setCounterparty] = useState("")
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setOperation("")
    setAmount("")
    setCategory(categories[0])
    setAccount(MONEY_ACCOUNTS[0])
    setCounterparty("")
    setError(null)
  }

  function handleSubmit() {
    if (!operation.trim()) return setError("Укажите операцию")
    if (!(Number(amount) > 0)) return setError("Укажите сумму больше нуля")

    onCreate({
      id: crypto.randomUUID(),
      date: new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      operation: operation.trim(),
      category,
      account,
      counterparty: counterparty.trim() || "—",
      isIncome,
      amount: Number(amount),
    })
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
          <DialogTitle>{isIncome ? "Новый приход" : "Новый расход"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="money-op-name">Операция</Label>
            <Input
              id="money-op-name"
              placeholder={isIncome ? "Например, Выручка кассы №150" : "Например, Закуп у поставщика"}
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-op-amount">Сумма</Label>
              <Input
                id="money-op-amount"
                type="number"
                min={0}
                step="0.01"
                className="text-right font-mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Категория</Label>
              <Select value={category} onValueChange={(v) => setCategory(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Счёт</Label>
              <Select value={account} onValueChange={(v) => setAccount(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONEY_ACCOUNTS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-op-party">Контрагент</Label>
              <Input
                id="money-op-party"
                placeholder="Необязательно"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
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
