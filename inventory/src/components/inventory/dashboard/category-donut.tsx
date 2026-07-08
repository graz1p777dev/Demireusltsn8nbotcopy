import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CATEGORY_SALES_MOCK } from "@/app/inventory/_data/mock-dashboard"

export function CategoryDonut() {
  let cursor = 0
  const stops = CATEGORY_SALES_MOCK.map((slice) => {
    const start = cursor
    cursor += slice.percent
    return `${slice.color} ${start}% ${cursor}%`
  }).join(", ")

  const totalSales = 185

  return (
    <Card>
      <CardHeader>
        <CardTitle>Продажи по категориям</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <div
          className="relative flex size-[124px] flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="flex size-[74px] flex-col items-center justify-center rounded-full bg-card text-center">
            <span className="text-lg font-extrabold text-foreground">{totalSales}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">продаж</span>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-2">
          {CATEGORY_SALES_MOCK.map((slice) => (
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
