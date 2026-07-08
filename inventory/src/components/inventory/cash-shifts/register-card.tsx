"use client"

import { Landmark } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { RegisterRow } from "@/app/inventory/cash-shifts/actions"

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function RegisterCard({ register, onClick }: { register: RegisterRow; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="cursor-pointer transition-colors hover:border-ring">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <Landmark className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-bold">{register.name}</p>
              <p className="text-xs text-muted-foreground">{register.warehouse_name ?? "Без магазина"}</p>
            </div>
          </div>
          <Badge
            className={cn(
              "flex-shrink-0 whitespace-nowrap",
              register.has_open_shift
                ? "border-transparent bg-primary/10 text-primary"
                : "border-transparent bg-muted text-muted-foreground"
            )}
          >
            {register.has_open_shift ? "смена открыта" : "закрыта"}
          </Badge>
        </div>

        <div className="flex items-baseline gap-1.5 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Баланс</span>
          <span className="font-mono text-base font-semibold">{formatMoney(register.balance)}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Кассиры</span>
          {register.cashiers.length === 0 ? (
            <span className="text-xs text-muted-foreground">Не назначены</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {register.cashiers.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2.5 pl-0.5">
                  <Avatar size="sm">
                    <AvatarFallback>{initials(c.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Терминалы</span>
          {register.terminals.length === 0 ? (
            <span className="text-xs text-muted-foreground">Не заданы</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {register.terminals.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Создан {formatDate(register.created_at)}</p>
      </CardContent>
    </Card>
  )
}
