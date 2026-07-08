"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DocumentsTable } from "./documents-table"
import { CreateDocumentMenu } from "./create-document-menu"
import { DocumentSheet } from "./document-sheet"
import { DOCUMENT_TYPE_OPTIONS, DOCUMENT_TYPE_LABELS } from "@/config/document-types"
import type { InventoryDocType } from "@/config/document-types"
import { getDocumentWithItems } from "@/app/inventory/stock-movement/actions"
import type {
  DocumentFormData,
  DocumentListRow,
  DocumentWithItems,
} from "@/app/inventory/stock-movement/actions"

interface DocumentsPageClientProps {
  documents: DocumentListRow[]
  formData: DocumentFormData
}

export function DocumentsPageClient({ documents, formData }: DocumentsPageClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithItems | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoadingDoc, startLoadingDoc] = useTransition()

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (typeFilter !== "all" && d.doc_type !== typeFilter) return false
      if (statusFilter !== "all" && d.status !== statusFilter) return false
      return true
    })
  }, [documents, typeFilter, statusFilter])

  function refresh() {
    startTransition(() => router.refresh())
  }

  function handleRowClick(row: DocumentListRow) {
    startLoadingDoc(async () => {
      const doc = await getDocumentWithItems(row.id)
      if (!doc) return
      setSelectedDoc(doc)
      setSheetOpen(true)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isLoadingDoc && "Загрузка документа…"}
        </div>
        <CreateDocumentMenu
          trigger={
            <Button className="gap-1.5">
              <Plus className="size-4" />
              Создать документ
            </Button>
          }
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Тип документа</span>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(String(v))}>
              <SelectTrigger className="w-52">
                <SelectValue>
                  {(value: string) => (value === "all" ? "Все типы" : (DOCUMENT_TYPE_LABELS[value] ?? value))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {DOCUMENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.docType} value={o.docType}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Статус</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(String(v))}>
              <SelectTrigger className="w-40">
                <SelectValue>
                  {(value: string) =>
                    value === "all" ? "Все статусы" : value === "draft" ? "Черновик" : "Проведён"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="posted">Проведён</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DocumentsTable documents={filtered} onRowClick={handleRowClick} />

      {selectedDoc && (
        <DocumentSheet
          key={selectedDoc.id}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          docType={selectedDoc.doc_type as InventoryDocType}
          document={selectedDoc}
          formData={formData}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
