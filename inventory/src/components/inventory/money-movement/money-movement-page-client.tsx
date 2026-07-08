"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { MoneyOperationDialog } from "./money-operation-dialog"
import { INITIAL_MONEY_OPERATIONS, MONEY_ACCOUNTS, MONEY_CATEGORIES_EXPENSE, MONEY_CATEGORIES_INCOME } from "./money-mock-data"
import type { MoneyOperation } from "./money-mock-data"

const INITIAL_ACCOUNTS_BALANCE = 325820

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

export function MoneyMovementPageClient() {
  const [operations, setOperations] = useState<MoneyOperation[]>(INITIAL_MONEY_OPERATIONS)
  const [accountFilter, setAccountFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState<"income" | "expense" | null>(null)

  const allCategories = useMemo(
    () => [...MONEY_CATEGORIES_INCOME, ...MONEY_CATEGORIES_EXPENSE],
    []
  )

  const filteredOperations = useMemo(() => {
    return operations.filter((o) => {
      if (accountFilter !== "all" && o.account !== accountFilter) return false
      if (categoryFilter !== "all" && o.category !== categoryFilter) return false
      return true
    })
  }, [operations, accountFilter, categoryFilter])

  const totalIncome = useMemo(
    () => operations.filter((o) => o.isIncome).reduce((sum, o) => sum + o.amount, 0),
    [operations]
  )
  const totalExpense = useMemo(
    () => operations.filter((o) => !o.isIncome).reduce((sum, o) => sum + o.amount, 0),
    [operations]
  )
  const accountsBalance = useMemo(() => {
    const initialIncome = INITIAL_MONEY_OPERATIONS.filter((o) => o.isIncome).reduce((s, o) => s + o.amount, 0)
    const initialExpense = INITIAL_MONEY_OPERATIONS.filter((o) => !o.isIncome).reduce((s, o) => s + o.amount, 0)
    return INITIAL_ACCOUNTS_BALANCE - (initialIncome - initialExpense) + (totalIncome - totalExpense)
  }, [totalIncome, totalExpense])

  function handleCreate(operation: MoneyOperation) {
    setOperations((prev) => [operation, ...prev])
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Приход за месяц</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-[#1f8a5b]">{totalIncome.toLocaleString("ru-RU")}</span>
            <span className="text-xs text-muted-foreground">₽</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Расход за месяц</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-destructive">{totalExpense.toLocaleString("ru-RU")}</span>
            <span className="text-xs text-muted-foreground">₽</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Баланс на счетах</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight">{accountsBalance.toLocaleString("ru-RU")}</span>
            <span className="text-xs text-muted-foreground">₽</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-[13px] font-medium text-foreground/70">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          Июль 2026
        </div>

        <Select value={accountFilter} onValueChange={(v) => setAccountFilter(String(v))}>
          <SelectTrigger className="w-44">
            <SelectValue>{(value: string) => (value === "all" ? "Все счета" : value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все счета</SelectItem>
            {MONEY_ACCOUNTS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(String(v))}>
          <SelectTrigger className="w-48">
            <SelectValue>{(value: string) => (value === "all" ? "Все категории" : value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {allCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          className="gap-1.5 border-[#1f8a5b] text-[#1f8a5b] hover:bg-[#1f8a5b]/10"
          onClick={() => setDialogOpen("income")}
        >
          <Plus className="size-4" />
          Приход
        </Button>
        <Button
          variant="outline"
          className="gap-1.5 border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => setDialogOpen("expense")}
        >
          <Minus className="size-4" />
          Расход
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead>Дата</TableHead>
              <TableHead>Операция</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Счёт</TableHead>
              <TableHead>Контрагент</TableHead>
              <TableHead className="text-right">Приход</TableHead>
              <TableHead className="text-right">Расход</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOperations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Операций не найдено
                </TableCell>
              </TableRow>
            ) : (
              filteredOperations.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <span
                      className="block size-1.5 rounded-full"
                      style={{ background: o.isIncome ? "#1f8a5b" : "#c0392b" }}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.date}</TableCell>
                  <TableCell className="font-semibold">{o.operation}</TableCell>
                  <TableCell className="text-muted-foreground">{o.category}</TableCell>
                  <TableCell className="text-muted-foreground">{o.account}</TableCell>
                  <TableCell className="text-muted-foreground">{o.counterparty}</TableCell>
                  <TableCell className="text-right font-semibold text-[#1f8a5b]">
                    {o.isIncome ? formatMoney(o.amount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {o.isIncome ? "—" : formatMoney(o.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MoneyOperationDialog
        open={dialogOpen === "income"}
        onOpenChange={(open) => setDialogOpen(open ? "income" : null)}
        isIncome
        onCreate={handleCreate}
      />
      <MoneyOperationDialog
        open={dialogOpen === "expense"}
        onOpenChange={(open) => setDialogOpen(open ? "expense" : null)}
        isIncome={false}
        onCreate={handleCreate}
      />
    </div>
  )
}
