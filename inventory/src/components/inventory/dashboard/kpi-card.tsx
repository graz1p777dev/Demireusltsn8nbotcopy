import { HelpCircle, Wallet, ShoppingBag, TrendingUp, Receipt, ArrowUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import type { KpiMock } from "@/app/inventory/_data/mock-dashboard"

const KPI_ICONS: Record<KpiMock["icon"], typeof Wallet> = {
  wallet: Wallet,
  "shopping-bag": ShoppingBag,
  "trending-up": TrendingUp,
  receipt: Receipt,
}

// Цветной квадрат под иконку — по одному акценту на метрику, чтобы карточки
// не сливались в одну сплошную заливку.
const KPI_TONE: Record<KpiMock["icon"], { fg: string; bg: string }> = {
  wallet: { fg: "#12a05f", bg: "#e3f9ee" },
  "shopping-bag": { fg: "#2563eb", bg: "#e5edff" },
  "trending-up": { fg: "#db2777", bg: "#fde8f3" },
  receipt: { fg: "#d97706", bg: "#fff2df" },
}

export function KpiCard({ label, value, hint, highlight, icon, delta }: KpiMock) {
  const Icon = KPI_ICONS[icon]
  const tone = KPI_TONE[icon]

  return (
    <Card className="gap-2 py-[15px]">
      <CardContent className="flex flex-col gap-2.5 px-4">
        <div className="flex items-center justify-between">
          <div
            className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[9px]"
            style={{ color: tone.fg, background: tone.bg }}
          >
            <Icon className="size-4" />
          </div>
          {delta && (
            <span
              className={
                delta.positive
                  ? "flex items-center gap-0.5 text-[11px] font-bold text-[#12a05f]"
                  : "flex items-center gap-0.5 text-[11px] font-bold text-destructive"
              }
            >
              <ArrowUp className={delta.positive ? "size-3" : "size-3 rotate-180"} />
              {delta.value}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/60">
          <span>{label}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex size-[15px] items-center justify-center rounded-full bg-muted text-foreground/45">
                  <HelpCircle className="size-3 cursor-help" />
                </span>
              }
            />
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        </div>

        <p
          className="text-[21px] font-extrabold tracking-tight"
          style={{ color: highlight ? "var(--primary)" : "var(--card-foreground)" }}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
