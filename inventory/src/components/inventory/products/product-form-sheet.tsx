"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, PackagePlus, Sparkles, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CategoryCreateDialog } from "./category-create-dialog"
import { ImageDropzone } from "./image-dropzone"
import { createProduct, updateProduct } from "@/app/inventory/products/actions"
import type { CategoryRow, ProductRow, WarehouseRow } from "@/app/inventory/products/actions"

const UNITS = ["шт", "мл", "г", "л", "уп"] as const

interface ProductFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductRow | null
  categories: CategoryRow[]
  warehouses: WarehouseRow[]
  onSaved: () => void
}

function FormSectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3.5 text-sm font-bold text-foreground">{children}</p>
}

function comingSoon() {
  toast("Скоро будет доступно")
}

// Тип товара (Товар/Услуга/Комплект) в CloudShop определяет поведение остатков —
// у нас пока есть только один тип ("Товар"), поэтому карточки Услуга/Комплект
// показаны как визуальная заглушка и не переключают форму.
const PRODUCT_TYPE_CARDS = [
  {
    key: "product",
    title: "Товар",
    description: "Продукт, имеющий остаток, который необходимо восполнять",
  },
  {
    key: "service",
    title: "Услуга",
    description: "Продукт, не имеющий остатка на складе",
  },
  {
    key: "kit",
    title: "Комплект",
    description: "Продукт, состоящий из нескольких других",
  },
] as const

function CurrencyInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        className="pr-7 text-right font-mono"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
        ₽
      </span>
    </div>
  )
}

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  categories: initialCategories,
  warehouses,
  onSaved,
}: ProductFormSheetProps) {
  const isEdit = !!product

  const [name, setName] = useState(product?.name ?? "")
  const [sku, setSku] = useState(product?.sku ?? "")
  const [barcode, setBarcode] = useState(product?.barcode ?? "")
  const [categoryId, setCategoryId] = useState<string | null>(product?.category_id ?? null)
  const [unit, setUnit] = useState<string>(product?.unit ?? UNITS[0])
  const [costPrice, setCostPrice] = useState(String(product?.cost_price ?? 0))
  const [markupPercent, setMarkupPercent] = useState("")
  // Пока пользователь не тронул цену продажи руками — она производная от
  // закупки и наценки. Как только тронул — переходим на её собственное состояние.
  const [retailPriceManual, setRetailPriceManual] = useState<string | null>(
    isEdit ? String(product?.retail_price ?? 0) : null
  )
  const computedRetailPrice = useMemo(() => {
    const cost = Number(costPrice) || 0
    const markup = Number(markupPercent) || 0
    const value = cost * (1 + markup / 100)
    return value ? value.toFixed(2) : "0"
  }, [costPrice, markupPercent])
  const retailPrice = retailPriceManual ?? computedRetailPrice
  const [discountPercent, setDiscountPercent] = useState(String(product?.discount_percent ?? 0))
  const [minStockLevel, setMinStockLevel] = useState(String(product?.min_stock_level ?? 0))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null)
  const [initialStockEnabled, setInitialStockEnabled] = useState(false)
  const [initialStockQuantity, setInitialStockQuantity] = useState("")
  const [initialStockWarehouseId, setInitialStockWarehouseId] = useState<string | null>(
    warehouses[0]?.id ?? null
  )
  const [categories, setCategories] = useState(initialCategories)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const title = useMemo(() => (isEdit ? "Редактировать товар" : "Новый товар"), [isEdit])

  function handleImageChange(file: File | null) {
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : (product?.image_url ?? null))
  }

  function handleSubmit() {
    setError(null)

    if (!name.trim()) return setError("Наименование обязательно")
    if (!sku.trim()) return setError("Артикул обязателен")
    if (initialStockEnabled && !isEdit) {
      if (!initialStockWarehouseId) return setError("Выберите склад для начального остатка")
      if (!(Number(initialStockQuantity) > 0)) {
        return setError("Укажите количество начального остатка больше нуля")
      }
    }

    const fd = new FormData()
    fd.set("name", name.trim())
    fd.set("sku", sku.trim())
    fd.set("barcode", barcode.trim())
    fd.set("category_id", categoryId ?? "")
    fd.set("unit", unit)
    fd.set("cost_price", costPrice || "0")
    fd.set("retail_price", retailPrice || "0")
    fd.set("discount_percent", discountPercent || "0")
    fd.set("min_stock_level", minStockLevel || "0")
    if (imageFile) fd.set("image", imageFile)

    if (!isEdit && initialStockEnabled) {
      fd.set("initial_stock_enabled", "on")
      fd.set("initial_stock_quantity", initialStockQuantity)
      fd.set("initial_stock_warehouse_id", initialStockWarehouseId ?? "")
    }

    startTransition(async () => {
      const result = isEdit ? await updateProduct(product!.id, fd) : await createProduct(fd)
      if (!result.success) {
        setError(result.error)
        return
      }
      onSaved()
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full gap-0 data-[side=right]:sm:max-w-[960px]"
        showCloseButton={false}
      >
        <SheetHeader className="flex-row items-center gap-3.5 border-b border-border py-3.5">
          <SheetTitle className="flex-1 text-[17px]">{title}</SheetTitle>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            <Check className="size-4" />
            {isPending ? "Сохранение…" : "Сохранить"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Закрыть"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            <X className="size-[18px]" />
          </Button>
        </SheetHeader>

        <div className="flex flex-col gap-3.5 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-3">
            {PRODUCT_TYPE_CARDS.map((t) => {
              const selected = t.key === "product"
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={selected ? undefined : comingSoon}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-4 text-center transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border text-muted-foreground hover:border-ring"
                  )}
                >
                  <span className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>
                    {t.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </button>
              )
            })}
          </div>

          <Card>
            <CardContent>
              <FormSectionTitle>Основная информация</FormSectionTitle>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 flex flex-col gap-1.5">
                  <Label htmlFor="product-name">
                    Наименование <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="product-name"
                    placeholder="Например, Anua Heartleaf 77 Toner"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-code">Код товара</Label>
                  <Input
                    id="product-code"
                    className="font-mono"
                    disabled
                    value={isEdit ? String(product.code) : "Присвоится автоматически"}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="product-barcode">Штрих-код</Label>
                    <button
                      type="button"
                      onClick={comingSoon}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Сгенерировать
                    </button>
                  </div>
                  <Input
                    id="product-barcode"
                    className="font-mono"
                    placeholder="Введите или отсканируйте"
                    value={barcode ?? ""}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-sku">Артикул *</Label>
                  <Input
                    id="product-sku"
                    className="font-mono"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-gtin">GTIN</Label>
                  <Input id="product-gtin" className="font-mono" placeholder="Введите GTIN" disabled />
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Изображение</Label>
                  <ImageDropzone preview={imagePreview} onFileSelected={handleImageChange} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Категория</Label>
                  <Select
                    value={categoryId ?? "none"}
                    onValueChange={(value) => {
                      const v = String(value)
                      if (v === "__create__") {
                        setCategoryDialogOpen(true)
                        return
                      }
                      setCategoryId(v === "none" ? null : v)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Категория">
                        {(value: string) =>
                          value === "none"
                            ? "Без категории"
                            : (categories.find((c) => c.id === value)?.name ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без категории</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value="__create__">+ Создать категорию</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-end gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label>Единица измерения</Label>
                    <Select value={unit} onValueChange={(value) => setUnit(String(value))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 self-end pb-2 text-[13px]">
                    {/*
                      Label и Switch — соседние элементы, НЕ вложенные и без htmlFor:
                      у Base UI Switch скрытый нативный чекбокс порталится вне
                      DOM-дерева Sheet, и клик по label, связанному с ним через
                      for= (или обёрнутому вокруг него), триггерит "клик снаружи"
                      и закрывает панель.
                    */}
                    <Label className="text-muted-foreground" onClick={comingSoon}>
                      Весовой товар
                    </Label>
                    <Switch checked={false} disabled />
                  </div>
                </div>

                <div className="col-span-3">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={comingSoon}>
                    <PackagePlus className="size-3.5" />
                    Добавить упаковку
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <FormSectionTitle>Характеристики товара</FormSectionTitle>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-height">Высота, см</Label>
                  <Input id="product-height" type="number" className="text-right font-mono" disabled />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-width">Ширина, см</Label>
                  <Input id="product-width" type="number" className="text-right font-mono" disabled />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-depth">Глубина, см</Label>
                  <Input id="product-depth" type="number" className="text-right font-mono" disabled />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-weight">Фактический вес, кг</Label>
                  <Input id="product-weight" type="number" className="text-right font-mono" disabled />
                </div>

                <div className="col-span-3 flex flex-col gap-1.5">
                  <Label htmlFor="product-description">Описание</Label>
                  <Textarea id="product-description" rows={3} disabled />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-country">Страна</Label>
                  <Input id="product-country" placeholder="Введите название страны" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <FormSectionTitle>Цены</FormSectionTitle>

              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-cost">Цена закупки</Label>
                  <CurrencyInput id="product-cost" value={costPrice} onChange={setCostPrice} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-markup">Наценка, %</Label>
                  <Input
                    id="product-markup"
                    type="number"
                    min={0}
                    step="0.01"
                    className="text-right font-mono"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-retail">Цена продажи</Label>
                  <CurrencyInput id="product-retail" value={retailPrice} onChange={setRetailPriceManual} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-discount">Скидка, %</Label>
                  <Input
                    id="product-discount"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className="text-right font-mono"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                </div>

                <div className="col-span-3 flex items-center gap-2 text-[13px]">
                  <Label className="text-muted-foreground" onClick={comingSoon}>
                    Товар по свободной цене
                  </Label>
                  <Switch checked={false} disabled />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="size-3" />
                    Кассир при продаже может редактировать цену
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <FormSectionTitle>Склад</FormSectionTitle>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-min-stock">Минимальный остаток</Label>
                  <Input
                    id="product-min-stock"
                    type="number"
                    min={0}
                    step="1"
                    className="text-right font-mono"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                  />
                </div>

                {!isEdit && (
                  <div className="col-span-2 flex items-center gap-2 self-end pb-2 text-[13px]">
                    <Label className="cursor-pointer" onClick={() => setInitialStockEnabled((v) => !v)}>
                      Ввести начальные остатки
                    </Label>
                    <Switch
                      checked={initialStockEnabled}
                      onCheckedChange={(checked) => setInitialStockEnabled(!!checked)}
                    />
                  </div>
                )}

                {!isEdit && initialStockEnabled && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="initial-stock-qty">Количество</Label>
                      <Input
                        id="initial-stock-qty"
                        type="number"
                        min={0}
                        step="0.001"
                        className="text-right font-mono"
                        value={initialStockQuantity}
                        onChange={(e) => setInitialStockQuantity(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <Label>Склад</Label>
                      <Select
                        value={initialStockWarehouseId ?? undefined}
                        onValueChange={(value) => setInitialStockWarehouseId(String(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Склад">
                            {(value: string) =>
                              warehouses.find((w) => w.id === value)?.name ?? value
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </SheetContent>

      <CategoryCreateDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCreated={(category) => {
          setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
          setCategoryId(category.id)
          setCategoryDialogOpen(false)
        }}
      />
    </Sheet>
  )
}
