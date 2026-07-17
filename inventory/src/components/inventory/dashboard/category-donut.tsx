import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { DashboardData } from "@/app/inventory/dashboard-actions"

export function CategoryDonut({ data, saleCount }: { data: DashboardData["categories"]; saleCount: number }) {
  let cursor = 0
  const stops = data.map((slice) => {
    const start = cursor
    cursor += slice.percent
    return `${slice.color} ${start}% ${cursor}%`
  }).join(", ")

  const totalSales = saleCount

  return (
    <Card>
      <CardHeader>
        <CardTitle>Продажи по категориям</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <div
          className="relative flex size-[124px] flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: stops ? `conic-gradient(${stops})` : "var(--muted)" }}
        >
          <div className="flex size-[74px] flex-col items-center justify-center rounded-full bg-card text-center">
            <span className="text-lg font-extrabold text-foreground">{totalSales}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">продаж</span>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-2">
          {data.length === 0 ? <li className="text-[13px] text-muted-foreground">За текущий месяц нет продаж</li> : data.map((slice) => (
            <li key={slice.name} className="flex items-center gap-2 text-[13px]">
              <span
                className="size-2.5 flex-shrink-0 rounded-[3px]"
                style={{ background: slice.color }}
              />
              <span className="flex-1 truncate text-foreground/70">{slice.name}</span>
              <span className="font-mono font-semibold text-foreground">{slice.percent}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
