"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { REVENUE_TREND_MOCK } from "@/app/inventory/_data/mock-dashboard"

export function RevenueChart() {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Тренд выручки</CardTitle>
        <span className="text-xs text-muted-foreground">по дням, текущий месяц</span>
      </CardHeader>
      <CardContent className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={REVENUE_TREND_MOCK} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              ticks={[1, 5, 10, 15, 20, 25, 30]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              fontFamily="var(--font-mono)"
              stroke="var(--muted-foreground)"
            />
            <YAxis hide domain={["dataMin - 5000", "dataMax + 5000"]} />
            <Tooltip
              formatter={(value: unknown) => [`${Number(value).toLocaleString("ru-RU")} ₽`, "Выручка"]}
              labelFormatter={(day) => `День ${day}`}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
