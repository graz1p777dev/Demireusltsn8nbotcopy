"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductCombobox } from "./product-combobox"
import { SupplierCreateDialog } from "./supplier-create-dialog"
import { saveDocument, getWarehouseStock } from "@/app/inventory/stock-movement/actions"
import type {
  DocumentFormData,
  DocumentFormProduct,
  DocumentFormSupplier,
  DocumentWithItems,
} from "@/app/inventory/stock-movement/actions"
import { getDocumentTypeConfig, type InventoryDocType } from "@/config/document-types"

interface DraftItem {
  key: string
  productId: string
  productName: string
  quantity: string
  price: string
}

interface DocumentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docType: InventoryDocType
  document: DocumentWithItems | null
  formData: DocumentFormData
  onSaved: () => void
}

function formatMoney(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`
}

export function DocumentSheet({
  open,
  onOpenChange,
  docType,
  document,
  formData,
  onSaved,
}: DocumentSheetProps) {
  const config = getDocumentTypeConfig(docType)
  const isEdit = !!document
  const isPosted = document?.status === "posted"
  const isStockCheck = config?.isStockCheck ?? false
  const showPrice = (config?.priceMode ?? "none") !== "none"
  const showEditablePrice = config?.priceMode === "editable-cost"

  const [warehouseId, setWarehouseId] = useState(document?.warehouse_id ?? formData.warehouses[0]?.id ?? "")
  const [targetWarehouseId, setTargetWarehouseId] = useState<string | null>(
    document?.target_warehouse_id ?? null
  )
  const [supplierId, setSupplierId] = useState<string | null>(document?.supplier_id ?? null)
  const [comment, setComment] = useState(document?.comment ?? "")
  const [items, setItems] = useState<DraftItem[]>(
    document?.items.map((i) => ({
      key: crypto.randomUUID(),
      productId: i.product_id,
      productName: i.product_name,
      quantity: String(i.quantity),
      price: String(i.price),
    })) ?? []
  )
  const [suppliers, setSuppliers] = useState<DocumentFormSupplier[]>(formData.suppliers)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [stockMap, setStockMap] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!isStockCheck || isPosted || !warehouseId) return
    let cancelled = false
    getWarehouseStock(warehouseId).then((map) => {
      if (!cancelled) setStockMap(map)
    })
    return () => {
      cancelled = true
    }
  }, [isStockCheck, isPosted, warehouseId])

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0),
    [items]
  )

  if (!config) return null

  const title = isEdit ? `${config.editTitlePrefix} ${document.doc_number}` : config.createTitle

  const targetWarehouseOptions = formData.warehouses.filter((w) => w.id !== warehouseId)

  function handleAddProduct(product: DocumentFormProduct) {
    const defaultQuantity = isStockCheck ? String(stockMap[product.id] ?? 0) : "1"
    const defaultPrice =
      config!.priceMode === "editable-cost"
        ? String(product.cost_price)
        : config!.priceMode === "readonly-reference"
          ? String(product.retail_price)
          : "0"

    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        quantity: defaultQuantity,
        price: defaultPrice,
      },
    ])
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }

  function handleSubmit(post: boolean) {
    setError(null)

    if (!warehouseId) return setError(`Выберите ${config!.warehouseLabel.toLowerCase()}`)
    if (config!.requiresTargetWarehouse) {
      if (!targetWarehouseId) return setError("Выберите склад-получатель")
      if (targetWarehouseId === warehouseId) {
        return setError("Склад-источник и склад-получатель должны отличаться")
      }
    }
    if (items.length === 0) return setError("Добавьте хотя бы одну строку")
    for (const i of items) {
      const qty = Number(i.quantity)
      if (isStockCheck) {
        if (!(qty >= 0)) return setError("Фактический остаток не может быть отрицательным")
      } else if (!(qty > 0)) {
        return setError("Проверьте количество в строках — должно быть больше нуля")
      }
    }

    const fd = new FormData()
    fd.set("warehouse_id", warehouseId)
    fd.set("target_warehouse_id", config!.requiresTargetWarehouse ? (targetWarehouseId ?? "") : "")
    fd.set("supplier_id", config!.requiresSupplier ? (supplierId ?? "") : "")
    fd.set("comment", comment)
    fd.set(
      "items_json",
      JSON.stringify(
        items.map((i) => ({
          product_id: i.productId,
          quantity: Number(i.quantity),
          price: Number(i.price),
        }))
      )
    )

    startTransition(async () => {
      const result = await saveDocument(document?.id ?? null, docType, fd, post)
      if (!result.success) {
        setError(result.error)
        return
      }
      toast.success(post ? "Документ проведён" : "Черновик сохранён")
      onSaved()
      onOpenChange(false)
    })
  }

  const columnCount =
    1 + // Товар
    (isStockCheck && !isPosted ? 1 : 0) + // Остаток в системе
    1 + // Кол-во / Факт. остаток
    (showEditablePrice ? 1 : 0) + // Цена
    (showPrice ? 1 : 0) + // Сумма
    (!isPosted ? 1 : 0) // remove

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <SheetTitle>{title}</SheetTitle>
            {isEdit && (
              <Badge variant={isPosted ? "default" : "secondary"}>
                {isPosted ? "Проведён" : "Черновик"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-4">
          <div
            className={cn(
              "grid gap-3",
              config.requiresTargetWarehouse || config.requiresSupplier ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            <div className="flex flex-col gap-1.5">
              <Label>{config.warehouseLabel} *</Label>
              <Select value={warehouseId} onValueChange={(v) => setWarehouseId(String(v))} disabled={isPosted}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={config.warehouseLabel}>
                    {(value: string) => formData.warehouses.find((w) => w.id === value)?.name ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {formData.warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.requiresTargetWarehouse && (
              <div className="flex flex-col gap-1.5">
                <Label>Склад-получатель *</Label>
                <Select
                  value={targetWarehouseId ?? ""}
                  onValueChange={(v) => setTargetWarehouseId(String(v))}
                  disabled={isPosted}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Склад-получатель">
                      {(value: string) => formData.warehouses.find((w) => w.id === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {targetWarehouseOptions.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.requiresSupplier && (
              <div className="flex flex-col gap-1.5">
                <Label>Поставщик</Label>
                <Select
                  value={supplierId ?? "none"}
                  onValueChange={(value) => {
                    const v = String(value)
                    if (v === "__create__") {
                      setSupplierDialogOpen(true)
                      return
                    }
                    setSupplierId(v === "none" ? null : v)
                  }}
                  disabled={isPosted}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Поставщик">
                      {(value: string) =>
                        value === "none" ? "Без поставщика" : (suppliers.find((s) => s.id === value)?.name ?? value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без поставщика</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="__create__">+ Создать поставщика</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Товары</p>
              {!isPosted && <ProductCombobox products={formData.products} onSelect={handleAddProduct} />}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    {isStockCheck && !isPosted && (
                      <TableHead className="w-28 text-right">Остаток в системе</TableHead>
                    )}
                    <TableHead className="w-28 text-right">
                      {isPosted && isStockCheck ? "Изменение" : config.quantityColumnLabel}
                    </TableHead>
                    {showEditablePrice && <TableHead className="w-28 text-right">Цена</TableHead>}
                    {showPrice && <TableHead className="w-28 text-right">Сумма</TableHead>}
                    {!isPosted && <TableHead className="w-8" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columnCount} className="py-6 text-center text-sm text-muted-foreground">
                        Строки не добавлены
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const current = stockMap[item.productId] ?? 0
                      const diff = Number(item.quantity || 0) - current
                      return (
                        <TableRow key={item.key}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          {isStockCheck && !isPosted && (
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {current}
                            </TableCell>
                          )}
                          <TableCell>
                            {isPosted && isStockCheck ? (
                              <span
                                className={cn(
                                  "block text-right font-mono",
                                  Number(item.quantity) > 0
                                    ? "text-primary"
                                    : Number(item.quantity) < 0
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                                )}
                              >
                                {Number(item.quantity) > 0 ? `+${item.quantity}` : item.quantity}
                              </span>
                            ) : (
                              <div className="flex flex-col items-end gap-0.5">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  value={item.quantity}
                                  disabled={isPosted}
                                  onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                                  className="text-right"
                                />
                                {isStockCheck && (
                                  <span
                                    className={cn(
                                      "text-[11px] font-mono",
                                      diff > 0
                                        ? "text-primary"
                                        : diff < 0
                                          ? "text-destructive"
                                          : "text-muted-foreground"
                                    )}
                                  >
                                    {diff > 0 ? `+${diff}` : diff} к остатку
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          {showEditablePrice && (
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.price}
                                disabled={isPosted}
                                onChange={(e) => updateItem(item.key, { price: e.target.value })}
                                className="text-right"
                              />
                            </TableCell>
                          )}
                          {showPrice && (
                            <TableCell className="text-right whitespace-nowrap">
                              {formatMoney((Number(item.quantity) || 0) * (Number(item.price) || 0))}
                            </TableCell>
                          )}
                          {!isPosted && (
                            <TableCell>
                              <button
                                type="button"
                                aria-label="Удалить строку"
                                onClick={() => removeItem(item.key)}
                                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                              >
                                <X className="size-4" />
                              </button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {showPrice && (
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-muted-foreground">Итого:</span>
                <span className="text-base font-semibold">{formatMoney(totalAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-comment">Комментарий</Label>
              <Textarea
                id="doc-comment"
                value={comment ?? ""}
                disabled={isPosted}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="flex-row justify-end border-t border-border bg-muted/30">
          {isPosted ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Отмена
              </Button>
              <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={isPending}>
                Сохранить как черновик
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={isPending}>
                Провести
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>

      <SupplierCreateDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(supplier) => {
          setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)))
          setSupplierId(supplier.id)
          setSupplierDialogOpen(false)
        }}
      />
    </Sheet>
  )
}
