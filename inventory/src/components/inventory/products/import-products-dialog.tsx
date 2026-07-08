"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Download, FileSpreadsheet, TriangleAlert, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { parseCsv, buildCsv } from "@/lib/csv"
import { importProducts } from "@/app/inventory/products/actions"
import type { ImportProductRow, ImportRowError, CategoryRow } from "@/app/inventory/products/actions"

const UNIT_VALUES = ["шт", "мл", "г", "л", "уп"]

const TEMPLATE_HEADERS = [
  "Наименование",
  "Артикул",
  "Штрихкод",
  "Категория",
  "Ед.изм",
  "Цена закупки",
  "Цена продажи",
  "Скидка %",
  "Мин. остаток",
]

const TEMPLATE_EXAMPLE = [
  "Крем для лица Anua", "ANUA-001", "", "Уход за лицом", "шт", "450", "890", "0", "5",
]

interface ImportProductsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (newCategories: CategoryRow[]) => void
}

interface ParsedFile {
  fileName: string
  rows: ImportProductRow[]
  parseErrors: string[]
}

function downloadTemplate() {
  const csv = buildCsv([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE])
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "shablon_importa_tovarov.csv"
  a.click()
  URL.revokeObjectURL(url)
}

function normalizeUnit(raw: string): string {
  const v = raw.trim().toLowerCase()
  const found = UNIT_VALUES.find((u) => u === v)
  return found ?? "шт"
}

function toNumber(raw: string | undefined): number {
  if (!raw) return 0
  const n = Number(raw.replace(",", ".").replace(/\s/g, ""))
  return Number.isFinite(n) ? n : 0
}

function mapTableToRows(fileName: string, table: string[][]): ParsedFile {
  if (table.length === 0) return { fileName, rows: [], parseErrors: ["Файл пуст"] }

  const [header, ...dataRows] = table
  const normalizedHeader = header.map((h) => h.trim().toLowerCase())
  const col = (name: string) => normalizedHeader.findIndex((h) => h === name.toLowerCase())

  const idx = {
    name: col("Наименование"),
    sku: col("Артикул"),
    barcode: col("Штрихкод"),
    category: col("Категория"),
    unit: col("Ед.изм"),
    cost: col("Цена закупки"),
    retail: col("Цена продажи"),
    discount: col("Скидка %"),
    minStock: col("Мин. остаток"),
  }

  const parseErrors: string[] = []
  if (idx.name === -1 || idx.sku === -1) {
    parseErrors.push('В файле обязательны колонки "Наименование" и "Артикул"')
    return { fileName, rows: [], parseErrors }
  }

  const rows: ImportProductRow[] = []
  dataRows.forEach((cells, i) => {
    const name = cells[idx.name]?.trim()
    const sku = cells[idx.sku]?.trim()
    if (!name || !sku) {
      parseErrors.push(`Строка ${i + 2}: пустое наименование или артикул — пропущена`)
      return
    }
    const barcodeRaw = idx.barcode >= 0 ? cells[idx.barcode]?.trim() : ""
    const categoryRaw = idx.category >= 0 ? cells[idx.category]?.trim() : ""
    rows.push({
      name,
      sku,
      barcode: barcodeRaw ? barcodeRaw : null,
      category: categoryRaw ? categoryRaw : null,
      unit: normalizeUnit(idx.unit >= 0 ? (cells[idx.unit] ?? "") : "") as ImportProductRow["unit"],
      cost_price: toNumber(idx.cost >= 0 ? cells[idx.cost] : undefined),
      retail_price: toNumber(idx.retail >= 0 ? cells[idx.retail] : undefined),
      discount_percent: toNumber(idx.discount >= 0 ? cells[idx.discount] : undefined),
      min_stock_level: Math.max(0, Math.round(toNumber(idx.minStock >= 0 ? cells[idx.minStock] : undefined))),
    })
  })

  return { fileName, rows, parseErrors }
}

async function parseFile(file: File): Promise<ParsedFile> {
  const isExcel = /\.xlsx?$/i.test(file.name)
  if (isExcel) {
    const XLSX = await import("xlsx")
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const firstSheet = workbook.SheetNames[0]
    if (!firstSheet) return { fileName: file.name, rows: [], parseErrors: ["В файле нет листов"] }
    const table = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[firstSheet], {
      header: 1,
      raw: false,
      defval: "",
    })
    return mapTableToRows(file.name, table.map((r) => r.map((c) => String(c ?? ""))))
  }

  const text = await file.text()
  return mapTableToRows(file.name, parseCsv(text))
}

export function ImportProductsDialog({ open, onOpenChange, onImported }: ImportProductsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [serverErrors, setServerErrors] = useState<ImportRowError[]>([])

  function reset() {
    setParsed(null)
    setServerErrors([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setServerErrors([])
    setParsed(await parseFile(file))
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return
    setIsImporting(true)
    setServerErrors([])
    try {
      const result = await importProducts(parsed.rows)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setServerErrors(result.errors)
      if (result.created + result.updated > 0) {
        toast.success(`Импорт завершён: создано ${result.created}, обновлено ${result.updated}`)
        onImported(result.newCategories)
      }
      if (result.errors.length === 0) {
        reset()
        onOpenChange(false)
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт товаров</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
          >
            <Download className="size-3.5" />
            Скачать шаблон CSV
          </button>

          {!parsed ? (
            <label
              htmlFor="import-products-file"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center hover:bg-muted/50"
            >
              <FileSpreadsheet className="size-7 text-muted-foreground/60" />
              <span className="text-sm font-medium">Выберите CSV или Excel-файл</span>
              <span className="text-xs text-muted-foreground">
                Колонки: Наименование, Артикул, Штрихкод, Категория, Ед.изм, Цена закупки, Цена продажи, Скидка %, Мин. остаток
              </span>
              <input
                ref={fileInputRef}
                id="import-products-file"
                type="file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <FileSpreadsheet className="size-4 text-primary" />
                  {parsed.fileName}
                </div>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Убрать файл"
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <p className="text-[13px] text-foreground/70">
                Найдено строк для импорта: <b>{parsed.rows.length}</b>
              </p>

              {parsed.rows.slice(0, 5).length > 0 && (
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Наименование</th>
                        <th className="px-2 py-1.5 text-left font-medium">Артикул</th>
                        <th className="px-2 py-1.5 text-right font-medium">Цена</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 5).map((r) => (
                        <tr key={r.sku} className="border-t border-border">
                          <td className="truncate px-2 py-1.5">{r.name}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{r.sku}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{r.retail_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 5 && (
                    <div className="border-t border-border px-2 py-1.5 text-[11px] text-muted-foreground">
                      и ещё {parsed.rows.length - 5} строк…
                    </div>
                  )}
                </div>
              )}

              {parsed.parseErrors.length > 0 && (
                <div className="flex flex-col gap-1 rounded-md bg-[#fff2df] p-2.5 text-[12px] text-[#d97706]">
                  {parsed.parseErrors.map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <TriangleAlert className="mt-0.5 size-3 flex-shrink-0" />
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {serverErrors.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md bg-[#fdeaee] p-2.5 text-[12px] text-[#e0526b]">
              <span className="font-semibold">Не импортированы ({serverErrors.length}):</span>
              {serverErrors.slice(0, 8).map((e, i) => (
                <span key={i}>
                  Строка {e.row}: {e.message}
                </span>
              ))}
              {serverErrors.length > 8 && <span>и ещё {serverErrors.length - 8}…</span>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || parsed.rows.length === 0 || isImporting}
          >
            {isImporting ? "Импортируем…" : `Импортировать${parsed ? ` (${parsed.rows.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
