"use client"

import { ChevronDown } from "lucide-react"
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DOCUMENTS_MOCK } from "@/app/inventory/_data/mock-dashboard"

function formatMoney(value: number): string {
  if (value === 0) return "—"
  return `${value.toLocaleString("ru-RU")} ₽`
}

export function DocumentsTable() {
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle>Документы</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" className="gap-1.5">
            за неделю
            <ChevronDown className="size-3.5" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f4f7f8] hover:bg-[#f4f7f8]">
              <TableHead className="pl-4 text-[11px] font-semibold tracking-wide text-foreground/50 uppercase">
                Наименование
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold tracking-wide text-foreground/50 uppercase">
                Кол-во
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold tracking-wide text-foreground/50 uppercase">
                Сумма
              </TableHead>
              <TableHead className="pr-4 text-right text-[11px] font-semibold tracking-wide text-foreground/50 uppercase">
                Склад
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DOCUMENTS_MOCK.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="pl-4 font-semibold">{row.name}</TableCell>
                <TableCell className="text-right font-mono">{row.quantity}</TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatMoney(row.amount)}
                </TableCell>
                <TableCell className="pr-4 text-right text-foreground/55">{row.warehouse}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
