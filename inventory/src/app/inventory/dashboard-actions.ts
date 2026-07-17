import { createClient } from "@/lib/supabase/server"

export type DashboardKpi = {
  label: string
  value: string
  hint: string
  highlight?: boolean
  icon: "wallet" | "shopping-bag" | "trending-up" | "receipt"
}

export type DashboardData = {
  kpis: DashboardKpi[]
  revenueTrend: { day: number; revenue: number }[]
  categories: { name: string; percent: number; color: string }[]
  saleCount: number
  documents: { name: string; quantity: number; amount: number; warehouse: string }[]
  stock: {
    warnings: { label: string; icon: "alert-triangle" | "package-x" | "circle-slash" }[]
    totalQuantity: number
    retailValue: number
    costValue: number
  }
}

const COLORS = ["#7c5cfc", "#22c88f", "#f59e0b", "#38bdf8", "#f472b6"]
const money = (value: number) => value.toLocaleString("ru-RU") + " сом"

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString()
  const [{ data: documents }, { data: balances }, { data: products }] = await Promise.all([
    supabase.from("inventory_documents").select("id, doc_type, total_amount, created_at, warehouse:inventory_warehouses!warehouse_id(name), inventory_document_items(quantity, price, inventory_products(cost_price, inventory_categories(name)))").eq("status", "posted").gte("created_at", monthStart).lt("created_at", monthEnd).order("created_at", { ascending: false }),
    supabase.from("inventory_stock_balances").select("product_id, quantity"),
    supabase.from("inventory_products").select("id, retail_price, cost_price, min_stock_level").is("deleted_at", null),
  ])

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const revenueTrend = Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, revenue: 0 }))
  let revenue = 0
  let cost = 0
  let saleCount = 0
  const categorySales = new Map<string, number>()
  const documentRows: DashboardData["documents"] = []
  for (const document of documents ?? []) {
    const items = document.inventory_document_items ?? []
    const quantity = items.reduce((sum, item) => sum + Number(item.quantity), 0)
    const amount = Number(document.total_amount)
    documentRows.push({ name: document.doc_type === "sale" ? "Продажа" : document.doc_type === "purchase" ? "Приход" : document.doc_type, quantity, amount, warehouse: document.warehouse?.name ?? "—" })
    if (document.doc_type !== "sale") continue
    revenue += amount
    saleCount += 1
    revenueTrend[new Date(document.created_at).getDate() - 1].revenue += amount
    for (const item of items) {
      cost += Number(item.quantity) * Number(item.inventory_products?.cost_price ?? 0)
      const category = item.inventory_products?.inventory_categories?.name ?? "Без категории"
      categorySales.set(category, (categorySales.get(category) ?? 0) + Number(item.quantity) * Number(item.price))
    }
  }

  const totalStock = new Map<string, number>()
  for (const balance of balances ?? []) totalStock.set(balance.product_id, (totalStock.get(balance.product_id) ?? 0) + Number(balance.quantity))
  let totalQuantity = 0
  let retailValue = 0
  let costValue = 0
  let lowStock = 0
  let outOfStock = 0
  let noCost = 0
  for (const product of products ?? []) {
    const quantity = totalStock.get(product.id) ?? 0
    totalQuantity += quantity
    retailValue += quantity * Number(product.retail_price)
    costValue += quantity * Number(product.cost_price)
    if (quantity <= 0) outOfStock += 1
    else if (quantity <= product.min_stock_level) lowStock += 1
    if (Number(product.cost_price) <= 0) noCost += 1
  }

  return {
    kpis: [
      { label: "Выручка", value: money(revenue), hint: "Сумма проведённых продаж за текущий месяц", icon: "wallet" },
      { label: "Себестоимость продаж", value: money(cost), hint: "Закупочная стоимость проданных товаров", icon: "shopping-bag" },
      { label: "Прибыль", value: money(revenue - cost), hint: "Выручка минус себестоимость", icon: "trending-up", highlight: true },
      { label: "Средний чек", value: money(saleCount ? revenue / saleCount : 0), hint: "Выручка, делённая на количество продаж", icon: "receipt" },
    ],
    revenueTrend,
    categories: Array.from(categorySales.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount], index) => ({ name, percent: revenue ? Math.round((amount / revenue) * 100) : 0, color: COLORS[index]! })),
    saleCount,
    documents: documentRows.slice(0, 8),
    stock: { warnings: [
      ...(lowStock ? [{ label: String(lowStock) + " товаров заканчивается", icon: "alert-triangle" as const }] : []),
      ...(outOfStock ? [{ label: String(outOfStock) + " товаров нет в наличии", icon: "package-x" as const }] : []),
      ...(noCost ? [{ label: String(noCost) + " товаров без цены закупки", icon: "circle-slash" as const }] : []),
    ], totalQuantity, retailValue, costValue },
  }
}
