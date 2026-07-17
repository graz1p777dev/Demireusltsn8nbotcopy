"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import {
  Barcode, Boxes, ChevronDown, CircleUserRound, CreditCard, FolderOpen, Menu,
  Minus, Plus, Search, ShoppingBag, Trash2, UserPlus, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveDocument } from "@/app/inventory/stock-movement/actions"
import type { ProductRow, WarehouseRow } from "@/app/inventory/products/actions"

type CartLine = { product: ProductRow; quantity: number }
type Customer = { name: string; phone: string; card: string; birthday: string }
const money = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " сом"

export function CashierPageClient({ products, warehouses, role }: { products: ProductRow[]; warehouses: WarehouseRow[]; role: string }) {
  // Кассиру /inventory недоступен (см. редирект в inventory/layout.tsx) — для него кнопки нет.
  const canOpenInventory = role !== "" && role !== "cashier"
  const [query, setQuery] = useState("")
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "")
  const [cart, setCart] = useState<CartLine[]>([])
  const [section, setSection] = useState<"all" | "product" | "service" | "kit">("all")
  const [sideMenu, setSideMenu] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [draftCustomer, setDraftCustomer] = useState<Customer>({ name: "", phone: "", card: "", birthday: "" })
  const [, startTransition] = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter((product) => {
      const value = [product.name, product.sku, product.barcode, product.gtin, String(product.code)].filter(Boolean).join(" ").toLowerCase()
      return (section === "all" || product.product_type === section) && (!term || value.includes(term))
    })
  }, [products, query, section])
  const total = cart.reduce((sum, line) => sum + line.quantity * line.product.retail_price, 0)

  function add(product: ProductRow) {
    const inCart = cart.find((line) => line.product.id === product.id)?.quantity ?? 0
    if (product.product_type !== "service" && inCart >= product.stock_total) {
      toast.error("На складе нет доступного остатка этого товара")
      return
    }
    setCart((previous) => {
      const found = previous.find((line) => line.product.id === product.id)
      return found
        ? previous.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...previous, { product, quantity: 1 }]
    })
  }

  function setQuantity(id: string, quantity: number) {
    setCart((previous) => previous.flatMap((line) => {
      if (line.product.id !== id) return [line]
      if (quantity <= 0) return []
      const available = line.product.product_type === "service" ? quantity : Math.min(quantity, line.product.stock_total)
      return [{ ...line, quantity: available }]
    }))
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || !query.trim()) return
    const scanned = query.trim().toLowerCase()
    const exact = products.find((product) => [product.barcode, product.gtin, product.sku, String(product.code)].filter(Boolean).some((value) => String(value).toLowerCase() === scanned))
    if (!exact) return toast.error("Товар с таким штрих-кодом не найден")
    add(exact)
    setQuery("")
    toast.success(`Добавлено: ${exact.name}`)
  }

  function saveCustomer() {
    if (!draftCustomer.name.trim()) return toast.error("Введите имя покупателя")
    setCustomer({ ...draftCustomer, name: draftCustomer.name.trim() })
    setCustomerOpen(false)
    toast.success("Клиент выбран для продажи")
  }

  function checkout() {
    if (!warehouseId) return toast.error("Сначала выберите склад")
    if (!cart.length) return toast.error("Добавьте товар в корзину")
    const formData = new FormData()
    formData.set("warehouse_id", warehouseId)
    formData.set("items_json", JSON.stringify(cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity, price: line.product.retail_price }))))
    formData.set("comment", customer ? `Клиент: ${customer.name}${customer.phone ? `, ${customer.phone}` : ""}` : "")
    startTransition(async () => {
      const result = await saveDocument(null, "sale", formData, true)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Продажа проведена")
      setCart([])
      searchRef.current?.focus()
    })
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#111719] font-sans text-[#edf4ef]">
      <header className="flex h-[76px] items-center gap-4 border-b border-white/10 bg-[#151d1f] px-3 sm:px-5">
        <button type="button" onClick={() => setSideMenu(true)} className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#155e90] text-white transition hover:bg-[#1971aa]" aria-label="Открыть меню"><Menu className="size-7" /></button>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-[#7f8d8e]" />
          <Input ref={searchRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Поиск по наименованию, артикулу, штрих-коду, коду" className="h-12 border-0 bg-transparent pl-12 text-base font-medium text-white placeholder:text-[#738080] focus-visible:ring-1 focus-visible:ring-[#37a5df]" />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 px-2 py-1 text-xs text-[#9eabaa] sm:block">F</kbd>
        </div>
        <Select value={warehouseId} onValueChange={(value) => setWarehouseId(value ?? "")}>
          <SelectTrigger className="hidden h-10 w-48 border-white/15 bg-[#111719] text-[#dbe8e4] md:flex"><SelectValue placeholder="Склад" /></SelectTrigger>
          <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent>
        </Select>
        <button type="button" onClick={() => setCustomerOpen(true)} className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#b65c00] text-white transition hover:bg-[#d26b00]" aria-label="Выбрать клиента"><UserPlus className="size-7" /></button>
      </header>

      <div className="grid min-h-[calc(100vh-76px)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 p-3 sm:p-5">
          <div className="mb-5 flex flex-wrap gap-2 border-b border-white/10 pb-4">
            {[
              ["all", "Товары", Boxes], ["product", "Категории", FolderOpen], ["service", "Услуги", ShoppingBag], ["kit", "Комплекты", Barcode],
            ].map(([key, label, Icon]) => <button key={String(key)} type="button" onClick={() => setSection(key as typeof section)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${section === key ? "bg-[#b65c00] text-white" : "bg-white/[0.045] text-[#cbd7d2] hover:bg-white/10"}`}><Icon className="size-4" />{String(label)}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
            {visibleProducts.map((product) => {
              const isOutOfStock = product.product_type !== "service" && product.stock_total <= 0
              return <button key={product.id} type="button" onClick={() => add(product)} disabled={isOutOfStock} className={`group flex min-h-[240px] flex-col overflow-hidden rounded-lg border border-white/[0.07] bg-[#182022] p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48b7ee] ${isOutOfStock ? "cursor-not-allowed opacity-55" : "hover:-translate-y-0.5 hover:border-[#3296ca] hover:bg-[#1b2628]"}`}>
              <div className="relative mb-3 grid aspect-square place-items-center overflow-hidden rounded-md bg-[#0f1517]">
                {product.image_url ? <img src={product.image_url} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" /> : <Barcode className="size-10 text-[#516162]" />}
                <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-semibold ${isOutOfStock ? "bg-[#8f3030] text-white" : "bg-black/55 text-[#dce7e1]"}`}>{product.product_type === "service" ? "услуга" : isOutOfStock ? "нет остатка" : `${product.stock_total} ${product.unit}`}</span>
              </div>
              <span className="line-clamp-2 text-sm font-semibold leading-5 text-[#edf4ef]">{product.name}</span>
              <span className="mt-auto pt-3 text-base font-bold text-white">{money(product.retail_price)}</span>
            </button>
            })}
          </div>
          {visibleProducts.length === 0 && <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-white/15 text-center text-[#8c9998]"><div><Search className="mx-auto mb-3 size-8" /><p>Товары не найдены</p><p className="mt-1 text-sm">Проверьте запрос или отсканируйте штрих-код</p></div></div>}
        </section>

        <aside className="flex min-h-[520px] flex-col border-t border-white/10 bg-[#0d1315] xl:border-l xl:border-t-0">
          <button type="button" onClick={() => setCustomerOpen(true)} className="flex items-center gap-3 border-b border-white/10 px-5 py-4 text-left transition hover:bg-white/[0.04]"><CircleUserRound className="size-6 text-[#88a09d]" /><span className="flex-1 font-semibold">{customer?.name ?? "РОЗНИЧНЫЙ КЛИЕНТ"}</span><ChevronDown className="size-4 text-[#849291]" /></button>
          {customer && <div className="border-b border-white/10 px-5 py-2 text-xs text-[#91a29f]">{customer.phone || customer.card || "Клиент без дополнительных данных"}</div>}
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
            {cart.length === 0 ? <div className="grid flex-1 place-items-center text-center text-[#788887]"><div><ShoppingBag className="mx-auto mb-4 size-12 opacity-50" /><p className="text-2xl font-semibold text-[#a9b8b4]">Выберите товары</p><p className="mt-2 text-sm">Нажмите на карточку или отсканируйте штрих-код</p></div></div> : cart.map((line) => <div key={line.product.id} className="border-b border-white/[0.08] py-4"><div className="flex gap-3"><div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded bg-[#192224]">{line.product.image_url ? <img src={line.product.image_url} alt="" className="size-full object-cover" /> : <Barcode className="size-5 text-[#60716f]" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{line.product.name}</p><p className="mt-1 text-xs text-[#8a9996]">{money(line.product.retail_price)} за {line.product.unit}</p></div><button type="button" onClick={() => setQuantity(line.product.id, 0)} className="self-start p-1 text-[#83918f] hover:text-[#f17b6c]" aria-label="Удалить товар"><Trash2 className="size-4" /></button></div><div className="mt-3 flex items-center justify-between"><div className="flex overflow-hidden rounded border border-white/15"><button type="button" onClick={() => setQuantity(line.product.id, line.quantity - 1)} className="grid size-8 place-items-center hover:bg-white/10"><Minus className="size-3" /></button><span className="grid min-w-9 place-items-center border-x border-white/15 text-sm">{line.quantity}</span><button type="button" onClick={() => setQuantity(line.product.id, line.quantity + 1)} className="grid size-8 place-items-center hover:bg-white/10"><Plus className="size-3" /></button></div><b>{money(line.quantity * line.product.retail_price)}</b></div></div>)}
          </div>
          <div className="border-t border-white/10 p-5"><div className="mb-4 flex items-end justify-between"><span className="text-sm text-[#96a5a2]">Итого</span><strong className="text-3xl tracking-tight">{money(total)}</strong></div><Button onClick={checkout} className="h-14 w-full rounded-md bg-[#155e90] text-base font-bold hover:bg-[#1971aa]"><CreditCard className="mr-2 size-5" />ПРОДАЖА</Button></div>
        </aside>
      </div>

      {sideMenu && <div className="fixed inset-0 z-50 bg-black/65" onClick={() => setSideMenu(false)}><aside onClick={(event) => event.stopPropagation()} className="flex h-full w-80 flex-col border-r border-white/10 bg-[#141c1e] p-4 shadow-2xl"><div className="mb-6 flex items-center justify-between"><span className="text-lg font-bold">Demi Results</span><button onClick={() => setSideMenu(false)} className="rounded p-2 hover:bg-white/10"><X /></button></div><div className="rounded-lg border border-white/10 bg-white/[0.04] p-4"><p className="font-semibold">Кассовая смена</p><p className="mt-1 text-sm text-[#94a4a0]">Продажи проводятся в текущую смену</p></div>{canOpenInventory && <a href="/inventory" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#155e90] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1971aa]"><Boxes className="size-4" />Товароучёт</a>}<div className="mt-auto text-sm text-[#82918e]">Для выхода из кассы обратитесь к владельцу системы.</div></aside></div>}
      {customerOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><section className="w-full max-w-xl rounded-xl border border-white/10 bg-[#172022] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div><h2 className="text-xl font-bold">Создание клиента</h2><p className="mt-1 text-sm text-[#93a19f]">Данные будут добавлены к чеку продажи</p></div><button onClick={() => setCustomerOpen(false)} className="rounded p-2 hover:bg-white/10"><X /></button></div><div className="grid gap-4 p-6 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-sm text-[#d9e4df]">Имя покупателя *</span><Input value={draftCustomer.name} onChange={(e) => setDraftCustomer({ ...draftCustomer, name: e.target.value })} className="h-11 border-white/15 bg-[#101719] text-white" placeholder="Имя покупателя" /></label><label><span className="mb-1.5 block text-sm text-[#d9e4df]">Телефон</span><Input value={draftCustomer.phone} onChange={(e) => setDraftCustomer({ ...draftCustomer, phone: e.target.value })} className="h-11 border-white/15 bg-[#101719] text-white" placeholder="+996 ..." /></label><label><span className="mb-1.5 block text-sm text-[#d9e4df]">Дисконтная карта</span><Input value={draftCustomer.card} onChange={(e) => setDraftCustomer({ ...draftCustomer, card: e.target.value })} className="h-11 border-white/15 bg-[#101719] text-white" placeholder="Номер карты" /></label><label><span className="mb-1.5 block text-sm text-[#d9e4df]">Дата рождения</span><Input type="date" value={draftCustomer.birthday} onChange={(e) => setDraftCustomer({ ...draftCustomer, birthday: e.target.value })} className="h-11 border-white/15 bg-[#101719] text-white" /></label></div><div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4"><Button variant="ghost" onClick={() => setCustomerOpen(false)}>Отмена</Button><Button onClick={saveCustomer} className="bg-[#b65c00] hover:bg-[#d26b00]">Выбрать клиента</Button></div></section></div>}
    </main>
  )
}
