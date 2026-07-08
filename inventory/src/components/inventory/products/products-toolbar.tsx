"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FolderCog,
  FolderPlus,
  FolderTree,
  ListTree,
  MoreHorizontal,
  PencilLine,
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
  Tag,
  Tags,
  Trash2,
  Upload,
  Warehouse,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useOutsideDismiss } from "@/lib/use-outside-dismiss"
import { ColumnSettingsPopover } from "@/components/inventory/column-settings-popover"
import type { ProductColumnDef } from "./product-columns"
import type { CategoryRow } from "@/app/inventory/products/actions"

export interface ProductsFilters {
  search: string
  categoryId: string
  priceMin: string
  priceMax: string
  stockMin: string
  stockMax: string
}

const EMPTY_TOOLBAR_FILTERS: ProductsFilters = {
  search: "",
  categoryId: "all",
  priceMin: "",
  priceMax: "",
  stockMin: "",
  stockMax: "",
}

interface ProductsToolbarProps {
  filters: ProductsFilters
  onFiltersChange: (filters: ProductsFilters) => void
  categories: CategoryRow[]
  onCreateProduct: () => void
  onCreateCategory: () => void
  onImportProducts: () => void
  selectedCount: number
  grouped: boolean
  onToggleGrouped: () => void
  columnDefs: ProductColumnDef[]
  columnVisibility: Record<string, boolean>
  onToggleColumn: (key: string) => void
  onDeleteSelected: () => void
}

function comingSoon() {
  toast("Скоро будет доступно")
}

export function ProductsToolbar({
  filters,
  onFiltersChange,
  categories,
  onCreateProduct,
  onCreateCategory,
  onImportProducts,
  selectedCount,
  grouped,
  onToggleGrouped,
  columnDefs,
  columnVisibility,
  onToggleColumn,
  onDeleteSelected,
}: ProductsToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  useOutsideDismiss(filterRef, () => setFilterOpen(false), filterOpen)

  function set<K extends keyof ProductsFilters>(key: K, value: ProductsFilters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative max-w-[340px] flex-1">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Поиск по наименованию"
          className="pl-8"
        />
      </div>

      <div ref={filterRef} className="relative">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFilterOpen((v) => !v)}>
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          Фильтр
        </Button>

        {filterOpen && (
          <div className="absolute top-full left-0 z-20 mt-1.5 w-84 rounded-lg border border-border bg-popover p-4 shadow-lg">
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "product", label: "Товар" },
                  { key: "service", label: "Услуга" },
                  { key: "kit", label: "Комплект" },
                ].map((t) => (
                  <div
                    key={t.key}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2"
                  >
                    <Checkbox checked disabled />
                    <Label className="text-[13px] font-normal text-muted-foreground">{t.label}</Label>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Категории</span>
                <Select value={filters.categoryId} onValueChange={(v) => set("categoryId", String(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === "all"
                          ? "Выбрать категорию"
                          : value === "none"
                            ? "Без категории"
                            : (categories.find((c) => c.id === value)?.name ?? value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    <SelectItem value="none">Без категории</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Цена</span>
                <div className="flex items-center gap-1.5">
                  <select disabled className="h-8 w-24 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>базовая</option>
                  </select>
                  <select disabled className="h-8 w-20 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>больше</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="от"
                    value={filters.priceMin}
                    onChange={(e) => set("priceMin", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={comingSoon}
                    aria-label="Добавить условие"
                    className="flex size-8 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <select disabled className="h-8 w-24 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>базовая</option>
                  </select>
                  <select disabled className="h-8 w-20 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>меньше</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="до"
                    value={filters.priceMax}
                    onChange={(e) => set("priceMax", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Остатки</span>
                <div className="flex items-center gap-1.5">
                  <select disabled className="h-8 w-24 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>общие</option>
                  </select>
                  <select disabled className="h-8 w-20 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>больше</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="от"
                    value={filters.stockMin}
                    onChange={(e) => set("stockMin", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={comingSoon}
                    aria-label="Добавить условие"
                    className="flex size-8 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <select disabled className="h-8 w-24 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>общие</option>
                  </select>
                  <select disabled className="h-8 w-20 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>меньше</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="до"
                    value={filters.stockMax}
                    onChange={(e) => set("stockMax", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Срок годности</span>
                <div className="flex items-center gap-1.5">
                  <select disabled className="h-8 flex-1 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>истекает в течение</option>
                  </select>
                  <Input disabled className="w-20" />
                  <span className="text-xs text-muted-foreground">дней</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Изменения товара</span>
                <div className="flex items-center gap-1.5">
                  <select disabled className="h-8 flex-1 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>изменялся в течение</option>
                  </select>
                  <Input disabled className="w-16" />
                  <select disabled className="h-8 w-20 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>дней</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Продаваемость</span>
                <div className="flex items-center gap-1.5">
                  <select disabled className="h-8 flex-1 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>продавался в течение</option>
                  </select>
                  <Input disabled className="w-16" />
                  <select disabled className="h-8 w-20 rounded-md border border-border bg-muted px-2 text-xs text-muted-foreground">
                    <option>дней</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => setFilterOpen(false)}>
                  Применить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onFiltersChange({ ...EMPTY_TOOLBAR_FILTERS, search: filters.search })}
                >
                  Сбросить
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={comingSoon}>
                Сохранить пресет
              </Button>
            </div>
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1.5">
              Действия{selectedCount > 0 ? ` (${selectedCount})` : ""}
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={comingSoon}>
              <FileText className="size-3.5" />
              Создать документ
              <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Работа с группой товаров</DropdownMenuLabel>
            <DropdownMenuItem onClick={comingSoon}>
              <Tag className="size-3.5" />
              Цены и скидки
            </DropdownMenuItem>
            <DropdownMenuItem onClick={comingSoon}>
              <FolderCog className="size-3.5" />
              Категории и группы
            </DropdownMenuItem>
            <DropdownMenuItem onClick={comingSoon}>
              <MoreHorizontal className="size-3.5" />
              Другое
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={comingSoon}>
              <Tags className="size-3.5" />
              Ценники
            </DropdownMenuItem>
            <DropdownMenuItem onClick={comingSoon}>
              <PencilLine className="size-3.5" />
              Редактор цен
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={comingSoon}>
              <Warehouse className="size-3.5" />
              Оценка склада
            </DropdownMenuItem>
            <DropdownMenuItem onClick={comingSoon}>
              <Scale className="size-3.5" />
              Файл для весов
            </DropdownMenuItem>
            <DropdownMenuItem onClick={comingSoon}>
              <Download className="size-3.5" />
              Скачать в Excel
              <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={selectedCount === 0} variant="destructive" onClick={onDeleteSelected}>
              <Trash2 className="size-3.5" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <Button size="sm" className="gap-1.5" onClick={onCreateProduct}>
        <Plus className="size-4" />
        Создать товар
      </Button>

      <Button variant="outline" size="icon" aria-label="Создать категорию" onClick={onCreateCategory}>
        <FolderPlus className="size-4" />
      </Button>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={onImportProducts}>
        <Upload className="size-3.5 text-muted-foreground" />
        Импорт товаров
      </Button>

      <Button
        variant="outline"
        size="icon"
        aria-label={grouped ? "Скрыть группы" : "Показать группы"}
        aria-pressed={grouped}
        className={grouped ? "bg-accent" : undefined}
        onClick={onToggleGrouped}
      >
        {grouped ? (
          <FolderTree className="size-4 text-muted-foreground" />
        ) : (
          <ListTree className="size-4 text-muted-foreground" />
        )}
      </Button>

      <ColumnSettingsPopover columnDefs={columnDefs} visibility={columnVisibility} onToggle={onToggleColumn} />
    </div>
  )
}
