"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, PackageSearch, Plus } from "lucide-react"
import { ProductsToolbar, type ProductsFilters } from "./products-toolbar"
import { ProductsList } from "./products-list"
import { ProductFormSheet } from "./product-form-sheet"
import { CategoryCreateDialog } from "./category-create-dialog"
import { ImportProductsDialog } from "./import-products-dialog"
import { buildProductColumnDefs, useProductColumnVisibility } from "./product-columns"
import { softDeleteProducts } from "@/app/inventory/products/actions"
import type { ProductsPageData, ProductRow, CategoryRow } from "@/app/inventory/products/actions"

const EMPTY_FILTERS: ProductsFilters = {
  search: "",
  categoryId: "all",
  priceMin: "",
  priceMax: "",
  stockMin: "",
  stockMax: "",
}

export function ProductsPageClient({ initialData }: { initialData: ProductsPageData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [categories, setCategories] = useState<CategoryRow[]>(initialData.categories)
  const [filters, setFilters] = useState<ProductsFilters>(EMPTY_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [grouped, setGrouped] = useState(true)

  const columnDefs = useMemo(() => buildProductColumnDefs(initialData.warehouses), [initialData.warehouses])
  const { visibility, toggle: toggleColumn } = useProductColumnVisibility(columnDefs)

  const filteredProducts = useMemo(() => {
    return initialData.products.filter((p) => {
      if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.categoryId === "none" && p.category_id !== null) return false
      if (
        filters.categoryId !== "all" &&
        filters.categoryId !== "none" &&
        p.category_id !== filters.categoryId
      ) {
        return false
      }
      if (filters.priceMin !== "" && p.retail_price < Number(filters.priceMin)) return false
      if (filters.priceMax !== "" && p.retail_price > Number(filters.priceMax)) return false
      if (filters.stockMin !== "" && p.stock_total < Number(filters.stockMin)) return false
      if (filters.stockMax !== "" && p.stock_total > Number(filters.stockMax)) return false
      return true
    })
  }, [initialData.products, filters])

  const groups = useMemo(() => {
    const byCategory = new Map<string, ProductRow[]>()
    for (const p of filteredProducts) {
      const key = p.category_id ?? "none"
      const list = byCategory.get(key) ?? []
      list.push(p)
      byCategory.set(key, list)
    }

    const result: { key: string; title: string; products: ProductRow[] }[] = []
    for (const c of categories) {
      const products = byCategory.get(c.id)
      if (products?.length) result.push({ key: c.id, title: c.name, products })
    }
    const noCategory = byCategory.get("none")
    if (noCategory?.length) result.push({ key: "none", title: "Без категории", products: noCategory })

    return result
  }, [filteredProducts, categories])

  function refresh() {
    startTransition(() => router.refresh())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openCreateForm() {
    setSelectedProduct(null)
    setFormOpen(true)
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    startTransition(async () => {
      const result = await softDeleteProducts(ids)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(ids.length > 1 ? "Товары перемещены в корзину" : "Товар перемещён в корзину")
      setSelectedIds(new Set())
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ProductsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        selectedCount={selectedIds.size}
        onCreateProduct={openCreateForm}
        onCreateCategory={() => setCategoryDialogOpen(true)}
        onImportProducts={() => setImportDialogOpen(true)}
        grouped={grouped}
        onToggleGrouped={() => setGrouped((v) => !v)}
        columnDefs={columnDefs}
        columnVisibility={visibility}
        onToggleColumn={toggleColumn}
        onDeleteSelected={handleDeleteSelected}
      />

      {groups.length === 0 && filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <PackageSearch className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Ничего не найдено</p>
          <p className="text-sm text-muted-foreground">
            Измените параметры поиска или создайте первый товар
          </p>
        </div>
      ) : (
        <>
          <ProductsList
            groups={groups}
            flatProducts={filteredProducts}
            grouped={grouped}
            categories={categories}
            columnDefs={columnDefs}
            visibility={visibility}
            onRowClick={(product) => {
              setSelectedProduct(product)
              setFormOpen(true)
            }}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />

          <div className="flex items-center justify-between text-[13px] text-foreground/55">
            <span>
              Всего товаров: <b className="text-foreground">{filteredProducts.length}</b>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Страницы</span>
              <button
                type="button"
                className="flex size-[30px] items-center justify-center rounded-md border border-border text-muted-foreground"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                className="flex size-[30px] items-center justify-center rounded-md border-none bg-primary font-mono text-xs font-semibold text-primary-foreground"
              >
                1
              </button>
              <button
                type="button"
                className="flex size-[30px] items-center justify-center rounded-md border border-border text-muted-foreground"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
          >
            <Plus className="size-3.5" />
            Создать новый товар или услугу
          </button>
        </>
      )}

      <ProductFormSheet
        key={selectedProduct?.id ?? "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        product={selectedProduct}
        categories={categories}
        warehouses={initialData.warehouses}
        onSaved={refresh}
      />

      <CategoryCreateDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCreated={(category) => {
          setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
          setCategoryDialogOpen(false)
        }}
      />

      <ImportProductsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={(newCategories) => {
          if (newCategories.length > 0) {
            setCategories((prev) =>
              [...prev, ...newCategories].sort((a, b) => a.name.localeCompare(b.name))
            )
          }
          refresh()
        }}
      />
    </div>
  )
}
