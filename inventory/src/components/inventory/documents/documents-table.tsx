"use client"

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DOCUMENT_TYPE_LABELS } from "@/config/document-types"
import type { DocumentListRow } from "@/app/inventory/stock-movement/actions"

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface DocumentsTableProps {
  documents: DocumentListRow[]
  onRowClick: (doc: DocumentListRow) => void
}

export function DocumentsTable({ documents, onRowClick }: DocumentsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Номер</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Склад</TableHead>
            <TableHead>Поставщик</TableHead>
            <TableHead className="text-right">Сумма</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                Документов пока нет
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow key={doc.id} onClick={() => onRowClick(doc)} className="cursor-pointer">
                <TableCell className="font-medium">{doc.doc_number}</TableCell>
                <TableCell>{DOCUMENT_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(doc.created_at)}</TableCell>
                <TableCell>
                  {doc.doc_type === "transfer" && doc.target_warehouse_name
                    ? `${doc.warehouse_name ?? "—"} → ${doc.target_warehouse_name}`
                    : (doc.warehouse_name ?? "—")}
                </TableCell>
                <TableCell className="text-muted-foreground">{doc.supplier_name ?? "—"}</TableCell>
                <TableCell className="text-right">{formatMoney(doc.total_amount)}</TableCell>
                <TableCell>
                  <Badge variant={doc.status === "posted" ? "default" : "secondary"}>
                    {doc.status === "posted" ? "Проведён" : "Черновик"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
