"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CreditCard, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AccountCreateDialog } from "./account-create-dialog"
import { createCompanyAccount, type CompanyAccount } from "@/app/inventory/company/actions"

const NEW_ACCOUNT_COLOR = "#0c4d6c"

function formatMoney(value: number): string { return `${value.toLocaleString("ru-RU")} сом` }
const TYPE_LABELS: Record<CompanyAccount["account_type"], string> = { cash: "Наличные", bank: "Банк", electronic: "Электронный" }
const TYPE_VALUES: Record<string, CompanyAccount["account_type"]> = { "Наличные": "cash", "Банк": "bank", "Электронный": "electronic" }

export function AccountsPageClient({ initialAccounts }: { initialAccounts: CompanyAccount[] }) {
  const [accounts, setAccounts] = useState<CompanyAccount[]>(initialAccounts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [, startTransition] = useTransition()

  function handleCreate(fields: { name: string; type: string; balance: number }) {
    startTransition(async () => {
      const result = await createCompanyAccount({ name: fields.name, account_type: TYPE_VALUES[fields.type] ?? "cash", balance: fields.balance, color: NEW_ACCOUNT_COLOR })
      if (!result.success) { toast.error(result.error); return }
      setAccounts((prev) => [...prev, result.account])
      setDialogOpen(false)
      toast.success("Счёт добавлен")
    })
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Добавить счёт
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-col gap-0">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex size-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-muted"
                  style={{ color: a.color }}
                >
                  <CreditCard className="size-[19px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold">{a.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">{TYPE_LABELS[a.account_type]}</p>
                </div>
              </div>
              <div className="mt-3.5 border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground">Баланс</p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-bold" style={{ color: a.color }}>
                    {formatMoney(a.balance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AccountCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </div>
  )
}
