"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { BarChart3, ChevronRight, Package, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { REPORTS, REPORT_TYPES } from "./reports-mock-data"
import type { ReportTypeDef } from "./reports-mock-data"

const TYPE_STYLES: Record<ReportTypeDef["key"], { bg: string; color: string; icon: typeof BarChart3 }> = {
  sales: { bg: "bg-primary/10", color: "text-primary", icon: BarChart3 },
  stock: { bg: "bg-[#f3f0f7]", color: "text-[#5b4b8a]", icon: Package },
  finance: { bg: "bg-[#edf6f1]", color: "text-[#1f8a5b]", icon: TrendingUp },
}

const GROUP_BY_TYPE: Record<ReportTypeDef["key"], string> = {
  sales: "Продажи",
  stock: "Склад",
  finance: "Финансы",
}

export function ReportsPageClient() {
  const [activeType, setActiveType] = useState<ReportTypeDef["key"] | null>(null)

  const visibleReports = useMemo(() => {
    if (!activeType) return REPORTS
    return REPORTS.filter((r) => r.group === GROUP_BY_TYPE[activeType])
  }, [activeType])

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Выберите тип отчёта</p>

      <div className="grid grid-cols-3 gap-3.5">
        {REPORT_TYPES.map((t) => {
          const style = TYPE_STYLES[t.key]
          const Icon = style.icon
          const selected = activeType === t.key
          return (
            <Card
              key={t.key}
              onClick={() => setActiveType(selected ? null : t.key)}
              className={cn(
                "cursor-pointer transition-colors hover:border-ring",
                selected && "border-ring ring-1 ring-ring"
              )}
            >
              <CardContent className="flex flex-row items-center gap-4">
                <span className={cn("flex size-[52px] flex-shrink-0 items-center justify-center rounded-2xl", style.bg, style.color)}>
                  <Icon className="size-6" />
                </span>
                <div>
                  <p className="text-base font-bold">{t.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="mt-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {activeType ? `Отчёты · ${GROUP_BY_TYPE[activeType]}` : "Все отчёты"}
      </p>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((r) => (
          <Card
            key={r.name}
            onClick={() => toast(`«${r.name}» откроется отдельным экраном после подключения аналитики`)}
            className="cursor-pointer transition-colors hover:border-ring"
          >
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-primary uppercase">
                  {r.group}
                </span>
                <ChevronRight className="size-4 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-bold">{r.name}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
