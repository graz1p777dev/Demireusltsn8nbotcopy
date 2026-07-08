import { AlertTriangle, PackageX, CircleSlash } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { STOCK_ESTIMATE_MOCK } from "@/app/inventory/_data/mock-dashboard"
import type { StockWarning } from "@/app/inventory/_data/mock-dashboard"

const WARNING_ICONS: Record<StockWarning["icon"], typeof AlertTriangle> = {
  "alert-triangle": AlertTriangle,
  "package-x": PackageX,
  "circle-slash": CircleSlash,
}

// Оранжевый — для реально проблемных предупреждений; серый — для нейтральных.
const WARNING_TONE: Record<StockWarning["icon"], string> = {
  "alert-triangle": "text-[#c05a2e]",
  "package-x": "text-[#c05a2e]",
  "circle-slash": "text-[#a2b4c0]",
}

export function StockEstimate() {
  const { warnings, totalQuantity, retailValue, costValue } = STOCK_ESTIMATE_MOCK

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle>Оценка склада</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 px-0">
        <ul className="flex flex-col gap-2 border-b border-border px-4 py-3">
          {warnings.map((w) => {
            const Icon = WARNING_ICONS[w.icon]
            return (
              <li key={w.label}>
                <a
                  href="#"
                  className="flex items-center gap-2.5 text-[13px] font-medium text-primary hover:underline"
                >
                  <Icon className={`size-[15px] flex-shrink-0 ${WARNING_TONE[w.icon]}`} />
                  {w.label}
                </a>
              </li>
            )
          })}
        </ul>

        <div className="flex flex-col px-4 py-1">
          <div className="flex items-center justify-between border-b border-border py-2.5 text-[13px]">
            <span className="text-foreground/60">Количество товара</span>
            <span className="font-mono font-semibold">{totalQuantity.toLocaleString("ru-RU")} ед.</span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-2.5 text-[13px]">
            <span className="text-foreground/60">В розничных ценах</span>
            <span className="font-mono font-semibold">{retailValue}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 text-[13px]">
            <span className="text-foreground/60">По себестоимости</span>
            <span className="font-mono font-semibold">{costValue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
