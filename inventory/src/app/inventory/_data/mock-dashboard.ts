export interface KpiMock {
  label: string
  value: string
  hint: string
  highlight?: boolean
  icon: "wallet" | "shopping-bag" | "trending-up" | "receipt"
  delta?: { value: string; positive: boolean }
}

export const KPI_MOCK: KpiMock[] = [
  {
    label: "Выручка",
    value: "1 284 300 ₽",
    hint: "Сумма продаж за выбранный период без учёта возвратов",
    icon: "wallet",
    delta: { value: "16.4%", positive: true },
  },
  {
    label: "Себестоимость продаж",
    value: "742 150 ₽",
    hint: "Закупочная стоимость проданных товаров за период",
    icon: "shopping-bag",
    delta: { value: "8.1%", positive: true },
  },
  {
    label: "Прибыль",
    value: "542 150 ₽",
    hint: "Выручка минус себестоимость продаж за период",
    highlight: true,
    icon: "trending-up",
    delta: { value: "17.1%", positive: true },
  },
  {
    label: "Средний чек",
    value: "3 240 ₽",
    hint: "Выручка, делённая на количество продаж за период",
    icon: "receipt",
    delta: { value: "5.3%", positive: true },
  },
]

export interface RevenuePoint {
  day: number
  revenue: number
}

export const REVENUE_TREND_MOCK: RevenuePoint[] = [
  { day: 1, revenue: 32000 }, { day: 2, revenue: 28500 }, { day: 3, revenue: 41000 },
  { day: 4, revenue: 39500 }, { day: 5, revenue: 45200 }, { day: 6, revenue: 51000 },
  { day: 7, revenue: 48300 }, { day: 8, revenue: 36000 }, { day: 9, revenue: 33500 },
  { day: 10, revenue: 42800 }, { day: 11, revenue: 47100 }, { day: 12, revenue: 52400 },
  { day: 13, revenue: 58900 }, { day: 14, revenue: 55200 }, { day: 15, revenue: 40100 },
  { day: 16, revenue: 38700 }, { day: 17, revenue: 44300 }, { day: 18, revenue: 49800 },
  { day: 19, revenue: 53600 }, { day: 20, revenue: 61200 }, { day: 21, revenue: 57400 },
  { day: 22, revenue: 43900 }, { day: 23, revenue: 39200 }, { day: 24, revenue: 46500 },
  { day: 25, revenue: 50300 }, { day: 26, revenue: 54800 }, { day: 27, revenue: 62100 },
  { day: 28, revenue: 59500 }, { day: 29, revenue: 45700 }, { day: 30, revenue: 41800 },
]

export interface DocumentRow {
  name: string
  quantity: number
  amount: number
  warehouse: string
}

export const DOCUMENTS_MOCK: DocumentRow[] = [
  { name: "Продажа", quantity: 128, amount: 412500, warehouse: "Основной склад" },
  { name: "Закупка", quantity: 42, amount: 287300, warehouse: "Основной склад" },
  { name: "Возврат продажи", quantity: 6, amount: 18400, warehouse: "Основной склад" },
  { name: "Возврат закупки", quantity: 2, amount: 9100, warehouse: "Основной склад" },
  { name: "Корректировка", quantity: 3, amount: 4200, warehouse: "Основной склад" },
  { name: "Инвентаризация", quantity: 1, amount: 0, warehouse: "Основной склад" },
  { name: "Оприходование", quantity: 9, amount: 31200, warehouse: "Склад №2" },
  { name: "Списание", quantity: 4, amount: 7600, warehouse: "Склад №2" },
  { name: "Перемещение", quantity: 11, amount: 0, warehouse: "Склад №2" },
]

export interface CategorySalesSlice {
  name: string
  percent: number
  color: string
}

export const CATEGORY_SALES_MOCK: CategorySalesSlice[] = [
  { name: "Уход за лицом", percent: 45, color: "#7c5cfc" },
  { name: "Сыворотки", percent: 20, color: "#22c88f" },
  { name: "Очищение", percent: 15, color: "#f59e0b" },
  { name: "SPF защита", percent: 15, color: "#38bdf8" },
  { name: "Другое", percent: 5, color: "#f472b6" },
]

export interface StockWarning {
  label: string
  icon: "alert-triangle" | "package-x" | "circle-slash"
}

export const STOCK_ESTIMATE_MOCK = {
  warnings: [
    { label: "12 товаров заканчивается", icon: "alert-triangle" },
    { label: "8 товаров нет в наличии", icon: "package-x" },
    { label: "3 товара без цены закупки", icon: "circle-slash" },
  ] as StockWarning[],
  totalQuantity: 8420,
  retailValue: "3 918 400 ₽",
  costValue: "2 604 100 ₽",
}
