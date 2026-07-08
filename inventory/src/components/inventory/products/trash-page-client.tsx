"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { restoreProducts, permanentlyDeleteProducts } from "@/app/inventory/products/actions"
import type { TrashProductRow } from "@/app/inventory/products/actions"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TrashPageClient({ initialProducts }: { initialProducts: TrashProductRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleRestore(id: string) {
    setPendingId(id)
    startTransition(async () => {
      const result = await restoreProducts([id])
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success("Товар восстановлен")
        router.refresh()
      }
      setPendingId(null)
    })
  }

  function handlePermanentDelete(id: string) {
    if (!window.confirm("Удалить товар навсегда? Это действие необратимо.")) return
    setPendingId(id)
    startTransition(async () => {
      const result = await permanentlyDeleteProducts([id])
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success("Товар удалён навсегда")
        router.refresh()
      }
      setPendingId(null)
    })
  }

  if (initialProducts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <Trash2 className="size-8 text-muted-foreground/60" />
        <p className="text-sm font-medium">Корзина пуста</p>
        <p className="text-sm text-muted-foreground">Удалённые товары появятся здесь</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Код</TableHead>
            <TableHead>Наименование</TableHead>
            <TableHead>Артикул</TableHead>
            <TableHead>Ед. изм.</TableHead>
            <TableHead>Удалён</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialProducts.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-muted-foreground">{p.code}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="font-mono text-muted-foreground">{p.sku}</TableCell>
              <TableCell className="text-muted-foreground">{p.unit}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(p.deleted_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isPending && pendingId === p.id}
                    onClick={() => handleRestore(p.id)}
                  >
                    <Undo2 className="size-3.5" />
                    Восстановить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    disabled={isPending && pendingId === p.id}
                    onClick={() => handlePermanentDelete(p.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Удалить навсегда
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
